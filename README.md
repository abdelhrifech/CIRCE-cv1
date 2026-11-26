# CIRCE — démarrage local

Depuis le dossier qui contient `package.json` (Windows, macOS ou Linux, **Node.js 24 ou plus**) :

```sh
npm install
npm start
```

- `npm install` installe tout le projet : il lance pnpm 12.14.0 par `npx` (aucune installation globale de pnpm).
- `npm start` restaure au premier démarrage la base de dev livrée (`apps/api/prisma/donnees/dev.sqlite.gz` → `apps/api/prisma/dev.db` : données reprises de Circé, S28 à S41 2026, plus JDD fictifs Bus, J-3 et non-conformités sur les plateformes « (JDD) »), applique les migrations, prépare les référentiels et les profils de développement, puis lance l’API et le web. Il affiche **Application prête** et l’adresse à ouvrir, généralement `http://127.0.0.1:3000`.
- Le premier démarrage nécessite Internet et peut prendre plusieurs minutes. `Ctrl+C` arrête l’application. Les ports préférés sont web 3000, API 3001 et sondes 9180 ; si un port est occupé, un port libre est choisi et affiché.
- Données passées : choisir dans les filtres une semaine entre **S28 et S41 de 2026** (la semaine courante est vide).
- Avec pnpm installé, `pnpm install` puis `pnpm start` (ou `pnpm start:all`) font la même chose.

## Installation sur Windows

1. Installer **Node.js 24 LTS**, version Windows x64 pour un PC Intel/AMD, avec npm et l’ajout au PATH : [téléchargement officiel](https://nodejs.org/en/download). Fermer puis rouvrir le terminal.
2. Récupérer le projet dans un dossier local accessible en écriture, par exemple `C:\Projets\CIRCE-cv1`, avec [Git pour Windows](https://git-scm.com/download/win) :

   ```bat
   git clone https://github.com/abdelhrifech/CIRCE-cv1.git C:\Projets\CIRCE-cv1
   ```

3. Dans **Invite de commandes (cmd)** :

   ```bat
   cd /d C:\Projets\CIRCE-cv1
   npm install
   npm start
   ```

4. Ouvrir dans Edge, Chrome ou Firefox l’adresse affichée après **Application prête**.

Le projet ne nécessite ni Docker ni un serveur PostgreSQL/MySQL : SQLite est installé avec les dépendances. Ne pas copier les `node_modules` d’une autre machine. Le dossier doit être accessible en écriture pour `.env` et `apps\api\prisma\dev.db`. Pour repartir de la base livrée, arrêter l’application, déplacer `apps\api\prisma\dev.db` hors du dossier, puis relancer `npm start`.

### PowerShell

Si PowerShell refuse le script `npm.ps1`, utiliser l’exécutable `.cmd`, sans changer la politique de sécurité :

```powershell
cd C:\Projets\CIRCE-cv1
npm.cmd install
npm.cmd start
```

### En cas d’erreur d’installation

Vérifier `node --version` (24.x ou plus) et `npm --version`. Si une compilation du module SQLite `better-sqlite3` est demandée et échoue, installer **Python 3** et **Visual Studio Build Tools** avec la charge **Développement Desktop en C++** et le SDK Windows, puis relancer `npm install` et `npm start`. Ces outils sont nécessaires seulement si le binaire précompilé ne peut pas être utilisé. Voir la [documentation du module](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/troubleshooting.md).

## Profils et options

Le sélecteur **Profil (dev)** permet de changer de rôle. Pour ouvrir directement avec l’administrateur :

```sh
npm start -- --user=dev.admin
```

Autres options :

```sh
npm start -- --no-seed
npm start -- --no-demo
npm start -- --web-port=3000 --api-port=3001 --admin-port=9180
```

- `--no-seed` applique les migrations et lance les serveurs sans exécuter les référentiels, profils et JDD. À utiliser sur une base déjà préparée.
- `--no-demo` prépare les référentiels et profils, sans charger les JDD.
- Les options de ports indiquent les ports préférés ; le lanceur choisit un autre port s’ils sont occupés.

La base locale persiste entre les démarrages. Une installation neuve part de la base livrée.

Ce lanceur utilise les identités de développement. Il sert au fonctionnement local et aux démonstrations ; la mise en production nécessite l’authentification et la configuration de déploiement décrites dans les audits du projet.

## Vérifications

```sh
node --test scripts/pnpm-process.test.mjs
pnpm typecheck
pnpm lint
```

La correction Windows utilise le CLI JavaScript de pnpm sans shell, y compris pour les migrations ; l’arrêt termine l’arbre de processus sous Windows. La recette native sur une machine Windows reste à effectuer, l’environnement de développement courant étant macOS.

## Documentation

Documentation en Markdown dans `docs/`, organisée selon le référentiel Cityz Media 0.2.0-pre :

- [docs/architecture/](docs/architecture/README.md) : dossier d’architecture (état actuel et cible).
- [docs/specifications/](docs/specifications/README.md) : spécifications fonctionnelles et règles métier.
- [docs/acceptance/](docs/acceptance/README.md) : cas de test de recette, traçabilité, comptes rendus de campagne.
- [docs/operations/](docs/operations/README.md) : exploitation, runbooks, anomalies connues.
- [docs/api/](docs/api/README.md) : contrats OpenAPI.
- [docs/adr/](docs/adr/README.md) : décisions d’architecture.
- [docs/exceptions/](docs/exceptions/README.md) : dérogations demandées.
- [docs/milestones/](docs/milestones/README.md) : comptes rendus de jalons.
- [docs/knowledge-transfer/](docs/knowledge-transfer/README.md) : transfert de compétences.

Contribuer : [CONTRIBUTING.md](CONTRIBUTING.md). Fichiers de travail hors formats documentaires (empreintes du gel, catalogues JDD) : `ressources/`.
