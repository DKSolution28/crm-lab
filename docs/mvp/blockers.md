# Blocages

## Actifs

### B1 — Session Salesforce invisible pour un agent cloud

La reconnaissance Accounts du dépôt a été faite sur une org trial, avec 0 Account et 0 Contact, sans écriture. Les preuves utiles aux Contacts sont INT-5 dans `docs/reverse-engineering/accounts/` (formulaire New Contact, lookup Account Name, Last Name requis, All Contacts « 0 items »).

Un agent cloud n'a pas le navigateur Salesforce de la machine du coordinateur. Il ne doit pas tenter de MFA, de SSO, ni d'écriture. Il documente l'absence de session et s'appuie sur les preuves du dépôt. Une exploration lecture seule supplémentaire n'est autorisée que dans un environnement où la session existe déjà, et uniquement sans Save, Delete, Submit, Merge, Change Owner ou équivalent.

Impact : les champs Contact au-delà d'INT-5, et la totalité de Leads, Opportunities (picklists d'étapes) et Activities (formulaires), restent INFERRED ou DESIGNED.

### B2 — Identité de démonstration

Cookie et en-tête libres. Tant que ce mécanisme reste le seul, le MVP est une démonstration locale. La correction est MVP-G-AUTH, après le rapport `docs/mvp/security-identity.md`. Pas de contournement.

### B3 — Pas de fusion vers `main`

La PR #2 reste un brouillon ouvert. Le coordinateur n'a pas l'autorisation de la fusionner.

## Levés

Aucun dans ce cycle.

## Hors périmètre, non bloquants

Chatter, Einstein, Flow Builder, reporting avancé, CPQ, marketplace, personnalisation Salesforce, import, actions de masse, édition en ligne, suppression de compte.
