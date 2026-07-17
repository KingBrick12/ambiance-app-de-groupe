# Tâche 3.2 — Lier les observations aux usagers et gérer leurs lieux

## Portée

- Associer toute observation utilisateur à l’auteur authentifié, jamais à un auteur du corps.
- Garder les observations historiques sans auteur lisibles et le flux appareil séparé.
- Exposer les contributions paginées et les lieux distincts du compte courant.
- Consulter, ajouter et retirer des favoris, sans doublon et seulement pour un lieu existant.
- Ajouter validations, autorisations, erreurs descriptives et tests d’isolation entre comptes.

## Critères d’acceptation

- Chaque usager ne voit que ses contributions; les anciennes données restent publiques.
- Les favoris valides peuvent être ajoutés, consultés et retirés; doublons et lieux inconnus sont refusés.
- Toutes ces routes sont protégées et les tests réussissent.

Labels suggérés : `phase-2`, `tache-3`, `backend`, `authentification`, `tests`.
