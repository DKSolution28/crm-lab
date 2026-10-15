# Rapport d'acceptation MVP

Date : 2026-10-15. Branche : `cursor/mvp-integration-2cf0`. Base des tests : `crm_mvp_finalize` sur `127.0.0.1`. `DATABASE_URL` pointait vers `crm_lab` pendant les suites, et la garde l'a ignoré.

Étiquette : **sessions signées en local**. Pas « prêt pour production ». Pas de fusion vers `main`.

## Matrice des parcours

| Parcours | Résultat | Preuve exécutée |
| --- | --- | --- |
| 1. Créer un compte, un contact, les associer, chercher, modifier, voir la relation des deux côtés | PASS | `e2e/contacts.spec.ts` (4 tests) dans la suite de 36 |
| 2. Créer un lead fictif, le qualifier, le convertir, refuser une seconde conversion | PASS | `e2e/lead-conversion.spec.ts` ; intégration 201 puis 409 |
| 3. Opportunité, montant, date de clôture, changement d'étape, pipeline et dashboard | PASS | `e2e/dashboard.spec.ts` et `e2e/opportunities.spec.ts` |
| 4. Tâche liée à un compte, assignation, statut, historique | PASS | `e2e/activities.spec.ts` |
| 5. Opération permise, refus sans session, refus d'un standard sur le compte d'un autre | PASS | `e2e/auth.spec.ts` : formulaire `/login`, `GET /api/accounts` anonyme 401, en-tête `x-crm-lab-user` 401, PATCH standard 403, PATCH propriétaire 200 |

## Commandes exécutées

| Commande | Résultat |
| --- | --- |
| `npm run test:unit` | 81 pass, 0 fail |
| `npm run test:integration` | 64 pass, 0 fail |
| `npm run test:e2e` | 36 pass, 0 fail, 35,0 s. `next build` puis `next start` sur le port 3100, `reuseExistingServer: false` |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 |

`crm_lab` après ces commandes : 12 comptes, `max(Account.updatedAt)` = `2026-10-14 12:49:22.245`, pas de table `Lead`. Aucune écriture Salesforce.

## Limites connues

- Constats MEDIUM encore ouverts : `GET` et `POST /api/notes`, `GET /api/dashboard`, `GET /api/accounts/lookup`, `GET /api/contacts/lookup`, `/search`, pas de contrôle d'origine sur les routes à cookie, `npm run db:seed` suit `DATABASE_URL`, PostgreSQL local en authentification trust. Le vérificateur indépendant les a revus et a quand même rendu PASS : ils ne réouvrent pas l'usurpation d'identité.
- Le cookie `Secure` n'est posé que si `CRM_LAB_COOKIE_SECURE=true`. Sur `http://127.0.0.1` il reste absent, sinon le navigateur le jette.
- Mots de passe de laboratoire, pas des secrets de production : `demoadm` / `demoadm-pass`, `demostd` / `demostd-pass`.
- `.github/workflows/mvp.yml` est dans le dépôt. GitHub ne l'a pas exécuté pendant la session de l'auteur. Le vérificateur indépendant a, lui, exécuté unit, intégration, e2e, lint, typecheck et build sur une base `crm_mvp_verify` et a rendu **PASS**.
- Leads, étapes d'opportunité et formulaires d'activité restent conçus là où Salesforce n'a pas été observé. Account Name sur un contact reste optionnel : Save n'a pas été observé.
- Chatter, Einstein, Flow Builder, reporting avancé, CPQ et la personnalisation Salesforce sont hors périmètre.

## Lancement local

```bash
cp .env.example .env
# Renseigner CRM_LAB_SESSION_SECRET (32 caractères au minimum)
npm run db:migrate
npm run db:seed
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Ouvrir <http://127.0.0.1:3000/login>. Les tests qui écrivent utilisent `TEST_DATABASE_URL` sur une base jetable, jamais `crm_lab`.
