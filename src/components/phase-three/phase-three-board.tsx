"use client";

import { useMemo, useState } from "react";

import PlayingCard from "@/components/game/playing-card";
import { getCardLabel, getCardPoints } from "@/lib/deck";
import {
  announceCabo,
  applyJackSwapPower,
  applyQueenSwapPower,
  canAnnounceCabo,
  canDrawCard,
  canTakeDiscard,
  completeInitialPeek,
  completePeekPower,
  createPhaseThreeGame,
  discardPendingDraw,
  drawFromSource,
  getCurrentPlayerName,
  getInitialPeekCards,
  getPlayerTotalPoints,
  isGameFinished,
  pickOwnCardForPower,
  pickTargetCardForPower,
  pickTargetPlayerForPower,
  replaceWithPendingDraw,
  skipJackSwapPower,
} from "@/lib/phase-three";
import type { CaboPlayer, PhaseThreeGameState } from "@/lib/types";

const PLAYER_OPTIONS = [2, 3, 4];

type PlayerSeatProps = {
  player: CaboPlayer;
  isCurrentPlayer: boolean;
  revealCards: boolean;
  selectedCardIndex?: number | null;
  onSelectCard?: (cardIndex: number) => void;
  pointsLabel?: string;
};

function PlayerSeat({
  player,
  isCurrentPlayer,
  revealCards,
  selectedCardIndex = null,
  onSelectCard,
  pointsLabel,
}: PlayerSeatProps) {
  return (
    <article
      className={`rounded-xl border p-3 ${
        isCurrentPlayer
          ? "border-amber-300/70 bg-amber-950/30"
          : "border-emerald-200/20 bg-emerald-950/30"
      }`}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-emerald-50">{player.name}</p>
        <p className="text-[11px] text-emerald-100/70">{pointsLabel ?? `${player.hand.length} cartes`}</p>
      </div>
      <div className="mx-auto grid w-fit grid-cols-2 gap-1.5">
        {player.hand.map((card, cardIndex) => (
          <div key={card.id} className={cardIndex < 2 ? "opacity-90" : ""}>
            <PlayingCard
              card={card}
              isFaceUp={revealCards}
              size="xs"
              isSelectable={Boolean(onSelectCard)}
              isSelected={selectedCardIndex === cardIndex}
              onClick={onSelectCard ? () => onSelectCard(cardIndex) : undefined}
            />
          </div>
        ))}
      </div>
    </article>
  );
}

function getStatusLabel({ gameState }: { gameState: PhaseThreeGameState }) {
  if (gameState.finalScores) {
    return "Fin de partie";
  }

  if (gameState.initialPeek) {
    return "Vision initiale";
  }

  if (gameState.activePowerEffect) {
    return "Pouvoir actif";
  }

  if (gameState.pendingDraw) {
    return "Carte piochée à résoudre";
  }

  if (gameState.lastRound) {
    return `Dernier tour (${gameState.lastRound.remainingTurns})`;
  }

  return "Tour normal";
}

function getWinnerNames({ gameState }: { gameState: PhaseThreeGameState }) {
  return gameState.players
    .filter((player) => gameState.winnerPlayerIds.includes(player.id))
    .map((player) => player.name);
}

function getSelectedOwnCardIndex({
  gameState,
}: {
  gameState: PhaseThreeGameState;
}) {
  const activePowerEffect = gameState.activePowerEffect;
  if (!activePowerEffect) {
    return null;
  }

  if (activePowerEffect.kind === "jackSwap" || activePowerEffect.kind === "queenSwap") {
    return activePowerEffect.ownCardIndex;
  }

  if (activePowerEffect.kind === "selfPeek") {
    return activePowerEffect.selectedOwnCardIndex;
  }

  return null;
}

