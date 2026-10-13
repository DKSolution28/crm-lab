# Rapport de préparation REA / Salesforce Accounts

Date du contrôle : 13 octobre 2026 (UTC)

## Décision

La chaîne locale REA → MCP stdio → CDP est fonctionnelle sur une page de test.
La reconnaissance Salesforce ne doit pas encore commencer : le serveur REA
n'est pas enregistré dans le client Cursor de cet agent Cloud et aucune session
authentifiée vers la Developer Org autorisée n'a été fournie.

L'installation de `rea-agents` ne vaut pas connexion MCP. Ces états ont été
contrôlés séparément.

## Résultats

| Contrôle | État | Preuve non sensible |
| --- | --- | --- |
| Paquet REA | Réussi | `rea-agents` 6.4.0 dans les dépendances et `npx --no-install rea --version` retourne `6.4.0`. |
| Serveur MCP REA | Réussi en stdio direct | `rea mcp doctor --json` : serveur `rea` 6.4.0, protocole `2025-11-25`, 170 outils observés sur 170, requête `binary_session` réussie. |
| Enregistrement MCP Cursor | Bloqué | `rea doctor --client cursor --json` signale `registration:cursor` manquant dans `/home/ubuntu/.cursor/mcp.json`. Le catalogue d'outils de l'agent actif n'expose aucun namespace REA. |
| Chromium / CDP | Réussi | `http://127.0.0.1:9222/json/version` répond avec Chrome 156 et CDP 1.3. |
| `list_browser_targets` | Réussi via MCP stdio | Cible `CRM Lab`, URL `http://127.0.0.1:3000/`, origine limitée explicitement à `http://127.0.0.1:3000`. |
| `inspect_web_page` | Réussi via MCP stdio | Evidence `rea.web-page-inspection`, sans erreur, valeurs de stockage occultées et capture limitée à l'origine de test. |
| Accès Salesforce | Non testé | Aucune URL de My Domain ni session autorisée n'est disponible. Aucune tentative de connexion ou de contournement n'a été faite. |

Les moteurs natifs Hopper, Ghidra et IDA absents expliquent l'état global
`healthy: false` de `rea doctor`, mais ne bloquent pas le fournisseur navigateur
CDP testé ici.

## Configuration MCP manquante

Le plan officiel produit par
`npx --no-install rea setup --client cursor --dry-run --format json` demande de
créer `/home/ubuntu/.cursor/mcp.json` avec l'enregistrement stdio suivant :

```json
{
  "mcpServers": {
    "rea": {
      "command": "npx",
      "args": ["-y", "rea-agents@6.4.0", "mcp"]
    }
  }
}
```

Commande officielle équivalente :

```bash
npx --no-install rea setup --yes --client cursor
```

Cette écriture n'a pas été appliquée pendant ce contrôle. Après enregistrement,
il faut démarrer un nouvel agent Cloud (ou reconnecter un client qui recharge
les serveurs MCP), puis vérifier que `list_browser_targets` et
`inspect_web_page` figurent dans son catalogue. Modifier la configuration
pendant l'exécution ne peut pas ajouter les outils à l'agent déjà lancé.

L'environnement Cloud courant est personnel et sa configuration JSON n'est pas
exposée par l'API d'inspection. L'egress effectif n'est pas restreint. Si une
politique `mcpServerAllowlist` est activée dans le tableau de bord, elle doit
également autoriser la commande ci-dessus ; aucune preuve actuelle n'indique
cependant que cette politique est le blocage observé.

## Session Salesforce distincte

Le lanceur `scripts/start-salesforce-cdp-browser.sh` réserve :

- le port CDP `9223`, distinct du navigateur de test sur `9222` ;
- le profil privé
  `~/.cache/crm-lab/salesforce-cdp-profile`, hors dépôt ;
- une URL HTTPS fournie par `SALESFORCE_LOGIN_URL`, sans identifiant ni secret ;
- un navigateur visible par défaut pour permettre le SSO et la MFA manuels.

Exécution recommandée dans une session terminal persistante :

```bash
SALESFORCE_LOGIN_URL="https://<my-domain>.my.salesforce.com/" \
  bash scripts/start-salesforce-cdp-browser.sh
```

Le propriétaire de la Developer Org doit terminer le SSO et toute MFA dans
cette fenêtre. Ne pas transmettre de mot de passe, jeton de session, cookie,
code MFA ou URL contenant un secret à REA, aux journaux ou au dépôt.

Après authentification manuelle, vérifier uniquement :

```text
list_browser_targets(
  cdp_endpoint = "http://127.0.0.1:9223",
  allowed_origins = ["https://<lightning-origin>"]
)
```

Puis utiliser l'identifiant retourné pour `inspect_web_page`, toujours avec
l'origine Lightning exacte. Une redirection SSO vers une autre origine doit
être terminée par l'utilisateur avant la capture.

## Blocages réels

1. L'enregistrement MCP REA manque dans le client Cursor Cloud actif.
2. Un redémarrage/rechargement d'agent est requis après cet enregistrement.
3. L'URL My Domain et une session Salesforce autorisée ne sont pas disponibles.
4. Le SSO et/ou la MFA, s'ils sont demandés, exigent l'intervention du
   propriétaire de l'organisation.

## Étapes suivantes

1. Appliquer l'enregistrement MCP après validation par le propriétaire de
   l'environnement.
2. Lancer un nouvel agent Cloud et refaire les deux appels navigateur via les
   outils REA exposés à l'agent, pas seulement via un client MCP de diagnostic.
3. Ouvrir le profil Salesforce distinct avec l'URL My Domain autorisée.
4. Faire terminer SSO/MFA manuellement.
5. Confirmer l'origine Lightning finale, l'identifiant de cible et l'absence de
   données sensibles dans les sorties.
6. Exécuter le protocole de `accounts-exploration-spec.md`.
7. Ne commencer aucune reconstruction avant validation de ces points.
