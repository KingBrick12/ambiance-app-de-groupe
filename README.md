# Ambiance Montréal — IFT3225, groupe 18

Application Express/MongoDB et React/Vite pour consulter l'ambiance de trois parcs, importer les collectes Phyphox et contribuer avec un compte utilisateur.

## Fonctionnalités

- carte publique de trois parcs avec ambiance actuelle et fraîcheur des données;
- portraits par parc avec historique filtrable et créneaux calmes;
- comptes utilisateurs, contributions, lieux visités et favoris;
- ajout et retrait de favoris avec déduplication des anciens noms de lieux;
- formulaire d'observation limité aux trois parcs canoniques et aux dates présentes ou passées;
- mise à jour du portrait public et de la carte lorsqu'une nouvelle observation est plus récente;
- un seul header cohérent : **Se connecter** hors session, puis **Contribuer**, **Mon compte** et **Se déconnecter** en session.

Les lieux utilisent toujours les identifiants `parc-lafontaine`, `parc-jean-mance` et `parc-maisonneuve`. Les anciennes variantes sont normalisées automatiquement.

## Installation

Prérequis : Node.js récent et MongoDB local ou Atlas.

```powershell
cd ambiance-api
npm install
Copy-Item .env.example .env
cd ../frontend
npm install
Copy-Item .env.example .env
```

Backend : configurez `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `PORT` et `SEED_API_KEY`. Frontend : `VITE_API_URL=http://localhost:3000`. Les `.env` sont ignorés par Git.

## Import des collectes

Les fichiers sources sont dans `ambiance-api/data/collections/`. Le manifeste dans `ambiance-api/lib/collectionCsv.js` relie chaque fichier à un parc, une session, une zone et une date de départ. Les CSV virgule et tabulation sont acceptés, ainsi que les nombres décimaux avec point ou virgule. Les cellules vides sont signalées puis ignorées.

La collecte comprend exactement :
IFT3225-Infrastructure-de-collecte-groupe-18/ambiance-api
/data
- 6 sessions au Parc Lafontaine (3 de phase 1 et 3 de phase 2);
- 3 sessions au Parc Jean-Mance;
- 3 sessions au Parc Maisonneuve.

Pour importer ou réimporter :

```powershell
cd ambiance-api
npm run seed
```

Le seed est relançable : il met à jour les lieux, fusionne les anciennes variantes de noms, déduplique les favoris, puis réinsère les 12 sessions. Il génère aussi cinq mesures aléatoires âgées de moins de 30 minutes pour chacun des trois parcs afin d'alimenter l'ambiance actuelle. Les contributions des utilisateurs ne sont pas supprimées. Pour garder les CSV ailleurs, définissez `COLLECTION_CSV_DIR`.

Chaque mesure conserve une amplitude normalisée interne, un `sessionId`, un `sampleIndex`, une date et une clé d'import stable. Une observation récapitulative catégorielle (`calme`, `modérée`, `animée` ou `bruyante`) est créée par session; les décibels bruts ne sont pas présentés dans l'interface.

## Lancement

```powershell
# terminal 1
cd ambiance-api
npm run seed
npm start

# terminal 2
cd frontend
npm run dev
```

Ouvrez `http://localhost:5173`; l'API répond sur `http://localhost:3000`.

## Soumettre une observation

1. Cliquez sur **Se connecter** dans le header, puis créez un compte ou ouvrez une session.
2. Cliquez sur **Contribuer** dans ce même header.
3. Choisissez l'un des trois parcs; sa zone est remplie automatiquement.
4. Choisissez une date présente ou passée; le client et l'API refusent les dates futures.
5. Soumettez. Un message confirme la création et le formulaire est remis à zéro. Cette observation met immédiatement à jour l'ambiance publique si elle est la donnée la plus récente.
6. Ouvrez **Mon compte** pour retrouver la contribution.

Sur le portrait d'un parc, le filtre de période permet de consulter les dernières 24 heures, 7 jours, 30 jours ou toutes les données antérieures.

Les routes historiques `POST /measurements` et `POST /observations` utilisent `x-api-key`. La contribution citoyenne utilise `POST /api/observations` avec un jeton Bearer.

## Vérification

```powershell
cd ambiance-api
npm run check
npm test
npm run test:integration

cd ../frontend
npm run lint
npm run build
```

