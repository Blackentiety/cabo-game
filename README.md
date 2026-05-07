# Cabo Game (Web MVP)

## Version française

### À propos du projet

Ce projet est une adaptation web du jeu de cartes **Cabo**, réalisée dans le cadre d’un **projet de cours**.  
L’idée initiale était de construire une version orientée **multijoueur en ligne**, mais avec une contrainte de temps très courte, seule une version **MVP jouable en local (pass-and-play)** est disponible pour le moment.

Le MVP actuel permet de jouer une vraie partie complète avec les bases du jeu, les pouvoirs principaux, l’annonce Cabo et le calcul de score final.

La mécanique de **la Coupe** n’est pas encore disponible à ce stade.

### État actuel du MVP

- Jeu jouable en local sur un seul appareil (pass-and-play)
- Distribution des cartes et déroulement tour par tour
- Pioche depuis deck ou défausse
- Pouvoirs 7/8, 9/10, Valet, Dame
- Annonce Cabo, dernier tour et calcul des points
- Interface table de jeu centrée avec cartes visuelles

### Règles utilisées (version du projet)

#### 1. Cartes et points

- Jeu de 54 cartes (52 + 2 Jokers)
- Objectif: avoir le moins de points
- Joker: 0
- Cartes numériques (1 à 10): valeur nominale
- Valet/Dame: 10
- Rois noirs (Pique, Trèfle): 15
- Rois rouges (Cœur, Carreau): -1

#### 2. Déroulement de base

- Chaque joueur reçoit 4 cartes face cachée
- Au début, chaque joueur regarde ses 2 cartes les plus proches
- À son tour, un joueur peut:
  - piocher dans le deck caché, ou
  - prendre la carte du dessus de la défausse
- Le joueur remplace une carte de sa main, ou défausse la carte piochée

#### 3. Pouvoirs (uniquement si la carte vient de la pioche puis est défaussée)

- 7 ou 8: regarder une de ses propres cartes
- 9 ou 10: regarder une carte adverse
- Valet: peut échanger à l’aveugle une de ses cartes avec une carte adverse
- Dame: regarder une de ses cartes, regarder une carte adverse, puis choisir d’échanger ou non

#### 4. Coupe

La Coupe est prévue dans la roadmap mais n’est **pas implémentée** dans ce MVP.

#### 5. Fin de partie

- Un joueur annonce Cabo à son tour: son jeu se fige
- Les autres joueurs jouent un dernier tour
- Le gagnant est celui avec le moins de points
- En cas d’égalité entre l’annonceur et un autre joueur, le non-annonceur gagne

### Lancer le projet en local

#### Prérequis

- Node.js 18+ (recommandé)
- npm (ou pnpm/yarn/bun)

#### Installation

```bash
npm install
```

#### Démarrage

```bash
npm run dev
```

Puis ouvrir `http://localhost:3000`.

#### Build de production

```bash
npm run build
npm run start
```

Bonnes parties et amusez-vous bien.

---

## English version

### About the project

This project is a web adaptation of the **Cabo** card game built for a **school project**.  
The original direction was to build an **online multiplayer** version, but due to a very short deadline, only a **local playable MVP (pass-and-play)** is currently available.

The current MVP already supports full playable rounds with core gameplay, main card powers, Cabo call flow, and final score calculation.

The **Cut** mechanic is not available yet.

### Current MVP status

- Local pass-and-play on a single device
- Card dealing and turn-by-turn flow
- Draw from deck or discard pile
- Powers for 7/8, 9/10, Jack, Queen
- Cabo call, last round, and final scoring
- Centered game-table UI with visual cards

### Rules used in this project

#### 1. Cards and points

- 54-card deck (52 + 2 Jokers)
- Goal: have the lowest score
- Joker: 0
- Number cards (1 to 10): face value
- Jack/Queen: 10
- Black Kings (Spades, Clubs): 15
- Red Kings (Hearts, Diamonds): -1

#### 2. Core turn flow

- Each player gets 4 face-down cards
- At the beginning, each player looks at their 2 nearest cards
- On a turn, a player can:
  - draw from the face-down deck, or
  - take the top discard card
- The player either replaces one hand card or discards the drawn card

#### 3. Powers (only when the card is drawn from deck and then discarded)

- 7 or 8: look at one of your own cards
- 9 or 10: look at one opponent card
- Jack: may blindly swap one of your cards with an opponent card
- Queen: look at one of your cards, look at one opponent card, then choose whether to swap

#### 4. Cut

The Cut mechanic is planned but **not implemented** in this MVP.

#### 5. End of game

- A player calls Cabo on their turn: their hand is frozen
- Other players play one final turn
- Lowest total points wins
- If the Cabo caller is tied with another player, the non-caller wins

### Run locally

#### Requirements

- Node.js 18+ (recommended)
- npm (or pnpm/yarn/bun)

#### Install

```bash
npm install
```

#### Start dev server

```bash
npm run dev
```

Then open `http://localhost:3000`.

#### Production build

```bash
npm run build
npm run start
```

Have fun and enjoy your games.
