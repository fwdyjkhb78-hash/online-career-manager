# Online Career Manager

Application de gestion de carrière de club (FIFA/FC) avec mercato, championnat, staff et communauté — migrée de **base44** vers **PocketBase**.

## Stack

- **Frontend** : React 18 + Vite + TailwindCSS + shadcn/ui + TanStack Query + Framer Motion
- **Backend principal** : [PocketBase](https://pocketbase.io/) (auth, collections, fichiers, temps-réel)
- **Backend FastAPI** : conservé pour des routes utilitaires Mongo (optionnel)

## Migration base44 → PocketBase

Le fichier `src/api/base44Client.js` est un **shim de compatibilité** qui expose exactement la
même API que l'ancien SDK base44 (`base44.entities.X.list/filter/create/update/delete`,
`base44.auth.me/login/logout/updateMe`, etc.) mais pointe vers **PocketBase** en dessous.

Avantages :
- Les ~100 fichiers qui importaient `{ base44 }` n'ont PAS eu besoin d'être modifiés.
- Les noms d'entités en CamelCase (`Player`, `Club`) sont automatiquement mappés en
  collections snake_case (`player`, `club`) côté PocketBase.
- Les champs `created_date` / `updated_date` sont alias sur les `created` / `updated` natifs de PocketBase.

### Ce qui est natif PocketBase
| Base44 | PocketBase |
| --- | --- |
| `base44.entities.X.*` | `pb.collection('x').*` |
| `base44.auth.login / me / logout / updateMe` | `pb.collection('users').auth*` |
| `base44.integrations.Core.UploadFile` | `pb.collection('uploads').create(FormData)` |

### À brancher manuellement
- `base44.integrations.Core.InvokeLLM` → brancher vers OpenAI/Gemini (stub par défaut).
- `base44.functions.invoke('name', payload)` → pointer vers des hooks PocketBase exposés
  sur `/api/pb-fn/<name>` (stub par défaut).

## Configuration

Créer `frontend/.env` :
```
REACT_APP_BACKEND_URL=<url-publique-app>
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

## Lancer en local

```bash
# PocketBase
./pocketbase serve

# Frontend
cd frontend
yarn install
yarn start   # http://localhost:3000
```

## Collections PocketBase à créer

À créer une fois dans l'admin PocketBase (collection `users` existe par défaut). Pour chaque
entité listée dans `base44/entities/*.jsonc` créer une collection homonyme en snake_case
(ex: `player`, `club`, `match`, `notification`, ...) avec les champs correspondants.

Le fichier `base44/entities/User.jsonc` contient les champs custom à ajouter à la collection
`users` : `role`, `club_id`, `club_name`, `has_selected_club`, `last_seen`, `pseudo`,
`full_name`, etc.

## Scripts

- `yarn start` — dev server Vite (port 3000)
- `yarn build` — build production
- `yarn preview` — preview build
- `yarn lint` — ESLint
