# Ambiance Montréal — IFT3225, groupe 18

Le projet fait évoluer l’infrastructure de collecte de la phase 1 vers une application de consommation et de contribution. Les mesures Phyphox, imports CSV, observations terrain, lectures publiques et clés API appareils sont conservés. La phase 2 ajoute des comptes, des observations citoyennes protégées et un espace personnel.

## Architecture

- `ambiance-api/` : Express, Mongoose/MongoDB, JWT et bcrypt (JavaScript).
- `frontend/` : React 19 et Vite (JavaScript), couche API et contexte de session centralisés.
- `postman/` : collection phase 1.
- `docs/` : tickets préparés et rapport d’implémentation.

## Installation et configuration

Prérequis : Node.js récent et MongoDB local ou Atlas.

```powershell
cd ambiance-api
npm install
Copy-Item .env.example .env
cd ../frontend
npm install
Copy-Item .env.example .env
```

Backend : `MONGODB_URI`, `JWT_SECRET` (long et aléatoire en production), `JWT_EXPIRES_IN`, `FRONTEND_URL`, `PORT`. Frontend : `VITE_API_URL`. Ne jamais commiter les fichiers `.env`.

```powershell
# terminal 1
cd ambiance-api
npm start

# terminal 2
cd frontend
npm run dev
```

## Endpoints

Les `GET /measurements`, `GET /observations` et routes `GET /ambiance/...` restent publics. `POST /measurements` et `POST /observations` restent les flux appareil avec `x-api-key`.

| Méthode | Route | Accès |
| --- | --- | --- |
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Bearer JWT |
| POST | `/api/observations` | Bearer JWT |
| GET | `/api/account/contributions` | Bearer JWT |
| GET | `/api/account/locations` | Bearer JWT |
| GET/POST/DELETE | `/api/account/favorites[/:location]` | Bearer JWT |
| GET | `/api/account/available-locations` | Bearer JWT |

Après inscription ou connexion, envoyer `Authorization: Bearer <token>`. L’auteur d’une observation est toujours tiré de ce jeton. L’interface permet la déconnexion, restaure une session valide et nettoie une session expirée.

## Données et collecte phase 1

Les commandes restent disponibles : `npm run seed`, `npm run collect`, `npm run import:csv`, `npm run manual` et `npm run import:manual`. Les observations historiques sans auteur restent publiques et compatibles. Voir [le rapport de tâche 3](docs/tache-3-implementation.md) pour les décisions et limites.

## Vérification et build

```powershell
cd ambiance-api
npm run check
npm test
cd ../frontend
npm run lint
npm run build
```

Le backend demeure en JavaScript et le temps réel n’a pas été ajouté : les deux bonus ont été écartés pour ne pas fragiliser les exigences obligatoires.
