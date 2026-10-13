# Écart CLI REA vs serveur MCP Cloud Agent

L'installation de `rea-agents@6.4.0` dans le dépôt n'enregistre pas le
serveur MCP auprès des Cloud Agents. Les deux couches sont distinctes.

## Ce qui est déjà là

- Paquet npm `rea-agents` 6.4.0 dans `node_modules`.
- Binaire `node_modules/.bin/rea-agents`.
- Catalogue interne : 170 outils MCP, dont `list_browser_targets` et
  `inspect_web_page`.
- CLI opérationnelle sur Chromium CDP (`list-browser-targets`,
  `inspect-web-page`).

## Ce qui manque pour cet agent

Le catalogue d'outils de la run `bc-fc05a8f4-0c4d-44ec-9341-03d2c1942cab`
expose uniquement :

- `cursor`
- `cursor-cloud`
- `cursor-subscriptions`

Aucun namespace REA. Les appels MCP `list_browser_targets` et
`inspect_web_page` sont donc impossibles dans cette session.

`rea doctor --client cursor --json` confirme un second écart, local à la
VM : `/home/ubuntu/.cursor/mcp.json` est absent
(`registration:cursor` = `missing`). Ce fichier concerne un client Cursor
IDE dans la VM. Il n'enregistre pas le serveur pour
[cursor.com/agents](https://cursor.com/agents).

`rea setup --client cursor --dry-run` prévoirait :

```text
npx -y rea-agents@6.4.0 mcp
→ /home/ubuntu/.cursor/mcp.json
```

Ce plan n'a pas été appliqué : il ne réparerait pas la connexion Cloud
Agent et ne ferait pas apparaître les outils dans la run déjà lancée.

## Configuration Cloud Agent manquante

Les Cloud Agents n'utilisent que les serveurs MCP ajoutés dans le menu
MCP de [cursor.com/agents](https://cursor.com/agents) (personnel) ou
Dashboard → Plugins & MCPs (équipe).

REA publie un serveur **stdio**, pas HTTP :

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

Copie de travail : [mcp-cloud-agent.rea.json](mcp-cloud-agent.rea.json).
Épingler `6.4.0`, pas `@latest`, pour rester aligné avec le laboratoire.

## Actions opérateur

1. Ouvrir [cursor.com/agents](https://cursor.com/agents).
2. Menu MCP → ajouter un serveur stdio personnel nommé `rea`.
3. Commande `npx`, arguments `-y`, `rea-agents@6.4.0`, `mcp`.
4. Activer le serveur pour les Cloud Agents.
5. Lancer une **nouvelle** run. Le catalogue de cette run ne change pas
   en cours d'exécution.
6. Vérifier que `list_browser_targets` et `inspect_web_page` apparaissent
   comme outils MCP, puis les relancer sur `http://127.0.0.1:9222`.

Sans cette étape, l'observation navigateur reste limitée à la CLI. La
CLI prouve que REA + CDP fonctionnent ; elle ne remplace pas la
connexion MCP demandée pour l'analyse fonctionnelle assistée.
