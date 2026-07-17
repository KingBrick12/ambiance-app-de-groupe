# Tâche 3 — Actions protégées et espace compte

## Évolution réalisée

La phase 1 comportait une API Express/Mongoose en JavaScript, des lectures publiques et deux écritures de collecte protégées par `x-api-key`. Le frontend était le gabarit React/Vite initial. La phase 2 ajoute des comptes sans remplacer le pipeline existant.

`User` stocke le nom affiché, le courriel normalisé, un hachage bcrypt, les favoris et les dates. L’inscription et la connexion émettent un JWT; `GET /api/auth/me` restaure l’identité. Le middleware JWT est indépendant de `apiKeyAuth`.

Le champ facultatif `Observation.author` préserve la lecture des documents historiques. `POST /observations` reste réservé aux appareils. `POST /api/observations` est réservé aux usagers et refuse tout `author` entrant avant d’utiliser l’identité du JWT.

Les routes `/api/account/contributions`, `/api/account/locations` et `/api/account/favorites` sont protégées. Les lieux valides sont dérivés des données de mesure et d’observation existantes. `$addToSet` prévient également les doublons au niveau MongoDB.

Le frontend utilise une couche `api.js`, un `AuthContext` et `localStorage` pour le JWT. Il restaure la session, la supprime sur un HTTP 401, protège les vues, et présente inscription, connexion, observation, identité, contributions, lieux et favoris. Les classifications restent produites uniquement par le backend.

## Compatibilité et limites

- Toutes les lectures et routes phase 1 sont conservées.
- Les observations sans auteur restent lisibles mais n’apparaissent dans aucun compte.
- Les bonus TypeScript et temps réel ne sont pas réalisés afin de privilégier la stabilité obligatoire.
- La liste des lieux exige qu’au moins une mesure ou observation existe déjà; aucune donnée factice n’est créée.
- La déconnexion invalide localement le JWT; une liste de révocation serveur n’est pas nécessaire pour des jetons courts.

## Vérification manuelle

1. Copier les deux `.env.example`, choisir un `JWT_SECRET`, démarrer MongoDB, puis les deux applications.
2. Créer un compte, se déconnecter et se reconnecter.
3. Vérifier qu’un visiteur voit l’accueil mais pas le formulaire ni le compte.
4. Avec des données phase 1 présentes, soumettre une observation et vérifier son apparition dans le compte.
5. Ajouter puis retirer un favori, et tester un jeton altéré dans l’en-tête Authorization.
6. Vérifier encore les routes GET phase 1 et le POST appareil avec `x-api-key`.
