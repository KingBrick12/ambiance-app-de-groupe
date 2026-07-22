# Ambiance Montréal — IFT3225, groupe 18

Application Express/MongoDB et React/Vite pour consulter l'ambiance de trois parcs, importer les collectes Phyphox et contribuer avec un compte utilisateur.

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
npm start

# terminal 2
cd frontend
npm run dev
```

Ouvrez `http://localhost:5173`; l'API répond sur `http://localhost:3000`.

## Soumettre une observation

1. Ouvrez **Contribuer et mon compte**.
2. Créez un compte ou connectez-vous.
3. Cliquez sur **Observer**, choisissez un lieu et remplissez les champs obligatoires.
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

## Principales routes

- `GET /locations` et `GET /locations/:slug`
- `GET /ambiance/:location/current`
- `GET /ambiance/:location/history?last=24h` ou `last=all`
- `GET /ambiance/:location/quiet-hours`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/observations`, `GET /api/observations/mine`
- routes protégées de l'espace personnel sous `/api/account`
