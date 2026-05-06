import { getCardPoints, shuffleDeck } from "@/lib/deck";
import { createPhaseOneGame } from "@/lib/game-setup";
import type {
  CaboCard,
  CaboPlayer,
  CaboPlayerScore,
  DrawSource,
  PhaseTwoGameState,
} from "@/lib/types";

type CreatePhaseTwoGameOptions = {
  playerCount: number;
  cardsPerPlayer?: number;
  randomizer?: () => number;
};

type DrawFromSourceOptions = {
  gameState: PhaseTwoGameState;
  source: DrawSource;
  randomizer?: () => number;
};

type ReplacePendingDrawOptions = {
  gameState: PhaseTwoGameState;
  handCardIndex: number;
};

function getCurrentPlayer({ gameState }: { gameState: PhaseTwoGameState }): CaboPlayer {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer) {
    throw new Error("Current player is missing");
  }

  return currentPlayer;
}

function ensureGameInProgress({ gameState }: { gameState: PhaseTwoGameState }) {
  if (gameState.finalScores) {
    throw new Error("Game is already finished");
  }
}

function ensureNoPendingDraw({ gameState }: { gameState: PhaseTwoGameState }) {
  if (gameState.pendingDraw) {
    throw new Error("Current player must resolve the drawn card first");
  }
}

function ensurePendingDrawExists({ gameState }: { gameState: PhaseTwoGameState }) {
  if (!gameState.pendingDraw) {
    throw new Error("No drawn card to resolve");
  }
}

function getNextPlayerIndex({ gameState }: { gameState: PhaseTwoGameState }) {
  return (gameState.currentPlayerIndex + 1) % gameState.players.length;
}

function moveToNextPlayer({ gameState }: { gameState: PhaseTwoGameState }): PhaseTwoGameState {
  return {
    ...gameState,
    currentPlayerIndex: getNextPlayerIndex({ gameState }),
  };
}

function computePlayerScores({
  players,
}: {
  players: CaboPlayer[];
}): CaboPlayerScore[] {
  return players.map((player) => ({
    playerId: player.id,
    playerName: player.name,
    points: player.hand.reduce(
      (totalPoints, card) => totalPoints + getCardPoints({ card }),
      0,
    ),
  }));
}

function getWinnerPlayerIds({
  scores,
  callerPlayerId,
}: {
  scores: CaboPlayerScore[];
  callerPlayerId: string | null;
}) {
  const lowestPoints = Math.min(...scores.map((score) => score.points));
  const bestPlayerIds = scores
    .filter((score) => score.points === lowestPoints)
    .map((score) => score.playerId);

  if (!callerPlayerId || bestPlayerIds.length < 2) {
    return bestPlayerIds;
  }

  const bestNonCallerPlayerIds = bestPlayerIds.filter(
    (playerId) => playerId !== callerPlayerId,
  );

  return bestNonCallerPlayerIds.length > 0 ? bestNonCallerPlayerIds : bestPlayerIds;
}

function finishGame({ gameState }: { gameState: PhaseTwoGameState }): PhaseTwoGameState {
  const scores = computePlayerScores({ players: gameState.players });
  const callerPlayerId = gameState.lastRound?.callerPlayerId ?? null;
  const winnerPlayerIds = getWinnerPlayerIds({ scores, callerPlayerId });

  return {
    ...gameState,
    finalScores: scores,
    winnerPlayerIds,
    pendingDraw: null,
  };
}

function advanceAfterResolvedTurn({
  gameState,
}: {
  gameState: PhaseTwoGameState;
}): PhaseTwoGameState {
  if (!gameState.lastRound) {
    return moveToNextPlayer({ gameState });
  }

  const nextRemainingTurns = gameState.lastRound.remainingTurns - 1;
  if (nextRemainingTurns <= 0) {
    return finishGame({ gameState });
  }

  return moveToNextPlayer({
    gameState: {
      ...gameState,
      lastRound: {
        ...gameState.lastRound,
        remainingTurns: nextRemainingTurns,
      },
    },
  });
}

function refillDrawPileIfNeeded({
  gameState,
  randomizer,
}: {
  gameState: PhaseTwoGameState;
  randomizer: () => number;
}) {
  if (gameState.drawPile.length > 0) {
    return {
      drawPile: [...gameState.drawPile],
      discardPile: [...gameState.discardPile],
    };
  }

  if (gameState.discardPile.length < 2) {
    throw new Error("No card available to draw");
  }

  const topDiscardCard = gameState.discardPile.at(-1);
  if (!topDiscardCard) {
    throw new Error("Discard pile is empty");
  }

  const drawPile = shuffleDeck({
    deck: gameState.discardPile.slice(0, -1),
    randomizer,
  });

  return {
    drawPile,
    discardPile: [topDiscardCard],
  };
}

function drawTopCard({ cards }: { cards: CaboCard[] }) {
  const topCard = cards[0];
  if (!topCard) {
    throw new Error("Cannot draw from an empty pile");
  }

  return {
    card: topCard,
    remainingCards: cards.slice(1),
  };
}

