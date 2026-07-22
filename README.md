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
