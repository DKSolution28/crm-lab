# Spécification d'exploration — Salesforce Accounts

## Portée et garde-fous

Cette exploration décrit le comportement fonctionnel d'une Salesforce
Developer Org explicitement autorisée. Elle commence seulement lorsque :

1. REA 6.4.0 est exposé comme serveur MCP dans le nouvel agent Cloud ;
2. le navigateur Salesforce distinct répond en CDP sur `127.0.0.1:9223` ;
3. le propriétaire a terminé le SSO et la MFA ;
4. l'origine Lightning exacte est connue et utilisée comme
   `allowed_origins`.

Les captures ne doivent contenir ni valeurs de cookies ou de stockage, ni
jetons, ni identifiants personnels, ni données client réelles. Utiliser
uniquement des enregistrements de démonstration. Ne pas automatiser les écrans
SSO/MFA et ne pas désactiver leurs contrôles.

## Matrice d'exploration

| Zone | Parcours à observer | Éléments à relever |
| --- | --- | --- |
| Navigation | App Launcher ou barre de navigation → Accounts | Libellés, ordre, état actif, URL sans paramètres sensibles, retour arrière. |
| Liste | Ouvrir Accounts et changer de vue autorisée | Colonnes, tri, pagination ou chargement progressif, actions de ligne, états vide/chargement/erreur. |
| Filtres | Ouvrir le panneau de filtres et appliquer un filtre sur des données de démonstration | Opérateurs, validation, combinaison des critères, remise à zéro, reflet dans l'URL ou le réseau sans conserver de valeurs sensibles. |
| Recherche | Rechercher un compte de démonstration | Portée, délai, résultats, absence de résultat, effacement. |
| Fiche | Ouvrir un compte de démonstration | En-tête, actions, onglets, champs, sections, relations, activité, états des droits insuffisants. |
| Création | Ouvrir « New Account » sans soumettre avant accord explicite | Champs, ordre, requis, valeurs par défaut, aides, dépendances, validations client. |
| Modification | Ouvrir « Edit » sur un enregistrement jetable sans enregistrer avant accord explicite | Préremplissage, champs éditables, validations, annulation, avertissements de perte. |
| Interactions | Menus, onglets, accordéons, modales et raccourcis pertinents | Déclencheur, focus, fermeture, retour visuel, accessibilité, état conservé. |
| Responsive | Largeur de référence puis largeur réduite si autorisée | Recomposition, débordement, commandes masquées, alternatives mobiles. |

## Séquence de capture REA

Pour chaque état stable :

1. Appeler `list_browser_targets` avec l'endpoint `9223` et l'origine exacte.
2. Confirmer le titre, l'URL et l'identifiant de cible attendus.
3. Appeler `inspect_web_page` avec :
   - `include_accessibility_text: true` ;
   - `include_console_text: false` par défaut ;
   - `include_script_sources: false` pendant la reconnaissance fonctionnelle ;
   - `include_storage_keys: false` et
     `include_storage_fingerprints: false` ;
   - l'origine Lightning exacte dans `allowed_origins`.
4. Noter l'état fonctionnel observé et ses limitations.
5. Pour une interaction nécessaire, faire agir l'utilisateur ou utiliser un
   scénario borné approuvé ; capturer ensuite le nouvel état.

Ne pas conclure qu'un comportement est absent lorsque la capture est tronquée,
qu'un composant est chargé tardivement ou que les droits du profil le masquent.

## Fiche de relevé

Créer un relevé non sensible par parcours avec les champs suivants :

```text
Parcours :
Rôle/profil fonctionnel :
Préconditions :
État initial :
Actions :
État final :
Règles métier observées :
Validations et erreurs :
Accessibilité :
Appels réseau observables (forme uniquement) :
Evidence REA :
Limitations / inconnues :
```

Les identifiants d'Evidence REA peuvent être conservés. Les identifiants
Salesforce à 15/18 caractères, noms de personnes, e-mails, cookies, valeurs de
champs et paramètres d'URL potentiellement sensibles doivent être remplacés par
des libellés génériques.

## Critère de sortie de la reconnaissance

La phase Accounts est prête pour une analyse fonctionnelle consolidée lorsque
la navigation, la liste, une fiche de démonstration, les filtres, les états de
formulaire et les interactions principales ont chacun :

- une observation reproductible ;
- une preuve REA non sensible ;
- les permissions et préconditions documentées ;
- les états alternatifs et inconnues explicitement distingués.

Ce critère autorise la rédaction d'une spécification fonctionnelle. Il
n'autorise pas à lui seul la reconstruction du CRM.
