# Tâche 3.3 — Construire l’interface authentifiée et l’espace compte

## Portée

- Ajouter inscription, connexion, déconnexion et restauration centrale de session.
- Centraliser l’API, le JWT et le traitement d’une session invalide.
- Protéger le formulaire d’observation et afficher clairement l’état connecté.
- Présenter profil, contributions, lieux visités et favoris avec mise à jour réactive.
- Gérer chargement, erreur, succès et absence de données sans casser les vues publiques.
- Vérifier lint et build de production.

## Critères d’acceptation

- Le visiteur conserve les vues publiques mais ne peut pas soumettre ni ouvrir le compte.
- L’usager connecté peut contribuer, consulter son profil et gérer ses favoris.
- Une session invalide déclenche une déconnexion propre; l’interface compile sans erreur.

Labels suggérés : `phase-2`, `tache-3`, `frontend`, `authentification`, `tests`.
