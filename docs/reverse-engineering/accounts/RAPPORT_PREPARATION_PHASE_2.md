# Rapport de Préparation — Phase 2 : Connexion REA MCP et Reconnaissance Salesforce

**Date :** 13 octobre 2026  
**Environnement :** CRM Lab (`DKSolution28/crm-lab`), Linux x86_64 Ubuntu 24.04  
**Statut :** Phase de reconnaissance et outillage validée. En attente de l'accès/authentification Salesforce Developer Org.

---

## 1. Synthèse Exécutive

La Phase 2 prépare l'analyse fonctionnelle de Salesforce via **REA** (*Reverse Engineer Anything*) version **6.4.0** et le navigateur Chromium piloté par le protocole Chrome DevTools Protocol (CDP).

Tous les prérequis techniques locaux (CLI REA 6.4.0, santé du protocole MCP, Chromium CDP sur le port 9222, exécution des probes `list_browser_targets` et `inspect_web_page`, capture de captures d'écran) ont été vérifiés avec succès avec production de preuves non sensibles.

L'accès à une instance Salesforce requiert une authentification légitime sans contournement technique. Une procédure de cloisonnement de session et une matrice complète d'exploration du module **Accounts** sont prêtes et documentées.

---

## 2. Vérifications Réalisées et Résultats des Tests

### 2.1 Disponibilité de REA 6.4.0 (CLI)
- **Vérification binaire :** Le package `rea-agents@6.4.0` est installé dans `/workspace/node_modules/rea-agents` et accessible via `./node_modules/.bin/rea` ou `npx rea-agents`.
- **Version observée :** `6.4.0`.
- **Moteurs d'analyse :** 18 capacités répertoriées (`capabilities`). Le mode web/navigateur (`rea-cdp-browser`) est pleinement fonctionnel sous Linux sans dépendance native macOS.

### 2.2 Vérification du Serveur MCP REA
- **Validation `rea mcp doctor` :**
  - Statut : **`healthy: true`**
  - Adaptateur : `production-stdio`
  - Protocole MCP : `2025-11-25`
  - Outils MCP inventoriés : **170 outils** (dont `list_browser_targets`, `inspect_web_page`, `capture_web_screenshot`, `capture_browser_scenario`)
  - Prompts MCP : 6 prompts
  - Digest du catalogue : `85d80276ecacf937bf3e803b7a31748ae1a8286f556fa5cf734eef768cc7d72a`
  - Test d'initialisation et requête cible-libre (`binary_session`) : `ok: true`.

### 2.3 Distinction CLI vs Connexion Serveur MCP Cursor Agent
- **État actuel dans l'Agent Cloud Cursor :**
  - La CLI REA fonctionne parfaitement en ligne de commande.
  - Le serveur MCP REA n'était pas enregistré dans le runtime agent Cursor lors du boot (seuls `cursor-cloud` et `cursor-subscriptions` sont déclarés dans le catalogue d'outils dynamiques).
- **Configuration MCP manquante identifiée :**
  - L'enregistrement MCP s'effectue via le fichier `/home/ubuntu/.cursor/mcp.json` (ou `.cursor/mcp.json`).
  - `rea setup --client cursor` prépare la configuration suivante :
    ```json
    {
      "mcpServers": {
        "rea": {
          "command": "/workspace/node_modules/.bin/rea",
          "args": ["mcp"]
        }
      }
    }
    ```
  - Un agent Cloud Cursor charge ses serveurs MCP au démarrage de la session VM. L'injection locale du fichier pendant une session active n'ajoute pas dynamiquement de nouveau namespace au catalogue d'outils de la session en cours, mais valide la configuration pour les sessions suivantes et permet l'appel direct CLI ou via MCP stdio.

### 2.4 Vérification Chromium et Protocole CDP sur `127.0.0.1:9222`
- **État du service :** Chromium s'exécute en mode headless avec debugging à distance activé sur le port 9222.
- **Réponse HTTP `/json/version` :**
  - Produit : `Chrome/156.0.8078.4`
  - Protocole DevTools : `1.3`
  - User-Agent : `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36`
  - Endpoint WebSocket : `ws://127.0.0.1:9222/devtools/browser/...`

### 2.5 Tests de `list_browser_targets` et `inspect_web_page`
- Les tests ont été effectués sur l'application de laboratoire locale `http://127.0.0.1:3000` (port Next.js actif).
- **Résultats obtenus :**
  1. `list_browser_targets` a détecté avec succès la cible `page` `http://127.0.0.1:3000/`.
  2. `inspect_web_page` a analysé la cible :
     - Reconstitution du DOM (197 nœuds)
     - Arbre d'accessibilité (166 nœuds, capture de texte validée)
     - Événements console et requêtes réseau
     - Vérification de la politique de non-rétention de données sensibles (valeurs des formulaires masquées, formats structurels préservés).
  3. `capture_web_screenshot` a capturé le viewport rendu. L'image a été décodée et enregistrée sans données sensibles.

