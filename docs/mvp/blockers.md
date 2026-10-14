# Blocages

## Actifs

### B1 — Session Salesforce absente pour la passe Contacts

La spec `docs/reverse-engineering/contacts/` est intégrée depuis les preuves INT-5. `npm run rea:doctor` a échoué sur la VM de l'analyste (`healthy: false`). Aucune nouvelle capture n'a été faite. Les inconnues U1–U12 de `evidence-index.md` restent ouvertes. Pas d'écriture Salesforce.

Un agent cloud n'a pas le navigateur Salesforce du coordinateur. Il ne tente pas de MFA, de SSO, ni d'écriture. Les champs Contact au-delà d'INT-5, et la totalité de Leads, Opportunities (picklists d'étapes) et Activities (formulaires), restent INFERRED ou DESIGNED.

### B4 — Account Name sur New Contact

INT-5 marque Account Name `required: true`, avec un astérisque. Les textes plus anciens du dépôt et le module B disent que l'association est optionnelle. Save n'a pas été utilisé. Décision de travail, déjà écrite dans les exigences : `accountId` reste nullable, le lookup est affiché, aucune règle de sauvegarde n'est imposée tant qu'une observation de Save ne tranche pas. L'architecte doit reprendre cette décision dans le contrat.

### B2 — Identité de démonstration

Cookie et en-tête libres. L'audit `docs/mvp/security-identity.md` confirme le défaut HIGH et le plan de migration. Tant que les tests 401/403 du plan ne sont pas écrits et verts, le MVP reste une démonstration locale. Pas de contournement.

### B3 — Pas de fusion vers `main`

La PR #2 reste un brouillon ouvert. Le coordinateur n'a pas l'autorisation de la fusionner.

## Levés

Aucun dans ce cycle.

## Hors périmètre, non bloquants

Chatter, Einstein, Flow Builder, reporting avancé, CPQ, marketplace, personnalisation Salesforce, import, actions de masse, édition en ligne, suppression de compte.
