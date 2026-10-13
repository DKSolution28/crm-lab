# Session navigateur dédiée Salesforce — préparation (Phase 2)

## Principe

Une session **séparée de la cible lab** (`http://127.0.0.1:3000/`) pour éviter
tout mélange de preuves entre l'application locale et l'org Salesforce.
Isolation par **profil CDP distinct** sur le même Chromium headless `:9222`.

## Emplacement réservé

- Profil lab (existant) : `/tmp/crm-lab-cdp` — cibles de test et preuves locales.
- Profil Salesforce (à créer au moment de l'authentification) : `/tmp/crm-lab-cdp-salesforce`.
- Les deux profils partagent le même endpoint CDP `http://127.0.0.1:9222` ;
  `rea list-browser-targets` distingue les cibles par `url`/`origin`,
  et `--allowed-origins` restreint chaque observation à l'origine Salesforce.

## Procédure (à exécuter une fois l'org fournie)

1. L'humain fournit l'URL d'org (jamais versionnée ; secret Cursor si besoin).
2. Créer la cible Salesforce sans toucher au profil lab :
   `curl -X PUT "http://127.0.0.1:9222/json/new?<URL_ORG>"`.
3. **L'humain effectue la connexion interactive** (SSO/MFA) dans cette cible.
   L'agent ne saisit ni mot de passe, ni code MFA, ni cookie.
4. Vérifier côté agent, en lecture seule :
   `rea list-browser-targets http://127.0.0.1:9222 --allowed-origins <origine-org>`
   puis `rea inspect-web-page` sur la cible authentifiée.
5. Si le SSO exige un navigateur non-headless ou un device flow,
   noter l'écart ici et basculer sur la méthode imposée par l'IdP.

## Interventions SSO/MFA attendues (côté humain)

- Choisir le mode d'org : production (`login.salesforce.com`) vs sandbox (`test.salesforce.com`) —
  connectivité HTTP 200 vérifiée pour les deux le 2026-10-13.
- Réaliser le login + MFA dans l'onglet dédié ; confirmer à l'agent que la page
  d'accueil Lightning est affichée (pas de capture de session dans git).
- En cas d'expiration de session pendant l'exploration, re-authentification manuelle ;
  l'agent signale `target` inaccessible au lieu de retenter avec des secrets.

## Garde-fous

- Aucun identifiant, jeton, cookie ou URL d'org dans le dépôt.
- `--allowed-origins` systématique pour ne pas observer d'autres cibles.
- Pas de `capture-browser-scenario` avec identifiants pré-remplis.