---

## 3. Session Navigateur Distincte pour Salesforce Developer Org

Pour garantir l'étanchéité absolue entre l'environnement de développement local et l'organisation Salesforce, un script de démarrage de session navigateur distincte a été créé :
- **Script :** `scripts/launch-salesforce-browser.sh`
- **Port CDP dédié :** `9223` (paramétrable via `SF_CDP_PORT`)
- **Profil utilisateur dédié :** `/tmp/salesforce-session-cdp` (isolé de `/tmp/crm-lab-cdp`)
- **URL cible :** `https://login.salesforce.com` (ou domaine custom de la Developer Org)

Ce profil empêche toute collision de cookies, tokens ou sessions entre le lab local et Salesforce.

---

## 4. Préparation de l'Exploration du Module Accounts

La spécification complète est consignée dans :
`docs/reverse-engineering/accounts/SPEC_ACCOUNTS_EXPLORATION.md`

Elle couvre les 6 axes fonctionnels prioritaires :
1. **Navigation & App Launcher :** Arborescence Lightning Experience, intégration dans la barre de navigation.
2. **List Views (Vues de listes) :** Sélecteurs de listes, tri, pagination, recherche inline, actions de masse.
3. **Fiche Compte (Record Detail) :** Highlights Panel, onglets détails/activités, Related Lists (Contacts, Opportunités).
4. **Formulaires de création & édition :** Modals `lightning-record-form`, champs obligatoires (`aria-required`), dépendances de listes déroulantes (picklists).
5. **Filtres & Recherches :** Critères de filtrage avancés et fenêtres modales de lookup.
6. **Interactions & Actions Rapides :** Actions standards ("Log a Call", "New Opportunity", etc.).

Une matrice de correspondance des champs Salesforce (`Account`) vers le schéma local Prisma CRM Lab y est également formalisée.

---

## 5. Blocages Réels et Règles de Sécurité

1. **Authentification Salesforce :**
   - **Règle absolue :** Ne pas contourner l'authentification Salesforce.
   - **Point de blocage actuel :** L'URL spécifique, le login et le flux SSO/MFA de l'organisation Salesforce Developer autorisée n'ont pas encore été fournis dans cette session.
   - **MFA / SSO :** Si un défi MFA (TOTP, Salesforce Authenticator) ou SSO est activé sur l'organisation, une intervention utilisateur sera requise pour valider le challenge dans la session navigateur sur le port 9223.
2. **Secrets & Tokens :**
   - Aucun secret Salesforce ne doit être versionné dans le dépôt Git.
   - Tout secret requis pour des intégrations futures devra être injecté via les secrets de l'environnement Cursor.

---

## 6. Preuves et Artefacts Enregistrés

Tous les livrables d'observation non sensibles ont été générés et stockés dans `docs/reverse-engineering/accounts/` :

| Fichier | Description |
|---|---|
| `docs/reverse-engineering/accounts/SPEC_ACCOUNTS_EXPLORATION.md` | Spécification d'exploration et matrice de mapping du module Accounts |
| `docs/reverse-engineering/accounts/evidence_list_targets.json` | Preuve REA normalisée de `list_browser_targets` |
| `docs/reverse-engineering/accounts/evidence_inspect_page.json` | Preuve REA normalisée de `inspect_web_page` (DOM, accessibilité, scripts) |
| `docs/reverse-engineering/accounts/evidence_screenshot.json` | Preuve REA de la capture d'écran du viewport |
| `docs/reverse-engineering/accounts/crm_lab_test_page.png` | Rendu visuel décodé de la page de test |
| `scripts/launch-salesforce-browser.sh` | Script d'instanciation de la session Chromium isolée sur le port 9223 |

---

## 7. Prochaines Étapes Recommandées (Phase 3)

1. **Obtention des coordonnées de la Developer Org :** Fournir l'URL My Domain de l'organisation Salesforce autorisée.
2. **Connexion & Authentification :** Démarrer le navigateur avec `scripts/launch-salesforce-browser.sh`, effectuer la connexion (avec résolution de la MFA par l'utilisateur si nécessaire).
3. **Capture d'Evidence REA Salesforce :**
   - Lister les cibles via `./node_modules/.bin/rea list-browser-targets http://127.0.0.1:9223`
   - Inspecter la vue de liste Accounts via `./node_modules/.bin/rea inspect-web-page`
   - Capturer la structure du formulaire de création d'un Compte
4. **Reconstruction CRM Lab :** Adapter le modèle Prisma et développer l'interface Accounts dans CRM Lab à partir des spécifications d'observation extraites.
