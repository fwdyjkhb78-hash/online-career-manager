/**
 * Legacy compatibility: base44 exposed app params (appId, token, etc.) via
 * URL/localStorage. With PocketBase we don't need any of that. We keep the
 * same export shape so existing imports keep working.
 */
export const appParams = {
  appId: null,
  token: null,
  fromUrl: typeof window !== 'undefined' ? window.location.href : '',
  functionsVersion: null,
  appBaseUrl: typeof window !== 'undefined' ? window.location.origin : '',
};