function getSelectedTargetCardIndex({
  gameState,
}: {
  gameState: PhaseThreeGameState;
}) {
  const activePowerEffect = gameState.activePowerEffect;
  if (!activePowerEffect || activePowerEffect.kind === "selfPeek") {
    return null;
  }

  return activePowerEffect.targetCardIndex;
}

function getTargetPlayerForPower({
  gameState,
}: {
  gameState: PhaseThreeGameState;
}) {
  const activePowerEffect = gameState.activePowerEffect;
  if (
    !activePowerEffect ||
    activePowerEffect.kind === "selfPeek" ||
    !activePowerEffect.targetPlayerId
  ) {
    return null;
  }

  return (
    gameState.players.find((player) => player.id === activePowerEffect.targetPlayerId) ?? null
  );
}

function getOpponentPlayers({
  gameState,
  currentPlayerId,
}: {
  gameState: PhaseThreeGameState;
  currentPlayerId: string;
}) {
  return gameState.players.filter((player) => player.id !== currentPlayerId);
}

type PhaseThreeBoardProps = {
  initialSeed: number;
};

function createSeededRandomizer({ seed }: { seed: number }) {
  let state = (seed >>> 0) || 1;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createInitialGameState({ initialSeed }: { initialSeed: number }) {
  return createPhaseThreeGame({
    playerCount: 4,
    randomizer: createSeededRandomizer({ seed: initialSeed }),
  });
}

export default function PhaseThreeBoard({ initialSeed }: PhaseThreeBoardProps) {
  const [playerCount, setPlayerCount] = useState(4);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [gameState, setGameState] = useState<PhaseThreeGameState>(() =>
    createInitialGameState({ initialSeed }),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [revealedInitialPeekPlayerId, setRevealedInitialPeekPlayerId] = useState<string | null>(
    null,
  );
  const [visibleTurnKey, setVisibleTurnKey] = useState<string | null>(null);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isFinished = isGameFinished({ gameState });
  const winnerNames = useMemo(() => getWinnerNames({ gameState }), [gameState]);

  function applyGameUpdate({
    updateGameState,
  }: {
    updateGameState: (currentState: PhaseThreeGameState) => PhaseThreeGameState;
  }) {
    try {
      setGameState((currentState) => updateGameState(currentState));
      setErrorMessage(null);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage("Action impossible pour le moment");
    }
  }

  function handleNewGame() {
    setErrorMessage(null);
    setRevealedInitialPeekPlayerId(null);
    setVisibleTurnKey(null);
    setIsGameStarted(false);
  }

  function handleStartGame() {
    setGameState(createPhaseThreeGame({ playerCount }));
    setErrorMessage(null);
    setRevealedInitialPeekPlayerId(null);
    setVisibleTurnKey(null);
    setIsGameStarted(true);
  }

  if (!currentPlayer) {
    return null;
  }

  const topDiscardCard = gameState.discardPile.at(-1) ?? null;
  const initialPeekCards = gameState.initialPeek ? getInitialPeekCards({ gameState }) : [];
  const initialPeekPlayerName =
    gameState.players.find((player) => player.id === gameState.initialPeek?.activePlayerId)?.name ??
    "";
  const isInitialPeekRevealed =
    gameState.initialPeek !== null &&
    revealedInitialPeekPlayerId === gameState.initialPeek.activePlayerId;
  const currentTurnKey = `${currentPlayer.id}-${gameState.turnSequence}`;
  const isTurnVisible = isFinished || visibleTurnKey === currentTurnKey;
  const activePowerEffect = gameState.activePowerEffect;
  const targetPlayerForPower = getTargetPlayerForPower({ gameState });
  const selectedOwnCardIndex = getSelectedOwnCardIndex({ gameState });
  const selectedTargetCardIndex = getSelectedTargetCardIndex({ gameState });
  const opponentPlayers = getOpponentPlayers({
    gameState,
    currentPlayerId: currentPlayer.id,
  });
  const scoreboard = isFinished ? gameState.finalScores?.slice().sort((a, b) => a.points - b.points) : null;
  const overlayVisible =
    !isGameStarted || gameState.initialPeek !== null || (!isFinished && !isTurnVisible);

  function getSeatCardSelector({ player }: { player: CaboPlayer }) {
    if (gameState.pendingDraw && player.id === currentPlayer.id) {
      return (cardIndex: number) =>
        applyGameUpdate({
          updateGameState: (currentState) =>
            replaceWithPendingDraw({
              gameState: currentState,
              handCardIndex: cardIndex,
            }),
        });
    }

    if (!activePowerEffect) {
      return undefined;
    }

    if (
      player.id === currentPlayer.id &&
      (activePowerEffect.kind === "selfPeek" ||
        activePowerEffect.kind === "jackSwap" ||
        activePowerEffect.kind === "queenSwap")
    ) {
      if (activePowerEffect.kind === "selfPeek" && activePowerEffect.viewedCard) {
        return undefined;
      }

      if (activePowerEffect.kind === "queenSwap" && activePowerEffect.ownViewedCard) {
        return undefined;
      }

      return (ownCardIndex: number) =>
        applyGameUpdate({
          updateGameState: (currentState) =>
            pickOwnCardForPower({
              gameState: currentState,
              ownCardIndex,
            }),
        });
    }

    if (
      targetPlayerForPower &&
      targetPlayerForPower.id === player.id &&
      (activePowerEffect.kind === "opponentPeek" ||
        activePowerEffect.kind === "jackSwap" ||
        activePowerEffect.kind === "queenSwap")
    ) {
      if (activePowerEffect.kind === "opponentPeek" && activePowerEffect.viewedCard) {
        return undefined;
      }

      if (activePowerEffect.kind === "queenSwap" && activePowerEffect.targetViewedCard) {
        return undefined;
      }

      return (targetCardIndex: number) =>
        applyGameUpdate({
          updateGameState: (currentState) =>
            pickTargetCardForPower({
              gameState: currentState,
              targetCardIndex,
            }),
        });
    }

    return undefined;
  }

  return (
    <section className="relative mx-auto h-[calc(100vh-1.5rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-emerald-200/20 bg-[radial-gradient(circle_at_center,_#12613f_0%,_#0b3f2d_55%,_#07261a_100%)] p-4 text-emerald-50 shadow-2xl">
      <div className="grid h-full grid-rows-[auto_1fr_auto] gap-3">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-wide">CABO TABLE</h1>
            <p className="text-xs text-emerald-100/80">{getStatusLabel({ gameState })}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-emerald-100/80">
              Joueurs: {isGameStarted ? gameState.players.length : playerCount}
            </p>
            <button
              type="button"
              className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
              onClick={handleNewGame}
            >
              Nouvelle partie
            </button>
          </div>
        </header>

        <div className="grid h-full grid-rows-[auto_1fr_auto] gap-3 overflow-hidden">
          <div className="flex flex-wrap justify-center gap-2">
            {opponentPlayers.map((player) => (
              <PlayerSeat
                key={player.id}
                player={player}
                isCurrentPlayer={false}
                revealCards={isFinished}
                selectedCardIndex={targetPlayerForPower?.id === player.id ? selectedTargetCardIndex : null}
                onSelectCard={isTurnVisible ? getSeatCardSelector({ player }) : undefined}
                pointsLabel={
                  isFinished ? `${getPlayerTotalPoints({ player })} pts` : `${player.hand.length} cartes`
                }
              />
            ))}
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-emerald-200/20 bg-emerald-950/30 p-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-emerald-100/80">
                Joueur actif: {getCurrentPlayerName({ gameState })}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-amber-300/70 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-900/60 disabled:opacity-50"
                  disabled={!isTurnVisible || !canAnnounceCabo({ gameState })}
                  onClick={() =>
                    applyGameUpdate({
                      updateGameState: (currentState) => announceCabo({ gameState: currentState }),
                    })
                  }
                >
                  Cabo
                </button>
              </div>
              {errorMessage ? (
                <p className="rounded-md border border-red-300/60 bg-red-50 px-2 py-1 text-xs text-red-700">
                  {errorMessage}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-5">
              <div className="space-y-1 text-center">
                <p className="text-xs text-emerald-100/80">Deck</p>
                <PlayingCard
                  card={gameState.drawPile.length > 0 ? gameState.drawPile[0] ?? null : null}
                  isFaceUp={false}
                  size="sm"
                  isSelectable={isTurnVisible && canDrawCard({ gameState })}
                  onClick={() =>
                    applyGameUpdate({
                      updateGameState: (currentState) =>
                        drawFromSource({ gameState: currentState, source: "drawPile" }),
                    })
                  }
                />
                <p className="text-[11px] text-emerald-100/70">{gameState.drawPile.length}</p>
              </div>
              <div className="space-y-1 text-center">
                <p className="text-xs text-emerald-100/80">Défausse</p>
                <PlayingCard
                  card={topDiscardCard}
                  isFaceUp
                  size="sm"
                  isSelectable={isTurnVisible && canTakeDiscard({ gameState })}
                  onClick={() =>
                    applyGameUpdate({
                      updateGameState: (currentState) =>
                        drawFromSource({ gameState: currentState, source: "discardPile" }),
                    })
                  }
                />
                <p className="text-[11px] text-emerald-100/70">{gameState.discardPile.length}</p>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-emerald-200/20 bg-emerald-950/40 p-2.5">
              {gameState.pendingDraw ? (
                <>
                  <p className="text-xs font-semibold">Carte piochée</p>
                  <div className="flex items-center gap-2">
                    <PlayingCard card={gameState.pendingDraw.card} isFaceUp size="sm" />
                    <div className="text-xs text-emerald-100/85">
                      <p>{getCardLabel({ card: gameState.pendingDraw.card })}</p>
                      <p>{getCardPoints({ card: gameState.pendingDraw.card })} pts</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-md border border-emerald-300/60 px-2 py-1 text-xs font-semibold hover:bg-emerald-900/60"
                    onClick={() =>
                      applyGameUpdate({
                        updateGameState: (currentState) => discardPendingDraw({ gameState: currentState }),
                      })
                    }
                  >
                    Défausser la piochée
                  </button>
                  <p className="text-[11px] text-emerald-100/70">Clique une carte de ta main pour remplacer</p>
                </>
              ) : null}

              {activePowerEffect ? (
                <div className="space-y-2 text-xs">
                  <p className="font-semibold">Pouvoir actif</p>
                  {activePowerEffect.kind === "selfPeek" ? (
                    <>
                      <p>7/8: clique une carte de ta main.</p>
                      {activePowerEffect.viewedCard ? (
                        <PlayingCard card={activePowerEffect.viewedCard} isFaceUp size="sm" />
                      ) : null}
                      <button
                        type="button"
                        className="rounded-md border border-indigo-300/60 px-2 py-1 font-semibold hover:bg-indigo-900/60"
                        onClick={() =>
                          applyGameUpdate({
                            updateGameState: (currentState) => completePeekPower({ gameState: currentState }),
                          })
                        }
                      >
                        Terminer
                      </button>
                    </>
                  ) : null}

                  {activePowerEffect.kind === "opponentPeek" ? (
                    <>
                      <p>9/10: choisis un adversaire puis clique sa carte.</p>
                      <div className="flex flex-wrap gap-1.5">
                        {opponentPlayers.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            className="rounded-md border border-indigo-300/60 px-2 py-1 font-semibold hover:bg-indigo-900/60 disabled:opacity-50"
                            disabled={Boolean(activePowerEffect.viewedCard)}
                            onClick={() =>
                              applyGameUpdate({
                                updateGameState: (currentState) =>
                                  pickTargetPlayerForPower({
                                    gameState: currentState,
                                    targetPlayerId: player.id,
                                  }),
                              })
                            }
                          >
                            {player.name}
                          </button>
                        ))}
                      </div>
                      {activePowerEffect.viewedCard ? (
                        <PlayingCard card={activePowerEffect.viewedCard} isFaceUp size="sm" />
                      ) : null}
                      <button
                        type="button"
                        className="rounded-md border border-indigo-300/60 px-2 py-1 font-semibold hover:bg-indigo-900/60"
                        onClick={() =>
                          applyGameUpdate({
                            updateGameState: (currentState) => completePeekPower({ gameState: currentState }),
                          })
                        }
                      >
                        Terminer
                      </button>
                    </>
                  ) : null}

                  {activePowerEffect.kind === "jackSwap" ? (
                    <>
                      <p>Valet: clique ta carte, choisis un adversaire, clique sa carte.</p>
                      <div className="flex flex-wrap gap-1.5">
                        {opponentPlayers.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            className="rounded-md border border-indigo-300/60 px-2 py-1 font-semibold hover:bg-indigo-900/60"
                            onClick={() =>
                              applyGameUpdate({
                                updateGameState: (currentState) =>
                                  pickTargetPlayerForPower({
                                    gameState: currentState,
                                    targetPlayerId: player.id,
                                  }),
                              })
                            }
                          >
                            {player.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          className="rounded-md border border-indigo-300/60 px-2 py-1 font-semibold hover:bg-indigo-900/60"
                          onClick={() =>
                            applyGameUpdate({
                              updateGameState: (currentState) => applyJackSwapPower({ gameState: currentState }),
                            })
                          }
                        >
                          Confirmer
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-indigo-300/60 px-2 py-1 font-semibold hover:bg-indigo-900/60"
                          onClick={() =>
                            applyGameUpdate({
                              updateGameState: (currentState) => skipJackSwapPower({ gameState: currentState }),
                            })
                          }
                        >
                          Ignorer
                        </button>
                      </div>
                    </>
                  ) : null}

                  {activePowerEffect.kind === "queenSwap" ? (
                    <>
                      <p>Dame: clique ta carte, choisis un adversaire, clique sa carte.</p>
                      <div className="flex flex-wrap gap-1.5">
                        {opponentPlayers.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            className="rounded-md border border-indigo-300/60 px-2 py-1 font-semibold hover:bg-indigo-900/60 disabled:opacity-50"
                            disabled={Boolean(activePowerEffect.targetViewedCard)}
                            onClick={() =>
                              applyGameUpdate({
                                updateGameState: (currentState) =>
                                  pickTargetPlayerForPower({
                                    gameState: currentState,
                                    targetPlayerId: player.id,
                                  }),
                              })
                            }
                          >
                            {player.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        {activePowerEffect.ownViewedCard ? (
                          <PlayingCard card={activePowerEffect.ownViewedCard} isFaceUp size="xs" />
                        ) : null}
                        {activePowerEffect.targetViewedCard ? (
                          <PlayingCard card={activePowerEffect.targetViewedCard} isFaceUp size="xs" />
                        ) : null}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          className="rounded-md border border-indigo-300/60 px-2 py-1 font-semibold hover:bg-indigo-900/60"
                          onClick={() =>
                            applyGameUpdate({
                              updateGameState: (currentState) =>
                                applyQueenSwapPower({ gameState: currentState, shouldSwap: true }),
                            })
                          }
                        >
                          Échanger
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-indigo-300/60 px-2 py-1 font-semibold hover:bg-indigo-900/60"
                          onClick={() =>
                            applyGameUpdate({
                              updateGameState: (currentState) =>
                                applyQueenSwapPower({ gameState: currentState, shouldSwap: false }),
                            })
                          }
                        >
                          Garder
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}

              {!gameState.pendingDraw && !activePowerEffect ? (
                <p className="text-xs text-emerald-100/70">Main en carré: 2 derrière, 2 devant.</p>
              ) : null}
            </div>
          </div>

          <PlayerSeat
            player={currentPlayer}
            isCurrentPlayer
            revealCards={isFinished}
            selectedCardIndex={selectedOwnCardIndex}
            onSelectCard={isTurnVisible ? getSeatCardSelector({ player: currentPlayer }) : undefined}
            pointsLabel={
              isFinished
                ? `${getPlayerTotalPoints({ player: currentPlayer })} pts`
                : `${currentPlayer.hand.length} cartes`
            }
          />
        </div>
      </div>

      {overlayVisible ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55">
          {!isGameStarted ? (
            <div className="w-full max-w-sm space-y-3 rounded-2xl border border-emerald-200/40 bg-emerald-950/95 p-5 text-center">
              <h2 className="text-lg font-semibold">Nouvelle partie</h2>
              <p className="text-sm text-emerald-100">Choisis le nombre de joueurs avant de lancer.</p>
              <label className="mx-auto flex w-fit items-center gap-2 text-sm">
                <span>Joueurs</span>
                <select
                  className="rounded-md border border-emerald-200/30 bg-emerald-900/70 px-3 py-1.5"
                  value={playerCount}
                  onChange={(event) => setPlayerCount(Number(event.target.value))}
                >
                  {PLAYER_OPTIONS.map((value) => (
                    <option key={value} value={value} className="text-black">
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
                onClick={handleStartGame}
              >
                Lancer la partie
              </button>
            </div>
          ) : gameState.initialPeek ? (
            <div className="w-full max-w-md space-y-3 rounded-2xl border border-sky-200/40 bg-sky-950/95 p-5 text-center">
              <h2 className="text-lg font-semibold">Vision initiale</h2>
              <p className="text-sm text-sky-100">Passe l écran à {initialPeekPlayerName}</p>
              {!isInitialPeekRevealed ? (
                <button
                  type="button"
                  className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-300"
                  onClick={() => setRevealedInitialPeekPlayerId(gameState.initialPeek?.activePlayerId ?? null)}
                >
                  Voir mes 2 cartes
                </button>
              ) : (
                <>
                  <div className="flex justify-center gap-2">
                    {initialPeekCards.map((card) => (
                      <PlayingCard key={card.id} card={card} isFaceUp size="sm" />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-sky-900 hover:bg-sky-100"
                    onClick={() =>
                      applyGameUpdate({
                        updateGameState: (currentState) => completeInitialPeek({ gameState: currentState }),
                      })
                    }
                  >
                    Terminer
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="w-full max-w-sm space-y-3 rounded-2xl border border-amber-200/40 bg-amber-950/95 p-5 text-center">
              <h2 className="text-lg font-semibold">Passation</h2>
              <p className="text-sm text-amber-100">Passe l écran à {currentPlayer.name}</p>
              <button
                type="button"
                className="rounded-md bg-amber-300 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-200"
                onClick={() => setVisibleTurnKey(currentTurnKey)}
              >
                Commencer le tour
              </button>
            </div>
          )}
        </div>
      ) : null}

      {isFinished && scoreboard ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45">
          <div className="w-full max-w-sm space-y-2 rounded-2xl border border-emerald-200/50 bg-emerald-50 p-5 text-emerald-900">
            <h2 className="text-lg font-semibold">Résultat</h2>
            <p className="text-sm">Gagnant(s): {winnerNames.join(", ")}</p>
            <div className="space-y-1 text-sm">
              {scoreboard.map((score) => (
                <p key={score.playerId}>
                  {score.playerName}: <span className="font-semibold">{score.points}</span> pts
                </p>
              ))}
            </div>
            <button
              type="button"
              className="mt-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              onClick={handleNewGame}
            >
              Nouvelle partie
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
