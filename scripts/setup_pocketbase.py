#!/usr/bin/env python3
"""
Provisioning script: creates all PocketBase collections from the base44
`entities/*.jsonc` schemas, plus adds the custom fields to the built-in
`users` collection.

Usage:
    python3 scripts/setup_pocketbase.py

Requires env:
    PB_URL           (default http://127.0.0.1:8090)
    PB_ADMIN_EMAIL   (default admin@ocm.local)
    PB_ADMIN_PASS    (default Admin12345!)
"""
import json
import os
import re
import sys
from pathlib import Path

import httpx

PB_URL = os.environ.get("PB_URL", "http://127.0.0.1:8090")
PB_ADMIN_EMAIL = os.environ.get("PB_ADMIN_EMAIL", "admin@ocm.local")
PB_ADMIN_PASS = os.environ.get("PB_ADMIN_PASS", "Admin12345!")

ENTITIES_DIR = Path(__file__).resolve().parent.parent / "frontend" / "base44" / "entities"


def snake(name: str) -> str:
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name)
    s = re.sub(r"([A-Z])([A-Z][a-z])", r"\1_\2", s)
    return s.lower()


def load_jsonc(path: Path) -> dict:
    raw = path.read_text()
    # strip // comments but NOT URLs (http:// etc.) — only when `//` is preceded
    # by start-of-line or whitespace.
    raw = re.sub(r"(^|\s)//[^\n]*", r"\1", raw, flags=re.MULTILINE)
    # strip /* ... */ block comments too
    raw = re.sub(r"/\*.*?\*/", "", raw, flags=re.DOTALL)
    return json.loads(raw, strict=False)


def to_pb_field(name: str, schema: dict) -> dict:
    t = schema.get("type", "string")
    base = {"name": name, "required": False}
    if t == "string":
        if schema.get("enum"):
            return {**base, "type": "select", "maxSelect": 1, "values": schema["enum"]}
        return {**base, "type": "text"}
    if t == "number":
        return {**base, "type": "number"}
    if t == "boolean":
        return {**base, "type": "bool"}
    if t == "array":
        return {**base, "type": "json", "maxSize": 2_000_000}
    if t == "object":
        return {**base, "type": "json", "maxSize": 2_000_000}
    return {**base, "type": "text"}


def build_schema(props: dict) -> list:
    fields = []
    # System fields id/created/updated/collectionId/collectionName are automatic.
    # Add user-friendly aliases created_date / updated_date the app relies on.
    for fname, fschema in props.items():
        fields.append(to_pb_field(fname, fschema))
    # legacy-compatible date fields used by base44 queries (autodate = auto-filled)
    fields.append({"name": "created_date", "type": "autodate", "onCreate": True, "onUpdate": False})
    fields.append({"name": "updated_date", "type": "autodate", "onCreate": True, "onUpdate": True})
    return fields


def admin_login(client: httpx.Client) -> str:
    r = client.post(
        "/api/collections/_superusers/auth-with-password",
        json={"identity": PB_ADMIN_EMAIL, "password": PB_ADMIN_PASS},
    )
    if r.status_code != 200:
        raise RuntimeError(f"Superuser login failed: {r.status_code} {r.text}")
    return r.json()["token"]


def list_collections(client: httpx.Client) -> dict:
    r = client.get("/api/collections?perPage=500")
    r.raise_for_status()
    items = r.json().get("items", [])
    return {c["name"]: c for c in items}


def create_collection(client: httpx.Client, name: str, schema_fields: list, is_auth=False):
    body = {
        "name": name,
        "type": "auth" if is_auth else "base",
        "fields": schema_fields,
        # Permissive rules for dev; tighten in production.
        "listRule": "",
        "viewRule": "",
        "createRule": "",
        "updateRule": "",
        "deleteRule": "",
    }
    r = client.post("/api/collections", json=body)
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Create {name} failed: {r.status_code} {r.text}")
    print(f"  ✓ created {name}")
    return r.json()


def update_collection_fields(client: httpx.Client, coll: dict, fields: list):
    existing = {f["name"]: f for f in coll.get("fields", [])}
    # keep system fields, merge in our fields
    merged = list(coll["fields"])
    added = 0
    for f in fields:
        if f["name"] in existing:
            continue
        merged.append(f)
        added += 1
    if added == 0:
        print(f"  • {coll['name']}: no new fields")
        return
    body = {"fields": merged}
    r = client.patch(f"/api/collections/{coll['id']}", json=body)
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Patch {coll['name']} failed: {r.status_code} {r.text}")
    print(f"  ✓ {coll['name']}: {added} fields added")


def main():
    if not ENTITIES_DIR.exists():
        print(f"Entities directory not found: {ENTITIES_DIR}", file=sys.stderr)
        sys.exit(1)

    with httpx.Client(base_url=PB_URL, timeout=30.0) as client:
        token = admin_login(client)
        client.headers["Authorization"] = token

        existing = list_collections(client)
        print(f"Connected. {len(existing)} existing collections.")

        # --- users collection: add base44 custom fields ---
        user_schema = load_jsonc(ENTITIES_DIR / "User.jsonc")
        user_fields = build_schema(user_schema.get("properties", {}))
        # Add full_name since app uses it
        if not any(f["name"] == "full_name" for f in user_fields):
            user_fields.append({"name": "full_name", "type": "text", "required": False})
        if not any(f["name"] == "ea_pseudo" for f in user_fields):
            user_fields.append({"name": "ea_pseudo", "type": "text", "required": False})
        if not any(f["name"] == "site_pseudo" for f in user_fields):
            user_fields.append({"name": "site_pseudo", "type": "text", "required": False})
        if not any(f["name"] == "intro_submitted" for f in user_fields):
            user_fields.append({"name": "intro_submitted", "type": "bool", "required": False})
        if "users" in existing:
            update_collection_fields(client, existing["users"], user_fields)
            # Also relax rules for dev
            r = client.patch(
                f"/api/collections/{existing['users']['id']}",
                json={
                    "listRule": "",
                    "viewRule": "",
                    "createRule": "",
                    "updateRule": "id = @request.auth.id",
                    "deleteRule": "id = @request.auth.id",
                },
            )

        # --- other entities: create collections ---
        for jsonc in sorted(ENTITIES_DIR.glob("*.jsonc")):
            entity_name = jsonc.stem
            if entity_name == "User":
                continue
            coll_name = snake(entity_name)
            schema = load_jsonc(jsonc)
            fields = build_schema(schema.get("properties", {}))

            if coll_name in existing:
                print(f"  • {coll_name} already exists → merging fields")
                update_collection_fields(client, existing[coll_name], fields)
            else:
                create_collection(client, coll_name, fields, is_auth=False)

        print("\n✅ PocketBase provisioning complete.")


if __name__ == "__main__":
    main()
