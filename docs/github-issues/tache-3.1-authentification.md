# Tâche 3.1 — Ajouter les comptes utilisateurs et l’authentification

## Portée

- Créer le modèle utilisateur (nom, courriel normalisé unique, mot de passe haché, favoris, dates).
- Ajouter inscription, connexion, profil courant et déconnexion côté client.
- Créer et valider un JWT expirant et protéger les routes utilisateur par middleware.
- Valider les entrées, uniformiser les erreurs et ne jamais exposer le mot de passe.
- Maintenir les routes publiques et distinguer JWT utilisateur et clé API appareil.
- Couvrir les cas valides, doublons, identifiants invalides et jetons absents/invalides/expirés.

## Critères d’acceptation

- Un compte peut être créé et une session ouverte avec des identifiants valides.
- Le mot de passe n’est ni stocké ni renvoyé en clair.
- Les jetons invalides ou expirés et les visiteurs sont refusés sur les routes protégées.
- Les lectures publiques de phase 1 restent accessibles et les tests réussissent.

Labels suggérés : `phase-2`, `tache-3`, `backend`, `authentification`, `tests`.
