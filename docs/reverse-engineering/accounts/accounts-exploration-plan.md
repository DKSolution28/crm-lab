# Plan d'exploration — module Accounts

Ne pas exécuter ce plan avant :

1. le serveur MCP REA visible dans une nouvelle run Cloud Agent ;
2. une session Salesforce authentifiée dans le profil CDP 9223.

Cette run s'est arrêtée sur `https://login.salesforce.com/`
(titre `Login | Salesforce`). Aucune org Developer n'est fournie dans
l'environnement. Aucune donnée Accounts n'a été observée.

## Session navigateur

| Rôle | Port | Profil | Usage |
| --- | --- | --- | --- |
| Laboratoire CRM Lab | `9222` | `/tmp/crm-lab-cdp` | Page de test, smoke REA |
| Salesforce autorisée | `9223` | `/tmp/crm-lab-salesforce-cdp` | Org Developer uniquement |

Démarrer la session Salesforce :

```bash
# URL d'org optionnelle, sinon le login public
SALESFORCE_LOGIN_URL='https://login.salesforce.com/' \
  bash scripts/start-salesforce-cdp-browser.sh
```

L'opérateur termine SSO / MFA / mot de passe via le bureau distant.
L'agent n'envoie aucun identifiant.

Origines attendues après connexion (à confirmer sur l'org réelle) :

- `https://login.salesforce.com`
- `https://<my-domain>.my.salesforce.com`
- éventuellement `https://<my-domain>.lightning.force.com`

Passer ces origines exactes à `allowed_origins` sur
`list_browser_targets` et `inspect_web_page`. Ne pas élargir le filtre
au-delà de l'org autorisée.

## Surfaces Accounts à relever

Ordre d'observation, une surface à la fois. Pour chaque surface :
lister la cible, inspecter passivement, noter les libellés, champs,
actions et états vides / erreur. Pas de reconstruction.

1. **Navigation**
   App Launcher, onglet Accounts, fil d'Ariane, menus objet.
2. **Liste**
   Vue liste par défaut, colonnes, tri, pagination, actions de ligne,
   actions de masse, état vide.
3. **Filtres**
   Recherche liste, filtres rapides, vues listes enregistrées,
   critères visibles, bouton « New » / « Nouveau ».
4. **Fiche**
   En-tête, highlights, onglets (Details, Related), champs standard
   visibles, listes associées, actions (Edit, Delete, Clone si présents).
5. **Formulaire création**
   Champs requis / optionnels, types (texte, liste, lookup, case à
   cocher), validation à l'enregistrement, messages d'erreur.
6. **Formulaire édition**
   Même inventaire, plus les champs en lecture seule et les
   dépendances (record type, picklists dépendantes).
7. **Interactions**
   Lookup Account, changement de vue, ouverture d'une related list,
   tentative d'enregistrement invalide, annulation.

## Méthode REA

Une fois le MCP connecté :

```text
list_browser_targets
  cdp_endpoint: http://127.0.0.1:9223
  allowed_origins: [origine exacte de l'org]

inspect_web_page
  target_id issu de la liste
  include_accessibility_text: true
  include_script_sources: false
```

Garder l'observation passive. Ne pas inventer de clics REA. Pour
naviguer, l'opérateur ou le bureau distant change la page, puis REA
réinspecte.

La CLI reste un repli :

```bash
npx rea-agents@6.4.0 list-browser-targets http://127.0.0.1:9223 \
  --allowed-origins 'https://<my-domain>.lightning.force.com'
```

## Livrables attendus après accès

Dans `docs/reverse-engineering/accounts/`, ajouter uniquement :

- inventaire des écrans et champs (libellés, pas les valeurs métier) ;
- résumés `inspect_web_page` sans cookies, SID, ni données de comptes ;
- captures d'états vides / formulaires vierges si elles ne montrent
  aucun enregistrement client.

Ne pas versionner une fiche Account réelle.

## Blocages à lever avant ce plan

- URL d'une Developer Org autorisée, communiquée hors dépôt.
- Authentification humaine (mot de passe, SSO, MFA).
- MCP REA enregistré pour une nouvelle run Cloud Agent.