Le test d'intégration utilise la base configurée, crée puis supprime un compte et une observation temporaires. Il vérifie aussi les trois lieux, la répartition 6/3/3 et l'historique public.
Il vérifie également la normalisation des lieux, l'ajout et le retrait des favoris, le refus des dates futures et la mise à jour de l'ambiance publique par une observation récente.

## Principales routes

- `GET /locations` et `GET /locations/:slug`
- `GET /ambiance/:location/current`
- `GET /ambiance/:location/history?last=24h` ou `last=all`
- `GET /ambiance/:location/quiet-hours`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/observations`, `GET /api/observations/mine`
- `GET /api/account/contributions`, `GET /api/account/locations`
- `GET/POST/DELETE /api/account/favorites[/:location]`
- `GET /api/account/available-locations`

## Phase 3 : installation, cache et production

Prérequis : Node.js 20.19 ou plus récent, npm et MongoDB local ou Atlas. Exécutez `npm install` dans `ambiance-api`, puis dans `frontend`. Copiez chaque `.env.example` vers `.env` et remplacez les valeurs fictives. Les vrais `.env` restent ignorés par Git et doivent être transmis séparément pour la remise universitaire.

Le backend utilise `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `PORT`, `SEED_API_KEY` et, facultativement, `CACHE_DEBUG`. `FRONTEND_URL` accepte plusieurs origines séparées par une virgule. Le frontend utilise `VITE_API_URL`, par exemple `http://localhost:3000` en local.

Commandes de validation complètes :

```powershell
cd ambiance-api
npm ci
npm run check
npm test

cd ../frontend
npm ci
npm test
npm run lint
npm run build
```

La suite finale comprend 61 tests backend et 3 tests frontend. Le build frontend produit `frontend/dist`. Le backend n'a pas de compilation et démarre avec `npm start` sur le port fourni par `PORT`.

`npm run test:integration` vérifie les parcours contre la base configurée. Le poste qui l'exécute doit être autorisé dans la liste d'accès réseau MongoDB Atlas; cette commande échoue avant toute opération si son adresse IP n'est pas autorisée.

### Cache

Le frontend conserve les lectures publiques dans une `Map` JavaScript. La liste des lieux et l'ambiance actuelle restent fraîches 30 secondes; le détail, l'historique et les créneaux calmes restent frais 300 secondes. Toutes les entrées sont conservées au maximum 600 secondes et les appels simultanés identiques sont dédupliqués.

Le backend conserve les mêmes lectures publiques dans une `Map` du processus Node : TTL de 30 secondes pour `GET /locations` et l'ambiance actuelle, et de 300 secondes pour le détail, l'historique et les créneaux. `X-Cache: MISS` et `X-Cache: HIT` permettent de le vérifier. Une nouvelle mesure ou observation invalide la liste et toutes les entrées du lieu concerné sur les deux couches.

Les écritures, l'authentification, les données du compte et la liste des appareils ne sont jamais mises en cache et utilisent `Cache-Control: no-store`. Le cache public utilise `Cache-Control: no-cache` pour empêcher une copie HTTP intermédiaire durable.

### Déploiement Render

Le fichier `render.yaml` décrit un Web Service Node pour l'API et un Static Site Vite. Aucun déploiement n'a été exécuté depuis cet environnement et aucune URL n'est inventée.

- Backend : Root Directory `ambiance-api`, Build Command `npm ci --omit=dev`, Start Command `npm start`, Health Check Path `/health`; définir `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN=2h`, puis `FRONTEND_URL` avec l'URL HTTPS réelle du frontend.
- Frontend : Root Directory `frontend`, Build Command `npm ci && npm run build`, Publish Directory `dist`; définir `VITE_API_URL` avec l'URL HTTPS réelle du backend et ajouter la rewrite `/*` vers `/index.html`.
- Déployer d'abord le backend, reporter son URL dans `VITE_API_URL`, déployer le frontend, reporter ensuite son URL exacte dans `FRONTEND_URL`, puis redéployer l'API.
- Pour le tout premier déploiement, utiliser temporairement `FRONTEND_URL=http://localhost:5173` sur le backend; remplacer cette valeur dès que Render fournit l'URL frontend réelle.
- Vérifier `GET <BACKEND_RENDER_URL>/health`, les routes frontend en navigation directe, les appels API et l'absence d'erreur CORS.

```text
Frontend : <FRONTEND_RENDER_URL — à renseigner après déploiement>
Backend  : <BACKEND_RENDER_URL — à renseigner après déploiement>
```