export function createPhaseTwoGame({
  playerCount,
  cardsPerPlayer = 4,
  randomizer = Math.random,
}: CreatePhaseTwoGameOptions): PhaseTwoGameState {
  const baseGameState = createPhaseOneGame({
    playerCount,
    cardsPerPlayer,
    randomizer,
  });

  return {
    ...baseGameState,
    currentPlayerIndex: 0,
    pendingDraw: null,
    lastRound: null,
    finalScores: null,
    winnerPlayerIds: [],
  };
}

export function drawFromSource({
  gameState,
  source,
  randomizer = Math.random,
}: DrawFromSourceOptions): PhaseTwoGameState {
  ensureGameInProgress({ gameState });
  ensureNoPendingDraw({ gameState });

  if (source === "discardPile") {
    const topDiscardCard = gameState.discardPile.at(-1);
    if (!topDiscardCard) {
      throw new Error("Discard pile is empty");
    }

    return {
      ...gameState,
      discardPile: gameState.discardPile.slice(0, -1),
      pendingDraw: {
        card: topDiscardCard,
        source,
      },
    };
  }

  const replenishedPiles = refillDrawPileIfNeeded({ gameState, randomizer });
  const drawResult = drawTopCard({ cards: replenishedPiles.drawPile });

  return {
    ...gameState,
    drawPile: drawResult.remainingCards,
    discardPile: replenishedPiles.discardPile,
    pendingDraw: {
      card: drawResult.card,
      source,
    },
  };
}

export function replaceWithPendingDraw({
  gameState,
  handCardIndex,
}: ReplacePendingDrawOptions): PhaseTwoGameState {
  ensureGameInProgress({ gameState });
  ensurePendingDrawExists({ gameState });

  const currentPlayer = getCurrentPlayer({ gameState });
  const cardToDiscard = currentPlayer.hand[handCardIndex];
  if (!cardToDiscard) {
    throw new Error("Selected hand card does not exist");
  }

  const pendingDraw = gameState.pendingDraw;
  if (!pendingDraw) {
    throw new Error("No drawn card to resolve");
  }

  const updatedCurrentHand = [...currentPlayer.hand];
  updatedCurrentHand[handCardIndex] = pendingDraw.card;

  const updatedPlayers = gameState.players.map((player) =>
    player.id === currentPlayer.id ? { ...player, hand: updatedCurrentHand } : player,
  );

  const nextState: PhaseTwoGameState = {
    ...gameState,
    players: updatedPlayers,
    discardPile: [...gameState.discardPile, cardToDiscard],
    pendingDraw: null,
  };

  return advanceAfterResolvedTurn({ gameState: nextState });
}

export function discardPendingDraw({
  gameState,
}: {
  gameState: PhaseTwoGameState;
}): PhaseTwoGameState {
  ensureGameInProgress({ gameState });
  ensurePendingDrawExists({ gameState });

  const pendingDraw = gameState.pendingDraw;
  if (!pendingDraw) {
    throw new Error("No drawn card to resolve");
  }

  const nextState: PhaseTwoGameState = {
    ...gameState,
    discardPile: [...gameState.discardPile, pendingDraw.card],
    pendingDraw: null,
  };

  return advanceAfterResolvedTurn({ gameState: nextState });
}

export function announceCabo({
  gameState,
}: {
  gameState: PhaseTwoGameState;
}): PhaseTwoGameState {
  ensureGameInProgress({ gameState });
  ensureNoPendingDraw({ gameState });

  if (gameState.lastRound) {
    throw new Error("Cabo has already been announced");
  }

  const currentPlayer = getCurrentPlayer({ gameState });
  const lastRoundState = {
    callerPlayerId: currentPlayer.id,
    remainingTurns: gameState.players.length - 1,
  };

  const updatedState: PhaseTwoGameState = {
    ...gameState,
    lastRound: lastRoundState,
  };

  if (lastRoundState.remainingTurns <= 0) {
    return finishGame({ gameState: updatedState });
  }

  return moveToNextPlayer({ gameState: updatedState });
}

export function getCurrentPlayerName({
  gameState,
}: {
  gameState: PhaseTwoGameState;
}) {
  return getCurrentPlayer({ gameState }).name;
}

export function isGameFinished({
  gameState,
}: {
  gameState: PhaseTwoGameState;
}) {
  return gameState.finalScores !== null;
}

export function canDrawCard({
  gameState,
}: {
  gameState: PhaseTwoGameState;
}) {
  if (isGameFinished({ gameState }) || gameState.pendingDraw !== null) {
    return false;
  }

  return gameState.drawPile.length > 0 || gameState.discardPile.length > 1;
}

export function canTakeDiscard({
  gameState,
}: {
  gameState: PhaseTwoGameState;
}) {
  if (isGameFinished({ gameState }) || gameState.pendingDraw !== null) {
    return false;
  }

  return gameState.discardPile.length > 0;
}

export function canAnnounceCabo({
  gameState,
}: {
  gameState: PhaseTwoGameState;
}) {
  if (isGameFinished({ gameState })) {
    return false;
  }

  return gameState.pendingDraw === null && gameState.lastRound === null;
}

export function getPlayerTotalPoints({
  player,
}: {
  player: CaboPlayer;
}) {
  return player.hand.reduce((totalPoints, card) => totalPoints + getCardPoints({ card }), 0);
}
