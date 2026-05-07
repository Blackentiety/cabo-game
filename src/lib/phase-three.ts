import { getCardPoints, shuffleDeck } from "@/lib/deck";
import { createPhaseOneGame } from "@/lib/game-setup";
import type {
  CaboCard,
  CaboPlayer,
  CaboPlayerScore,
  DrawSource,
  NonJokerRank,
  PhaseThreeGameState,
} from "@/lib/types";

type CreatePhaseThreeGameOptions = {
  playerCount: number;
  cardsPerPlayer?: number;
  randomizer?: () => number;
};

type DrawFromSourceOptions = {
  gameState: PhaseThreeGameState;
  source: DrawSource;
  randomizer?: () => number;
};

type ReplacePendingDrawOptions = {
  gameState: PhaseThreeGameState;
  handCardIndex: number;
};

type PickTargetPlayerOptions = {
  gameState: PhaseThreeGameState;
  targetPlayerId: string;
};

type PickTargetCardOptions = {
  gameState: PhaseThreeGameState;
  targetCardIndex: number;
};

const SELF_PEEK_RANKS: readonly NonJokerRank[] = [7, 8];
const OPPONENT_PEEK_RANKS: readonly NonJokerRank[] = [9, 10];

function getCurrentPlayer({ gameState }: { gameState: PhaseThreeGameState }): CaboPlayer {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer) {
    throw new Error("Current player is missing");
  }

  return currentPlayer;
}

function ensureGameInProgress({ gameState }: { gameState: PhaseThreeGameState }) {
  if (gameState.finalScores) {
    throw new Error("Game is already finished");
  }
}

function ensureInitialPeekCompleted({ gameState }: { gameState: PhaseThreeGameState }) {
  if (gameState.initialPeek !== null) {
    throw new Error("Initial peek phase is not finished");
  }
}

function ensureNoPendingDraw({ gameState }: { gameState: PhaseThreeGameState }) {
  if (gameState.pendingDraw) {
    throw new Error("Current player must resolve the drawn card first");
  }
}

function ensurePendingDrawExists({ gameState }: { gameState: PhaseThreeGameState }) {
  if (!gameState.pendingDraw) {
    throw new Error("No drawn card to resolve");
  }
}

function ensureNoActivePowerEffect({ gameState }: { gameState: PhaseThreeGameState }) {
  if (gameState.activePowerEffect) {
    throw new Error("Current player must resolve the active power first");
  }
}

function ensureActivePowerEffect({ gameState }: { gameState: PhaseThreeGameState }) {
  if (!gameState.activePowerEffect) {
    throw new Error("No active power to resolve");
  }
}

function getNextPlayerIndex({ gameState }: { gameState: PhaseThreeGameState }) {
  return (gameState.currentPlayerIndex + 1) % gameState.players.length;
}

