# Infrastructure de collecte - IFT3225 Phase 1

API Express + MongoDB Atlas pour collecter des donnees d'ambiance au parc Lafontaine. Le pipeline accepte des mesures Phyphox de niveau sonore, des observations manuelles de terrain et des donnees seed de demonstration, puis expose des endpoints de consultation et d'agregation.

## Installation rapide

```bash
cd ambiance-api
npm install
copy .env.example .env
```

Remplir `MONGODB_URI` dans `.env`. Les autres valeurs par defaut ciblent le lieu et la zone utilises dans le projet:

```text
LOCATION=parc-lafontaine
ZONE=zone-banc-central
```

## MongoDB Atlas

Le serveur lit `MONGODB_URI` depuis `.env` et se connecte avec Mongoose. Les collections creees sont:

- `devices`: appareils et cles API.
- `measurements`: mesures Phyphox normalisees entre 0 et 1.
- `observations`: observations manuelles et metadonnees de session.

## Lancement

```bash
cd ambiance-api
npm start
```

L'API repond ensuite sur `http://localhost:3000`.

## Donnees de demonstration

```bash
cd ambiance-api
npm run seed
```

Ce script cree un appareil demo avec `SEED_API_KEY`, ajoute des mesures et ajoute des observations manuelles compatibles avec la fiche de collecte.

## Collecte Phyphox en direct

1. Ouvrir Phyphox sur le telephone.
2. Lancer une experience de niveau sonore.
3. Activer l'acces a distance.
4. Mettre l'URL Phyphox dans `PHYPHOX_URL`.
5. Verifier `PHYPHOX_VALUE_PATH=buffer.dB.buffer`.
6. Lancer:

```bash
npm run collect
```

Le bridge lit Phyphox, utilise la normalisation dB -> 0-1 existante, puis envoie les mesures a `POST /measurements` avec `x-api-key`.

## Import CSV Phyphox

Exporter depuis Phyphox un CSV contenant `Time (s)` et `Sound pressure level (dB)`, puis configurer:

```text
CSV_FILE=data/phyphox/amplitudes.csv
```

Lancer:

```bash
npm run import:csv
```

Le script affiche le nombre de lignes lues, de mesures envoyees et d'erreurs. Les exports tabules avec `Durée(s)` et `SPL(dB)` sont aussi acceptes.

## Fallback manuel

Pour saisir une session complete de collecte directement au terminal:

```bash
npm run manual
```

Le script demande les informations de session, puis les observations a 0, 5, 10, 15 et 20 minutes. Chaque observation est envoyee a `POST /observations` avec `x-api-key`.

## Import observations manuelles

Placer les fiches CSV dans:

```text
ambiance-api/data/manual/
```

Puis lancer:

```bash
npm run import:manual
```

Le script lit plusieurs sessions, mappe les colonnes de la fiche vers le modele `Observation`, envoie les observations vers l'API et affiche le total importe. Pour importer un fichier precis, definir `MANUAL_FILE=chemin/vers/fichier.csv`.

## Endpoints

| Methode | Endpoint | Auth | Role |
| --- | --- | --- | --- |
| GET | `/` | Non | Verification de l'API |
| POST | `/devices` | Non | Cree un appareil et retourne une cle API |
| GET | `/devices` | Non | Liste les appareils |
| POST | `/measurements` | Oui | Ajoute une mesure Phyphox |
| GET | `/measurements?location=&zone=&type=&from=&to=` | Non | Consulte les mesures |
| POST | `/observations` | Oui | Ajoute une observation manuelle |
| GET | `/observations?location=&zone=&vibe=&sessionNo=&from=&to=` | Non | Consulte les observations |
| GET | `/ambiance/:location/current?zone=` | Non | Ambiance courante sur 30 minutes |
| GET | `/ambiance/:location/history?last=3h&zone=` | Non | Historique par tranches de 5 minutes |
| GET | `/ambiance/:location/quiet-hours?zone=` | Non | Heures typiquement calmes |

Les routes d'ecriture utilisent:

```http
x-api-key: api_key_demo_lafontaine
```

`POST /devices` reste public en Phase 1, comme indique dans les consignes.

## Postman

Importer:

```text
postman/ambiance-api.collection.json
```

La collection contient:

- `GET /`
- `POST /devices`
- `GET /devices`
- `POST /measurements`
- `GET /measurements`
- `POST /observations`
- `GET /observations`
- `GET /ambiance/:location/current`
- `GET /ambiance/:location/history`
- `GET /ambiance/:location/quiet-hours`

## Structure

```text
ambiance-api/
  bridge/       bridge Phyphox temps reel
  data/         exemples CSV Phyphox et observations manuelles
  lib/          logique pure partagee
  middleware/   authentification x-api-key
  models/       schemas Mongoose
  routes/       routes Express
  scripts/      imports CSV et fallback manuel
  seed/         donnees de demonstration
  test/         tests sans dependance externe
postman/        collection Postman
```

## Verification

```bash
cd ambiance-api
npm run check
npm test
```

Ordre recommande pour une demonstration:

```bash
cd ambiance-api
npm install
copy .env.example .env
npm start
npm run seed
npm run import:csv
npm run import:manual
```

Pour la collecte terrain reelle, configurer `PHYPHOX_URL`, puis lancer `npm run collect`.
