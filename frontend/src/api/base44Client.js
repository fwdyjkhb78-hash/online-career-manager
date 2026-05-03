/**
 * Compatibility shim: exposes the same surface as the base44 SDK
 * (`base44.entities.<Entity>.list/filter/get/create/update/delete`,
 * `base44.auth.*`, `base44.functions.invoke`, `base44.integrations.Core.*`,
 * `base44.users.*`, `base44.appLogs.*`) but backed by PocketBase.
 *
 * Entity names (e.g. `Player`, `Club`) map to PocketBase collections using
 * a snake_case convention (`player`, `club`). Field names stay as the
 * original application already uses them.
 *
 * This keeps ~100 files unchanged while swapping the backend.
 */
import PocketBase from 'pocketbase';

const PB_URL =
  import.meta.env.VITE_POCKETBASE_URL ||
  (typeof window !== 'undefined' ? `${window.location.origin}` : 'http://127.0.0.1:8090');

export const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

// --- Name mapping: "CamelCase" Entity -> "snake_case" PocketBase collection ---
const toSnake = (name) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

// --- Filter object -> PocketBase filter string ---
const buildFilter = (filterObj = {}) => {
  const parts = [];
  for (const [key, value] of Object.entries(filterObj)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      const or = value
        .map((v, i) => {
          const ph = `val_${key}_${i}`;
          return `${key} = {:${ph}}`;
        })
        .join(' || ');
      if (or) parts.push(`(${or})`);
    } else {
      parts.push(`${key} = {:val_${key}}`);
    }
  }
  return parts.join(' && ');
};

const buildFilterParams = (filterObj = {}) => {
  const params = {};
  for (const [key, value] of Object.entries(filterObj)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((v, i) => (params[`val_${key}_${i}`] = v));
    } else {
      params[`val_${key}`] = value;
    }
  }
  return params;
};

// --- Sort normalization: "-created_date" or "field" ---
const normalizeSort = (sort) => {
  if (!sort) return '-created';
  if (typeof sort !== 'string') return '-created';
  // PocketBase uses its own built-in fields `created`, `updated`.
  // Older base44 code uses `created_date`, `updated_date`. Keep user value,
  // they should exist as real fields in collections.
  return sort;
};

// --- Normalize a PocketBase record to look like a base44 record ---
const normalizeRecord = (rec) => {
  if (!rec) return rec;
  return {
    ...rec,
    // Provide legacy aliases used throughout the app
    created_date: rec.created_date || rec.created,
    updated_date: rec.updated_date || rec.updated,
  };
};

// --- Build an entity proxy for a given collection ---
const makeEntity = (entityName) => {
  const coll = toSnake(entityName);
  const collection = () => pb.collection(coll);

  const safeGetFullList = async ({ sort, filter, filterParams } = {}) => {
    try {
      const records = await collection().getFullList({
        sort: normalizeSort(sort),
        filter,
        ...(filterParams ? { filterParams } : {}),
      });
      return records.map(normalizeRecord);
    } catch (e) {
      if (e?.status === 404) return [];
      throw e;
    }
  };

  return {
    /**
     * list(sort?, limit?, skip?)
     */
    async list(sort, limit, skip) {
      try {
        if (!limit && !skip) {
          return await safeGetFullList({ sort });
        }
        const page = Math.floor((skip || 0) / (limit || 50)) + 1;
        const res = await collection().getList(page, limit || 50, {
          sort: normalizeSort(sort),
        });
        return res.items.map(normalizeRecord);
      } catch (e) {
        if (e?.status === 404) return [];
        throw e;
      }
    },

    /**
     * filter(filterObj, sort?, limit?, skip?)
     */
    async filter(filterObj, sort, limit, skip) {
      const filter = buildFilter(filterObj);
      const filterParams = buildFilterParams(filterObj);
      try {
        if (!limit && !skip) {
          return await safeGetFullList({ sort, filter, filterParams });
        }
        const page = Math.floor((skip || 0) / (limit || 50)) + 1;
        const res = await collection().getList(page, limit || 50, {
          sort: normalizeSort(sort),
          filter,
          filterParams,
        });
        return res.items.map(normalizeRecord);
      } catch (e) {
        if (e?.status === 404) return [];
        throw e;
      }
    },

    async get(id) {
      const rec = await collection().getOne(id);
      return normalizeRecord(rec);
    },

    async findOne(filterObj) {
      const filter = buildFilter(filterObj);
      const filterParams = buildFilterParams(filterObj);
      try {
        const rec = await collection().getFirstListItem(filter, { filterParams });
        return normalizeRecord(rec);
      } catch (e) {
        if (e?.status === 404) return null;
        throw e;
      }
    },

    async create(data) {
      const payload = { ...data };
      // PocketBase requires FormData for file uploads; only plain JSON here.
      const rec = await collection().create(payload);
      return normalizeRecord(rec);
    },

    async update(id, data) {
      const rec = await collection().update(id, data);
      return normalizeRecord(rec);
    },

    async delete(id) {
      await collection().delete(id);
      return { success: true };
    },

    async bulkCreate(items = []) {
      const out = [];
      for (const item of items) {
        out.push(normalizeRecord(await collection().create(item)));
      }
      return out;
    },

    // Advanced pass-through for power users
    raw: collection,
  };
};

