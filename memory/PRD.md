# Online Career Manager — Migration base44 → PocketBase

## Problem statement
Projet de gestion de carrière (FIFA/FC): mercato, championnat, staff, communauté.
À l'origine bâti sur **base44**. L'utilisateur souhaite conserver le projet
tel quel mais remplacer la **connexion (auth + données) par PocketBase**.

## Architecture
- Frontend: React 18 + Vite (port 3000), ~100 fichiers d'app + shadcn/ui.
- Backend data: PocketBase 0.37.5 (port 8090) avec 30 collections provisionnées.
- Backend API helper: FastAPI (port 8001) qui proxifie `/api/pb/*` → `127.0.0.1:8090`
  pour rendre PocketBase joignable publiquement via l'ingress, et ajoute
  `Content-Type: application/json` sur POST/PATCH/PUT pour contourner Cloudflare WAF.
- MongoDB conservé pour endpoints FastAPI optionnels.

## Migration (done)
- Shim `src/api/base44Client.js` expose `base44.entities.*`, `base44.auth.*`,
  `base44.functions.invoke`, `base44.integrations.Core.*` mais pointe sur PocketBase.
- Ainsi les ~100 fichiers de l'app ne sont pas modifiés.
- Auth: connexion + inscription via collection `users` PocketBase.
- Script `scripts/setup_pocketbase.py` provisionne automatiquement les 29
  collections depuis les schémas `base44/entities/*.jsonc`.
- Supervisor config `supervisord_pocketbase.conf` ajoutée.
- Page de login maison à `/login`.

## What's been implemented (2026-05-03)
- ✅ Shim PocketBase
- ✅ Page Login/Register
- ✅ FastAPI reverse proxy `/api/pb/*`
- ✅ Supervisor pour PocketBase
- ✅ Script de provisioning automatique des collections
- ✅ Compte admin + user de test créés
- ✅ Flow de connexion fonctionnel end-to-end (verified)

## Not migrated (stubs)
- ⚠️ `base44.integrations.Core.InvokeLLM` → stub (à brancher vers OpenAI/Gemini)
- ⚠️ `base44.functions.invoke('playerNegotiation', ...)` etc. (19 fonctions) → stub
  (à réimplémenter en PocketBase hooks / Go / JS).
- ⚠️ L'app référence `base44.integrations.Core.UploadFile` — mappé vers
  `pb.collection('uploads').create(FormData)`, à créer cette collection si
  l'upload est utilisé.

## Next tasks
- Push sur https://github.com/fwdyjkhb78-hash/online-career-manager.git
  (nécessite PAT ou push local).
- Brancher un provider LLM pour remplacer `InvokeLLM`.
- Porter les 19 fonctions base44 en PocketBase hooks.
- Durcir les règles d'accès des collections PocketBase (actuellement permissives pour dev).
