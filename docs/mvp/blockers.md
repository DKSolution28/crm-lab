# Blocages

## Actifs

### B1 — Session Salesforce absente pour la passe Contacts

La spec `docs/reverse-engineering/contacts/` est intégrée depuis les preuves INT-5. `npm run rea:doctor` a échoué sur la VM de l'analyste (`healthy: false`). Aucune nouvelle capture n'a été faite. Les inconnues U1–U12 de `evidence-index.md` restent ouvertes. Pas d'écriture Salesforce.

Un agent cloud n'a pas le navigateur Salesforce du coordinateur. Il ne tente pas de MFA, de SSO, ni d'écriture. Les champs Contact au-delà d'INT-5, et la totalité de Leads, Opportunities (picklists d'étapes) et Activities (formulaires), restent INFERRED ou DESIGNED.

### B4 — Account Name sur New Contact

INT-5 marque Account Name `required: true`, avec un astérisque. Les textes plus anciens du dépôt et le module B disent que l'association est optionnelle. Save n'a pas été utilisé. Le contrat `docs/mvp/architecture.md` garde `accountId` nullable et n'impose pas de règle de sauvegarde. Le marqueur `required: true` d'INT-5 reste une inconnue de Save, pas une validation MVP.

### B3 — Pas de fusion vers `main`

La PR #2 reste un brouillon ouvert. Le coordinateur n'a pas l'autorisation de la fusionner.

## Levés

### B2 — Identité de démonstration

Levé le 2026-10-15. `getRequestUser` lit uniquement `crm-lab-session`. Sans cookie valide, la réponse est 401. Un utilisateur standard qui modifie le compte d'un autre reçoit 403. Le vérificateur indépendant a rendu PASS après exécution. Restent ouverts, en MEDIUM : notes, `GET /api/dashboard`, lookup, recherche, CSRF, seed et PostgreSQL local. Cela empêche l'étiquette « prêt pour production ».

## Hors périmètre, non bloquants

Chatter, Einstein, Flow Builder, reporting avancé, CPQ, marketplace, personnalisation Salesforce, import, actions de masse, édition en ligne, suppression de compte.
