# Session navigateur distincte pour la Salesforce Developer Org

## Principe

Deux navigateurs Chromium coexistent sur la VM de l'agent cloud, chacun avec son propre profil et son propre port DevTools. REA n'observe que des endpoints CDP loopback littéraux : le choix du port suffit à isoler ce que l'agent voit.

| Session | Script | Port CDP | Profil | Mode | Usage |
| --- | --- | --- | --- | --- | --- |
| Lab local | `scripts/start-cdp-browser.sh` | `9222` | `/tmp/crm-lab-cdp` | headless | Tests de l'outillage sur `http://127.0.0.1:3000`. |
| Salesforce | `scripts/start-salesforce-browser.sh` | `9223` | `/tmp/crm-lab-salesforce` (mode 700) | fenêtre visible sur `DISPLAY=:1` | Developer Org autorisée uniquement. |

La session Salesforce est **visible** (non headless) pour qu'une personne puisse terminer la connexion, y compris SSO et MFA, en prenant le contrôle du bureau distant de l'agent (fonction « Remote desktop control » de Cursor Cloud Agents). Le script ne lit ni ne stocke aucun identifiant ; il ouvre seulement la page de connexion publique.

```bash
bash scripts/start-salesforce-browser.sh
# variables optionnelles : SF_CDP_PORT, SF_CDP_PROFILE, SF_LOGIN_URL (ex. https://test.salesforce.com/ ou le My Domain de l'org), SF_HEADLESS=1
```

Vérification REA côté agent (page de connexion, avant authentification) :

```bash
npx rea-agents@6.4.0 list-browser-targets http://127.0.0.1:9223
```

Preuve : `evidence/2026-10-13-list-browser-targets-salesforce-session.json` et `evidence/2026-10-13-rea-capture-salesforce-login.png`.

## Authentification : ce qui est permis et ce qui ne l'est pas

Interdit (non-contournement) :

- Saisir ou stocker un mot de passe, un code MFA, un cookie `sid` ou une URL `frontdoor.jsp` dans le dépôt, les scripts, les logs ou les preuves.
- Automatiser la saisie du MFA, réutiliser un cookie de session copié depuis un autre poste, ou désactiver le MFA / les politiques de session de l'org.
- Observer une org pour laquelle l'autorisation écrite n'a pas été donnée.

Permis :

1. **Connexion humaine dans la fenêtre visible** (recommandé). Une personne habilitée prend le contrôle du bureau distant, se connecte avec son propre compte, valide le MFA (Salesforce Authenticator, clé de sécurité, code TOTP) puis rend la main. L'agent ne touche pas au formulaire de connexion. La session vit dans le profil `/tmp/crm-lab-salesforce`, qui disparaît avec la VM.
2. **Salesforce CLI avec URL d'authentification stockée en secret Cursor** (alternative sans intervention à chaque run). La personne fait `sf org login web` sur son poste (MFA inclus), exporte `sf org display --verbose --json | jq -r .result.sfdxAuthUrl` dans le secret `SFDX_AUTH_URL` (Cursor Dashboard → Cloud Agents → Secrets, portée dépôt). Dans la VM : `sf org login sfdx-url --sfdx-url-stdin`, puis `sf org open --url-only` fournit une URL `frontdoor.jsp` à usage unique que l'agent charge dans le navigateur `9223` sans jamais l'écrire dans un fichier. Cette voie utilise un mécanisme officiel Salesforce (OAuth refresh token + frontdoor) et reste soumise aux politiques de l'org ; elle nécessite d'installer `@salesforce/cli` dans l'environnement.

Dans les deux cas, l'agent signale avant toute connexion qu'une intervention humaine ou un secret est nécessaire, et attend la confirmation.

## Interventions humaines à prévoir (SSO / MFA)

| Situation | Intervention | Qui |
| --- | --- | --- |
| Première connexion à la Developer Org | Prendre le contrôle du bureau distant, se connecter, valider le MFA. | Titulaire du compte Salesforce. |
| Org derrière un SSO d'entreprise (SAML/OIDC) | Même procédure ; l'IdP peut exiger un appareil enregistré ou un réseau d'entreprise, auquel cas la voie CLI (secret `SFDX_AUTH_URL`) est la seule praticable. | Titulaire + admin SSO si restriction réseau. |
| Vérification d'identité par e-mail (nouvelle adresse IP) | Saisir le code reçu par e-mail dans la fenêtre visible. | Titulaire. |
| Expiration de session en cours d'exploration (timeout org, VM redémarrée) | Se reconnecter ; l'agent reprend au dernier écran documenté. | Titulaire. |
| Création/ouverture d'une Developer Org dédiée au lab | Créer l'org sur developer.salesforce.com, activer les données de démonstration, confirmer que l'usage pour analyse fonctionnelle est autorisé. | Responsable du projet. |

## Hygiène du profil Salesforce

- Le profil `/tmp/crm-lab-salesforce` n'est jamais archivé ni copié dans le dépôt.
- `rea inspect-web-page` et `rea observe-web-session` n'exposent ni cookies, ni en-têtes d'autorisation, ni valeurs de stockage (`values_redacted: true`) ; les corps JSON et sources de scripts ne sont inclus que sur option explicite et ne seront pas activés sur l'org tant que la revue des données n'est pas faite.
- Les captures d'écran Salesforce sont relues avant dépôt : masquer e-mails, noms réels, identifiants d'enregistrement (`001...`) si l'org contient autre chose que des données de démonstration.