function moveToNextPlayer({ gameState }: { gameState: PhaseThreeGameState }): PhaseThreeGameState {
  return {
    ...gameState,
    turnSequence: gameState.turnSequence + 1,
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

function finishGame({ gameState }: { gameState: PhaseThreeGameState }): PhaseThreeGameState {
  const scores = computePlayerScores({ players: gameState.players });
  const callerPlayerId = gameState.lastRound?.callerPlayerId ?? null;
  const winnerPlayerIds = getWinnerPlayerIds({ scores, callerPlayerId });

  return {
    ...gameState,
    finalScores: scores,
    winnerPlayerIds,
    pendingDraw: null,
    activePowerEffect: null,
  };
}

function advanceAfterResolvedTurn({
  gameState,
}: {
  gameState: PhaseThreeGameState;
}): PhaseThreeGameState {
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
  gameState: PhaseThreeGameState;
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

function getPlayerById({
  gameState,
  playerId,
}: {
  gameState: PhaseThreeGameState;
  playerId: string;
}) {
  const player = gameState.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    throw new Error("Player does not exist");
  }

  return player;
}

function createActivePowerEffect({
  discardedCard,
  currentPlayerId,
}: {
  discardedCard: CaboCard;
  currentPlayerId: string;
}) {
  if (discardedCard.kind === "joker") {
    return null;
  }

  if (SELF_PEEK_RANKS.includes(discardedCard.rank)) {
    return {
      kind: "selfPeek" as const,
      viewerPlayerId: currentPlayerId,
      selectedOwnCardIndex: null,
      viewedCard: null,
    };
  }

  if (OPPONENT_PEEK_RANKS.includes(discardedCard.rank)) {
    return {
      kind: "opponentPeek" as const,
      viewerPlayerId: currentPlayerId,
      targetPlayerId: null,
      targetCardIndex: null,
      viewedCard: null,
    };
  }

  if (discardedCard.rank === "jack") {
    return {
      kind: "jackSwap" as const,
      playerId: currentPlayerId,
      ownCardIndex: null,
      targetPlayerId: null,
      targetCardIndex: null,
    };
  }

  if (discardedCard.rank === "queen") {
    return {
      kind: "queenSwap" as const,
      playerId: currentPlayerId,
      ownCardIndex: null,
      ownViewedCard: null,
      targetPlayerId: null,
      targetCardIndex: null,
      targetViewedCard: null,
    };
  }

  return null;
}

function applyCardSwap({
  gameState,
  ownCardIndex,
  targetPlayerId,
  targetCardIndex,
}: {
  gameState: PhaseThreeGameState;
  ownCardIndex: number;
  targetPlayerId: string;
  targetCardIndex: number;
}) {
  const currentPlayer = getCurrentPlayer({ gameState });
  const targetPlayer = getPlayerById({ gameState, playerId: targetPlayerId });
  if (targetPlayer.id === currentPlayer.id) {
    throw new Error("Target player must be an opponent");
  }

  const ownCard = currentPlayer.hand[ownCardIndex];
  const targetCard = targetPlayer.hand[targetCardIndex];
  if (!ownCard || !targetCard) {
    throw new Error("Selected card does not exist");
  }

  const updatedPlayers = gameState.players.map((player) => {
    if (player.id === currentPlayer.id) {
      const nextHand = [...player.hand];
      nextHand[ownCardIndex] = targetCard;
      return { ...player, hand: nextHand };
    }

    if (player.id === targetPlayer.id) {
      const nextHand = [...player.hand];
      nextHand[targetCardIndex] = ownCard;
      return { ...player, hand: nextHand };
    }

    return player;
  });

  return {
    ...gameState,
    players: updatedPlayers,
  };
}

export function createPhaseThreeGame({
  playerCount,
  cardsPerPlayer = 4,
  randomizer = Math.random,
}: CreatePhaseThreeGameOptions): PhaseThreeGameState {
  const baseGameState = createPhaseOneGame({
    playerCount,
    cardsPerPlayer,
    randomizer,
  });

  return {
    ...baseGameState,
    initialPeek: {
      activePlayerId: baseGameState.players[0]?.id ?? "",
      remainingPlayerIds: baseGameState.players.map((player) => player.id),
    },
    turnSequence: 0,
    currentPlayerIndex: 0,
    pendingDraw: null,
    activePowerEffect: null,
    lastRound: null,
    finalScores: null,
    winnerPlayerIds: [],
  };
}

export function getInitialPeekCards({
  gameState,
}: {
  gameState: PhaseThreeGameState;
}) {
  if (!gameState.initialPeek) {
    throw new Error("Initial peek phase is already finished");
  }

  const player = getPlayerById({
    gameState,
    playerId: gameState.initialPeek.activePlayerId,
  });

  return player.hand.slice(0, 2);
}

export function completeInitialPeek({
  gameState,
}: {
  gameState: PhaseThreeGameState;
}): PhaseThreeGameState {
  ensureGameInProgress({ gameState });

  const initialPeek = gameState.initialPeek;
  if (!initialPeek) {
    throw new Error("Initial peek phase is already finished");
  }

  const [, ...nextRemainingPlayerIds] = initialPeek.remainingPlayerIds;
  if (nextRemainingPlayerIds.length === 0) {
    return {
      ...gameState,
      initialPeek: null,
      currentPlayerIndex: 0,
    };
  }

  const nextActivePlayerId = nextRemainingPlayerIds[0];
  if (!nextActivePlayerId) {
    throw new Error("Next player is missing");
  }

  return {
    ...gameState,
    initialPeek: {
      activePlayerId: nextActivePlayerId,
      remainingPlayerIds: nextRemainingPlayerIds,
    },
  };
}

export function drawFromSource({
  gameState,
  source,
  randomizer = Math.random,
}: DrawFromSourceOptions): PhaseThreeGameState {
  ensureGameInProgress({ gameState });
  ensureInitialPeekCompleted({ gameState });
  ensureNoPendingDraw({ gameState });
  ensureNoActivePowerEffect({ gameState });

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
}: ReplacePendingDrawOptions): PhaseThreeGameState {
  ensureGameInProgress({ gameState });
  ensureInitialPeekCompleted({ gameState });
  ensurePendingDrawExists({ gameState });
  ensureNoActivePowerEffect({ gameState });

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

  const nextState: PhaseThreeGameState = {
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
  gameState: PhaseThreeGameState;
}): PhaseThreeGameState {
  ensureGameInProgress({ gameState });
  ensureInitialPeekCompleted({ gameState });
  ensurePendingDrawExists({ gameState });
  ensureNoActivePowerEffect({ gameState });

  const pendingDraw = gameState.pendingDraw;
  if (!pendingDraw) {
    throw new Error("No drawn card to resolve");
  }

  const currentPlayer = getCurrentPlayer({ gameState });
  const nextState: PhaseThreeGameState = {
    ...gameState,
    discardPile: [...gameState.discardPile, pendingDraw.card],
    pendingDraw: null,
  };

  if (pendingDraw.source !== "drawPile") {
    return advanceAfterResolvedTurn({ gameState: nextState });
  }

  const activePowerEffect = createActivePowerEffect({
    discardedCard: pendingDraw.card,
    currentPlayerId: currentPlayer.id,
  });
  if (!activePowerEffect) {
    return advanceAfterResolvedTurn({ gameState: nextState });
  }

  return {
    ...nextState,
    activePowerEffect,
  };
}

export function announceCabo({
  gameState,
}: {
  gameState: PhaseThreeGameState;
}): PhaseThreeGameState {
  ensureGameInProgress({ gameState });
  ensureInitialPeekCompleted({ gameState });
  ensureNoPendingDraw({ gameState });
  ensureNoActivePowerEffect({ gameState });

  if (gameState.lastRound) {
    throw new Error("Cabo has already been announced");
  }

  const currentPlayer = getCurrentPlayer({ gameState });
  const lastRoundState = {
    callerPlayerId: currentPlayer.id,
    remainingTurns: gameState.players.length - 1,
  };

  const updatedState: PhaseThreeGameState = {
    ...gameState,
    lastRound: lastRoundState,
  };

  if (lastRoundState.remainingTurns <= 0) {
    return finishGame({ gameState: updatedState });
  }

  return moveToNextPlayer({ gameState: updatedState });
}

export function pickOwnCardForPower({
  gameState,
  ownCardIndex,
}: {
  gameState: PhaseThreeGameState;
  ownCardIndex: number;
}): PhaseThreeGameState {
  ensureGameInProgress({ gameState });
  ensureInitialPeekCompleted({ gameState });
  ensureNoPendingDraw({ gameState });
  ensureActivePowerEffect({ gameState });

  const currentPlayer = getCurrentPlayer({ gameState });
  const selectedCard = currentPlayer.hand[ownCardIndex];
  if (!selectedCard) {
    throw new Error("Selected own card does not exist");
  }

  const activePowerEffect = gameState.activePowerEffect;
  if (!activePowerEffect) {
    throw new Error("No active power to resolve");
  }

  if (activePowerEffect.kind === "selfPeek") {
    if (activePowerEffect.selectedOwnCardIndex !== null || activePowerEffect.viewedCard) {
      throw new Error("Own card is already selected for self peek");
    }

    return {
      ...gameState,
      activePowerEffect: {
        ...activePowerEffect,
        selectedOwnCardIndex: ownCardIndex,
        viewedCard: selectedCard,
      },
    };
  }

  if (activePowerEffect.kind === "jackSwap") {
    return {
      ...gameState,
      activePowerEffect: {
        ...activePowerEffect,
        ownCardIndex,
      },
    };
  }

  if (activePowerEffect.kind === "queenSwap") {
    if (activePowerEffect.ownCardIndex !== null || activePowerEffect.ownViewedCard) {
      throw new Error("Own card is already selected for queen power");
    }

    return {
      ...gameState,
      activePowerEffect: {
        ...activePowerEffect,
        ownCardIndex,
        ownViewedCard: selectedCard,
      },
    };
  }

  throw new Error("Current power does not require selecting own card");
}

export function pickTargetPlayerForPower({
  gameState,
  targetPlayerId,
}: PickTargetPlayerOptions): PhaseThreeGameState {
  ensureGameInProgress({ gameState });
  ensureInitialPeekCompleted({ gameState });
  ensureNoPendingDraw({ gameState });
  ensureActivePowerEffect({ gameState });

  const currentPlayer = getCurrentPlayer({ gameState });
  if (targetPlayerId === currentPlayer.id) {
    throw new Error("Target player must be an opponent");
  }

  getPlayerById({ gameState, playerId: targetPlayerId });

  const activePowerEffect = gameState.activePowerEffect;
  if (!activePowerEffect) {
    throw new Error("No active power to resolve");
  }

  if (activePowerEffect.kind === "opponentPeek") {
    if (activePowerEffect.targetCardIndex !== null || activePowerEffect.viewedCard) {
      throw new Error("Opponent card is already selected for opponent peek");
    }

    return {
      ...gameState,
      activePowerEffect: {
        ...activePowerEffect,
        targetPlayerId,
        targetCardIndex: null,
        viewedCard: null,
      },
    };
  }

  if (activePowerEffect.kind === "jackSwap") {
    return {
      ...gameState,
      activePowerEffect: {
        ...activePowerEffect,
        targetPlayerId,
        targetCardIndex: null,
      },
    };
  }

  if (activePowerEffect.kind === "queenSwap") {
    if (activePowerEffect.targetCardIndex !== null || activePowerEffect.targetViewedCard) {
      throw new Error("Target card is already selected for queen power");
    }

    return {
      ...gameState,
      activePowerEffect: {
        ...activePowerEffect,
        targetPlayerId,
        targetCardIndex: null,
        targetViewedCard: null,
      },
    };
  }

  throw new Error("Current power does not require selecting target player");
}

export function pickTargetCardForPower({
  gameState,
  targetCardIndex,
}: PickTargetCardOptions): PhaseThreeGameState {
  ensureGameInProgress({ gameState });
  ensureInitialPeekCompleted({ gameState });
  ensureNoPendingDraw({ gameState });
  ensureActivePowerEffect({ gameState });

  const activePowerEffect = gameState.activePowerEffect;
  if (!activePowerEffect) {
    throw new Error("No active power to resolve");
  }

  if (activePowerEffect.kind === "opponentPeek") {
    if (!activePowerEffect.targetPlayerId) {
      throw new Error("Select a target player first");
    }
    if (activePowerEffect.targetCardIndex !== null || activePowerEffect.viewedCard) {
      throw new Error("Opponent card is already selected for opponent peek");
    }
    const targetPlayer = getPlayerById({
      gameState,
      playerId: activePowerEffect.targetPlayerId,
    });
    const targetCard = targetPlayer.hand[targetCardIndex];
    if (!targetCard) {
      throw new Error("Selected target card does not exist");
    }
    return {
      ...gameState,
      activePowerEffect: {
        ...activePowerEffect,
        targetCardIndex,
        viewedCard: targetCard,
      },
    };
  }

  if (activePowerEffect.kind === "jackSwap") {
    if (!activePowerEffect.targetPlayerId) {
      throw new Error("Select a target player first");
    }
    const targetPlayer = getPlayerById({
      gameState,
      playerId: activePowerEffect.targetPlayerId,
    });
    const targetCard = targetPlayer.hand[targetCardIndex];
    if (!targetCard) {
      throw new Error("Selected target card does not exist");
    }
    return {
      ...gameState,
      activePowerEffect: {
        ...activePowerEffect,
        targetCardIndex,
      },
    };
  }

  if (activePowerEffect.kind === "queenSwap") {
    if (!activePowerEffect.targetPlayerId) {
      throw new Error("Select a target player first");
    }
    if (activePowerEffect.targetCardIndex !== null || activePowerEffect.targetViewedCard) {
      throw new Error("Target card is already selected for queen power");
    }
    const targetPlayer = getPlayerById({
      gameState,
      playerId: activePowerEffect.targetPlayerId,
    });
    const targetCard = targetPlayer.hand[targetCardIndex];
    if (!targetCard) {
      throw new Error("Selected target card does not exist");
    }
    return {
      ...gameState,
      activePowerEffect: {
        ...activePowerEffect,
        targetCardIndex,
        targetViewedCard: targetCard,
      },
    };
  }

  throw new Error("Current power does not require selecting target card");
}

export function completePeekPower({
  gameState,
}: {
  gameState: PhaseThreeGameState;
}): PhaseThreeGameState {
  ensureGameInProgress({ gameState });
  ensureInitialPeekCompleted({ gameState });
  ensureNoPendingDraw({ gameState });
  ensureActivePowerEffect({ gameState });

  const activePowerEffect = gameState.activePowerEffect;
  if (!activePowerEffect) {
    throw new Error("No active power to resolve");
  }

  if (activePowerEffect.kind === "selfPeek") {
    if (activePowerEffect.selectedOwnCardIndex === null || !activePowerEffect.viewedCard) {
      throw new Error("Select one of your cards first");
    }
  } else if (activePowerEffect.kind === "opponentPeek") {
    if (
      !activePowerEffect.targetPlayerId ||
      activePowerEffect.targetCardIndex === null ||
      !activePowerEffect.viewedCard
    ) {
      throw new Error("Select an opponent card first");
    }
  } else {
    throw new Error("Current power cannot be completed this way");
  }

  return advanceAfterResolvedTurn({
    gameState: {
      ...gameState,
      activePowerEffect: null,
    },
  });
}

export function applyJackSwapPower({
  gameState,
}: {
  gameState: PhaseThreeGameState;
}): PhaseThreeGameState {
  ensureGameInProgress({ gameState });
  ensureInitialPeekCompleted({ gameState });
  ensureNoPendingDraw({ gameState });
  ensureActivePowerEffect({ gameState });

  const activePowerEffect = gameState.activePowerEffect;
  if (!activePowerEffect || activePowerEffect.kind !== "jackSwap") {
    throw new Error("No active jack power");
  }

  if (
    activePowerEffect.ownCardIndex === null ||
    !activePowerEffect.targetPlayerId ||
    activePowerEffect.targetCardIndex === null
  ) {
    throw new Error("Select your card and target card first");
  }

  const swappedState = applyCardSwap({
    gameState,
    ownCardIndex: activePowerEffect.ownCardIndex,
    targetPlayerId: activePowerEffect.targetPlayerId,
    targetCardIndex: activePowerEffect.targetCardIndex,
  });

  return advanceAfterResolvedTurn({
    gameState: {
      ...swappedState,
      activePowerEffect: null,
    },
  });
}

export function skipJackSwapPower({
  gameState,
}: {
  gameState: PhaseThreeGameState;
}): PhaseThreeGameState {
  ensureGameInProgress({ gameState });
  ensureInitialPeekCompleted({ gameState });
  ensureNoPendingDraw({ gameState });
  ensureActivePowerEffect({ gameState });

  const activePowerEffect = gameState.activePowerEffect;
  if (!activePowerEffect || activePowerEffect.kind !== "jackSwap") {
    throw new Error("No active jack power");
  }

  return advanceAfterResolvedTurn({
    gameState: {
      ...gameState,
      activePowerEffect: null,
    },
  });
}

export function applyQueenSwapPower({
  gameState,
  shouldSwap,
}: {
  gameState: PhaseThreeGameState;
  shouldSwap: boolean;
}): PhaseThreeGameState {
  ensureGameInProgress({ gameState });
  ensureInitialPeekCompleted({ gameState });
  ensureNoPendingDraw({ gameState });
  ensureActivePowerEffect({ gameState });

  const activePowerEffect = gameState.activePowerEffect;
  if (!activePowerEffect || activePowerEffect.kind !== "queenSwap") {
    throw new Error("No active queen power");
  }

  if (
    activePowerEffect.ownCardIndex === null ||
    !activePowerEffect.ownViewedCard ||
    !activePowerEffect.targetPlayerId ||
    activePowerEffect.targetCardIndex === null ||
    !activePowerEffect.targetViewedCard
  ) {
    throw new Error("Select both cards first");
  }

  const resolvedState = shouldSwap
    ? applyCardSwap({
        gameState,
        ownCardIndex: activePowerEffect.ownCardIndex,
        targetPlayerId: activePowerEffect.targetPlayerId,
        targetCardIndex: activePowerEffect.targetCardIndex,
      })
    : gameState;

  return advanceAfterResolvedTurn({
    gameState: {
      ...resolvedState,
      activePowerEffect: null,
    },
  });
}

export function getCurrentPlayerName({
  gameState,
}: {
  gameState: PhaseThreeGameState;
}) {
  return getCurrentPlayer({ gameState }).name;
}

export function isGameFinished({
  gameState,
}: {
  gameState: PhaseThreeGameState;
}) {
  return gameState.finalScores !== null;
}

export function canDrawCard({
  gameState,
}: {
  gameState: PhaseThreeGameState;
}) {
  if (
    isGameFinished({ gameState }) ||
    gameState.initialPeek !== null ||
    gameState.pendingDraw !== null ||
    gameState.activePowerEffect !== null
  ) {
    return false;
  }

  return gameState.drawPile.length > 0 || gameState.discardPile.length > 1;
}

export function canTakeDiscard({
  gameState,
}: {
  gameState: PhaseThreeGameState;
}) {
  if (
    isGameFinished({ gameState }) ||
    gameState.initialPeek !== null ||
    gameState.pendingDraw !== null ||
    gameState.activePowerEffect !== null
  ) {
    return false;
  }

  return gameState.discardPile.length > 0;
}

export function canAnnounceCabo({
  gameState,
}: {
  gameState: PhaseThreeGameState;
}) {
  if (isGameFinished({ gameState })) {
    return false;
  }

  return (
    gameState.initialPeek === null &&
    gameState.pendingDraw === null &&
    gameState.activePowerEffect === null &&
    gameState.lastRound === null
  );
}

export function getPlayerTotalPoints({
  player,
}: {
  player: CaboPlayer;
}) {
  return player.hand.reduce((totalPoints, card) => totalPoints + getCardPoints({ card }), 0);
}