// --- Handler-on-demand proxy: any entity becomes available automatically ---
const entities = new Proxy(
  {},
  {
    get(target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (!target[prop]) target[prop] = makeEntity(prop);
      return target[prop];
    },
  }
);

// --- Auth wrapper ---
const auth = {
  async me() {
    if (!pb.authStore.isValid) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    try {
      const user = await pb.collection('users').authRefresh();
      return normalizeRecord(user.record);
    } catch (e) {
      pb.authStore.clear();
      throw e;
    }
  },

  async isAuthenticated() {
    if (!pb.authStore.isValid) return false;
    try {
      await pb.collection('users').authRefresh();
      return true;
    } catch {
      pb.authStore.clear();
      return false;
    }
  },

  async login({ email, password }) {
    const res = await pb
      .collection('users')
      .authWithPassword(email, password);
    return normalizeRecord(res.record);
  },

  async register({ email, password, passwordConfirm, ...rest }) {
    const rec = await pb.collection('users').create({
      email,
      password,
      passwordConfirm: passwordConfirm || password,
      ...rest,
    });
    await pb.collection('users').authWithPassword(email, password);
    return normalizeRecord(rec);
  },

  async updateMe(data) {
    const current = pb.authStore.model;
    if (!current?.id) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    const rec = await pb.collection('users').update(current.id, data);
    return normalizeRecord(rec);
  },

  logout() {
    pb.authStore.clear();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  },

  redirectToLogin() {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
};

// --- Integrations stubs (base44 LLM / file upload) ---
const integrations = {
  Core: {
    async InvokeLLM() {
      console.warn(
        '[base44→PocketBase shim] InvokeLLM called but no LLM is configured. Connect an LLM provider in PocketBase hooks or a backend endpoint.'
      );
      return { response: '', data: null };
    },
    async UploadFile({ file, collection: coll = 'uploads', field = 'file' } = {}) {
      if (!file) return { file_url: '' };
      try {
        const fd = new FormData();
        fd.append(field, file);
        const rec = await pb.collection(coll).create(fd);
        const url = pb.files.getUrl(rec, rec[field]);
        return { file_url: url, record: rec };
      } catch (e) {
        console.error('[base44→PocketBase shim] UploadFile failed:', e);
        return { file_url: '' };
      }
    },
  },
};

// --- Functions passthrough: call PocketBase custom routes at /api/pb-fn/<name> ---
const functions = {
  async invoke(name, payload = {}) {
    try {
      const res = await pb.send(`/api/pb-fn/${name}`, {
        method: 'POST',
        body: payload,
      });
      return { data: res };
    } catch (e) {
      console.warn(
        `[base44→PocketBase shim] function "${name}" not wired. Add a PocketBase hook or return a mock.`
      );
      return { data: null, error: e };
    }
  },
};

// --- Users helpers ---
const users = {
  async inviteUser({ email }) {
    try {
      await pb.collection('users').requestPasswordReset(email);
      return { success: true };
    } catch (e) {
      return { success: false, error: e };
    }
  },
};

// --- App logs (telemetry) - no-op by default ---
const appLogs = {
  logUserInApp() {
    /* no-op */
  },
};

export const base44 = {
  entities,
  auth,
  integrations,
  functions,
  users,
  appLogs,
};

export default base44;
