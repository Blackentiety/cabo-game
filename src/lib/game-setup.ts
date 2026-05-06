import { createFullDeck, shuffleDeck } from "@/lib/deck";
import type { CaboCard, CaboPlayer, PhaseOneGameState } from "@/lib/types";

type CreatePhaseOneGameOptions = {
  playerCount: number;
  cardsPerPlayer?: number;
  randomizer?: () => number;
};

function createPlayers({ playerCount }: { playerCount: number }): CaboPlayer[] {
  return Array.from({ length: playerCount }, (_, playerIndex) => ({
    id: `player-${playerIndex + 1}`,
    name: `Joueur ${playerIndex + 1}`,
    hand: [],
  }));
}

function drawCard({
  deck,
  nextCardIndex,
}: {
  deck: CaboCard[];
  nextCardIndex: number;
}) {
  const card = deck[nextCardIndex];
  if (!card) {
    throw new Error("Deck is empty");
  }

  return {
    card,
    nextCardIndex: nextCardIndex + 1,
  };
}

function ensureValidSetup({
  playerCount,
  cardsPerPlayer,
}: {
  playerCount: number;
  cardsPerPlayer: number;
}) {
  if (playerCount < 2) {
    throw new Error("At least 2 players are required");
  }

  if (cardsPerPlayer < 1) {
    throw new Error("At least 1 card per player is required");
  }

  if (playerCount * cardsPerPlayer + 1 > 54) {
    throw new Error("Not enough cards for this setup");
  }
}

function dealHands({
  deck,
  players,
  cardsPerPlayer,
}: {
  deck: CaboCard[];
  players: CaboPlayer[];
  cardsPerPlayer: number;
}) {
  let nextCardIndex = 0;

  for (let cardRound = 0; cardRound < cardsPerPlayer; cardRound += 1) {
    for (let playerIndex = 0; playerIndex < players.length; playerIndex += 1) {
      const player = players[playerIndex];
      if (!player) {
        throw new Error("Missing player during deal");
      }
      const draw = drawCard({ deck, nextCardIndex });
      player.hand.push(draw.card);
      nextCardIndex = draw.nextCardIndex;
    }
  }

  return nextCardIndex;
}

export function createPhaseOneGame({
  playerCount,
  cardsPerPlayer = 4,
  randomizer = Math.random,
}: CreatePhaseOneGameOptions): PhaseOneGameState {
  ensureValidSetup({ playerCount, cardsPerPlayer });

  const shuffledDeck = shuffleDeck({
    deck: createFullDeck(),
    randomizer,
  });

  const players = createPlayers({ playerCount });
  const afterDealIndex = dealHands({
    deck: shuffledDeck,
    players,
    cardsPerPlayer,
  });

  const discardDraw = drawCard({
    deck: shuffledDeck,
    nextCardIndex: afterDealIndex,
  });

  return {
    players,
    drawPile: shuffledDeck.slice(discardDraw.nextCardIndex),
    discardPile: [discardDraw.card],
  };
}

