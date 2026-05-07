"use client";

import { useMemo, useState } from "react";

import { getCardLabel, getCardPoints } from "@/lib/deck";
import {
  announceCabo,
  applyJackSwapPower,
  applyQueenSwapPower,
  canAnnounceCabo,
  canDrawCard,
  canTakeDiscard,
  completePeekPower,
  createPhaseThreeGame,
  discardPendingDraw,
  drawFromSource,
  getCurrentPlayerName,
  getPlayerTotalPoints,
  isGameFinished,
  pickOwnCardForPower,
  pickTargetCardForPower,
  pickTargetPlayerForPower,
  replaceWithPendingDraw,
} from "@/lib/phase-three";
import type { CaboPlayer, PhaseThreeGameState } from "@/lib/types";

const PLAYER_OPTIONS = [2, 3, 4];

function getTopDiscardLabel({ gameState }: { gameState: PhaseThreeGameState }) {
  const topDiscardCard = gameState.discardPile.at(-1);
  return topDiscardCard ? getCardLabel({ card: topDiscardCard }) : "Aucune";
}

function getStatusLabel({ gameState }: { gameState: PhaseThreeGameState }) {
  if (gameState.finalScores) {
    return "Partie terminee";
  }

  if (gameState.lastRound) {
    return `Dernier tour (${gameState.lastRound.remainingTurns} tour(s) restant(s))`;
  }

  if (gameState.activePowerEffect) {
    return "Pouvoir actif en cours";
  }

  return "Partie en cours";
}

function getWinnerNames({ gameState }: { gameState: PhaseThreeGameState }) {
  return gameState.players
    .filter((player) => gameState.winnerPlayerIds.includes(player.id))
    .map((player) => player.name);
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

function getTargetPlayerForPower({
  gameState,
}: {
  gameState: PhaseThreeGameState;
}): CaboPlayer | null {
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

export default function PhaseThreeBoard() {
  const [playerCount, setPlayerCount] = useState(4);
  const [gameState, setGameState] = useState<PhaseThreeGameState>(() =>
    createPhaseThreeGame({ playerCount: 4 }),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const winnerNames = useMemo(() => getWinnerNames({ gameState }), [gameState]);
  const isFinished = isGameFinished({ gameState });
  const targetPlayerForPower = getTargetPlayerForPower({ gameState });

  function applyGameUpdate({
    updateGameState,
  }: {
    updateGameState: (currentState: PhaseThreeGameState) => PhaseThreeGameState;
  }) {
    try {
      setGameState((currentState) => updateGameState(currentState));
      setErrorMessage(null);
    } catch (error) {
      const fallbackMessage = "Action impossible pour le moment";
      if (error instanceof Error) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage(fallbackMessage);
    }
  }

  function handleNewGame() {
    setGameState(createPhaseThreeGame({ playerCount }));
    setErrorMessage(null);
  }

  if (!currentPlayer) {
    return null;
  }

  const opponentPlayers = getOpponentPlayers({
    gameState,
    currentPlayerId: currentPlayer.id,
  });

  return (
    <section className="w-full max-w-6xl space-y-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Cabo - Phase 3</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Tour par tour + pouvoirs des cartes (7/8, 9/10, Valet, Dame) sur defausse de pioche.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Joueurs
          <select
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
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
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          onClick={handleNewGame}
        >
          Nouvelle partie
        </button>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-lg border border-black/10 p-3 dark:border-white/15">
          <p className="text-zinc-600 dark:text-zinc-300">Etat</p>
          <p className="font-medium">{getStatusLabel({ gameState })}</p>
        </div>
        <div className="rounded-lg border border-black/10 p-3 dark:border-white/15">
          <p className="text-zinc-600 dark:text-zinc-300">Joueur actif</p>
          <p className="font-medium">{getCurrentPlayerName({ gameState })}</p>
        </div>
        <div className="rounded-lg border border-black/10 p-3 dark:border-white/15">
          <p className="text-zinc-600 dark:text-zinc-300">Deck restant</p>
          <p className="text-xl font-semibold">{gameState.drawPile.length}</p>
        </div>
        <div className="rounded-lg border border-black/10 p-3 dark:border-white/15">
          <p className="text-zinc-600 dark:text-zinc-300">Defausse (top)</p>
          <p className="font-medium">{getTopDiscardLabel({ gameState })}</p>
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {!isFinished ? (
        <div className="space-y-4 rounded-xl border border-black/10 p-4 dark:border-white/15">
          <h2 className="text-lg font-semibold">Actions du tour</h2>

          {!gameState.pendingDraw && !gameState.activePowerEffect ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                onClick={() =>
                  applyGameUpdate({
                    updateGameState: (currentState) =>
                      drawFromSource({ gameState: currentState, source: "drawPile" }),
                  })
                }
                disabled={!canDrawCard({ gameState })}
              >
                Piocher deck
              </button>
              <button
                type="button"
                className="rounded-md border border-black/20 px-4 py-2 text-sm font-medium transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
                onClick={() =>
                  applyGameUpdate({
                    updateGameState: (currentState) =>
                      drawFromSource({ gameState: currentState, source: "discardPile" }),
                  })
                }
                disabled={!canTakeDiscard({ gameState })}
              >
                Prendre defausse
              </button>
              <button
                type="button"
                className="rounded-md border border-emerald-400 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                onClick={() =>
                  applyGameUpdate({
                    updateGameState: (currentState) => announceCabo({ gameState: currentState }),
                  })
                }
                disabled={!canAnnounceCabo({ gameState })}
              >
                Annoncer Cabo
              </button>
            </div>
          ) : null}

          {gameState.pendingDraw ? (
            <div className="space-y-3">
              <p className="text-sm">
                Carte piochée:{" "}
                <span className="font-medium">
                  {getCardLabel({ card: gameState.pendingDraw.card })}
                </span>{" "}
                ({getCardPoints({ card: gameState.pendingDraw.card })} pts)
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-md border border-black/20 px-4 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                  onClick={() =>
                    applyGameUpdate({
                      updateGameState: (currentState) =>
                        discardPendingDraw({ gameState: currentState }),
                    })
                  }
                >
                  Defausser la carte piochee
                </button>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Ou remplace une carte de ta main:
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {currentPlayer.hand.map((card, cardIndex) => (
                  <button
                    key={card.id}
                    type="button"
                    className="rounded-md border border-black/15 px-3 py-2 text-left text-sm transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                    onClick={() =>
                      applyGameUpdate({
                        updateGameState: (currentState) =>
                          replaceWithPendingDraw({
                            gameState: currentState,
                            handCardIndex: cardIndex,
                          }),
                      })
                    }
                  >
                    {getCardLabel({ card })} ({getCardPoints({ card })} pts)
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {gameState.activePowerEffect ? (
            <div className="space-y-4 rounded-lg border border-indigo-300 bg-indigo-50 p-4 dark:border-indigo-700 dark:bg-indigo-950/30">
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-200">
                Resolution du pouvoir
              </h3>

              {gameState.activePowerEffect.kind === "selfPeek" ? (
                <div className="space-y-3">
                  <p className="text-sm text-indigo-900 dark:text-indigo-100">
                    Pouvoir 7/8: regarde une de tes cartes.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {currentPlayer.hand.map((card, cardIndex) => (
                      <button
                        key={card.id}
                        type="button"
                        className="rounded-md border border-indigo-300 px-3 py-2 text-left text-sm hover:bg-indigo-100 dark:border-indigo-600 dark:hover:bg-indigo-900/40"
                        onClick={() =>
                          applyGameUpdate({
                            updateGameState: (currentState) =>
                              pickOwnCardForPower({
                                gameState: currentState,
                                ownCardIndex: cardIndex,
                              }),
                          })
                        }
                      >
                        Carte {cardIndex + 1}
                      </button>
                    ))}
                  </div>
                  {gameState.activePowerEffect.viewedCard ? (
                    <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                      Carte vue: {getCardLabel({ card: gameState.activePowerEffect.viewedCard })}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
                    onClick={() =>
                      applyGameUpdate({
                        updateGameState: (currentState) =>
                          completePeekPower({ gameState: currentState }),
                      })
                    }
                  >
                    Terminer le pouvoir
                  </button>
                </div>
              ) : null}

              {gameState.activePowerEffect.kind === "opponentPeek" ? (
                <div className="space-y-3">
                  <p className="text-sm text-indigo-900 dark:text-indigo-100">
                    Pouvoir 9/10: regarde une carte adverse.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {opponentPlayers.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        className="rounded-md border border-indigo-300 px-3 py-2 text-sm hover:bg-indigo-100 dark:border-indigo-600 dark:hover:bg-indigo-900/40"
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
                  {targetPlayerForPower ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {targetPlayerForPower.hand.map((card, cardIndex) => (
                        <button
                          key={card.id}
                          type="button"
                          className="rounded-md border border-indigo-300 px-3 py-2 text-left text-sm hover:bg-indigo-100 dark:border-indigo-600 dark:hover:bg-indigo-900/40"
                          onClick={() =>
                            applyGameUpdate({
                              updateGameState: (currentState) =>
                                pickTargetCardForPower({
                                  gameState: currentState,
                                  targetCardIndex: cardIndex,
                                }),
                            })
                          }
                        >
                          Carte {cardIndex + 1}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {gameState.activePowerEffect.viewedCard ? (
                    <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                      Carte vue: {getCardLabel({ card: gameState.activePowerEffect.viewedCard })}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
                    onClick={() =>
                      applyGameUpdate({
                        updateGameState: (currentState) =>
                          completePeekPower({ gameState: currentState }),
                      })
                    }
                  >
                    Terminer le pouvoir
                  </button>
                </div>
              ) : null}

              {gameState.activePowerEffect.kind === "jackSwap" ? (
                <div className="space-y-3">
                  <p className="text-sm text-indigo-900 dark:text-indigo-100">
                    Pouvoir Valet: echange a l aveugle une de tes cartes avec une carte adverse.
                  </p>
                  <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                    1) Choisis ta carte
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {currentPlayer.hand.map((card, cardIndex) => (
                      <button
                        key={card.id}
                        type="button"
                        className="rounded-md border border-indigo-300 px-3 py-2 text-left text-sm hover:bg-indigo-100 dark:border-indigo-600 dark:hover:bg-indigo-900/40"
                        onClick={() =>
                          applyGameUpdate({
                            updateGameState: (currentState) =>
                              pickOwnCardForPower({
                                gameState: currentState,
                                ownCardIndex: cardIndex,
                              }),
                          })
                        }
                      >
                        Carte {cardIndex + 1}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                    2) Choisis un adversaire
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {opponentPlayers.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        className="rounded-md border border-indigo-300 px-3 py-2 text-sm hover:bg-indigo-100 dark:border-indigo-600 dark:hover:bg-indigo-900/40"
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
                  {targetPlayerForPower ? (
                    <>
                      <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                        3) Choisis sa carte
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {targetPlayerForPower.hand.map((card, cardIndex) => (
                          <button
                            key={card.id}
                            type="button"
                            className="rounded-md border border-indigo-300 px-3 py-2 text-left text-sm hover:bg-indigo-100 dark:border-indigo-600 dark:hover:bg-indigo-900/40"
                            onClick={() =>
                              applyGameUpdate({
                                updateGameState: (currentState) =>
                                  pickTargetCardForPower({
                                    gameState: currentState,
                                    targetCardIndex: cardIndex,
                                  }),
                              })
                            }
                          >
                            Carte {cardIndex + 1}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
                    onClick={() =>
                      applyGameUpdate({
                        updateGameState: (currentState) =>
                          applyJackSwapPower({ gameState: currentState }),
                      })
                    }
                  >
                    Confirmer l echange
                  </button>
                </div>
              ) : null}

              {gameState.activePowerEffect.kind === "queenSwap" ? (
                <div className="space-y-3">
                  <p className="text-sm text-indigo-900 dark:text-indigo-100">
                    Pouvoir Dame: regarde ta carte, regarde une carte adverse, puis echange si tu
                    veux.
                  </p>
                  <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                    1) Choisis ta carte
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {currentPlayer.hand.map((card, cardIndex) => (
                      <button
                        key={card.id}
                        type="button"
                        className="rounded-md border border-indigo-300 px-3 py-2 text-left text-sm hover:bg-indigo-100 dark:border-indigo-600 dark:hover:bg-indigo-900/40"
                        onClick={() =>
                          applyGameUpdate({
                            updateGameState: (currentState) =>
                              pickOwnCardForPower({
                                gameState: currentState,
                                ownCardIndex: cardIndex,
                              }),
                          })
                        }
                      >
                        Carte {cardIndex + 1}
                      </button>
                    ))}
                  </div>
                  {gameState.activePowerEffect.ownViewedCard ? (
                    <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                      Ta carte vue:{" "}
                      {getCardLabel({ card: gameState.activePowerEffect.ownViewedCard })}
                    </p>
                  ) : null}
                  <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                    2) Choisis un adversaire
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {opponentPlayers.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        className="rounded-md border border-indigo-300 px-3 py-2 text-sm hover:bg-indigo-100 dark:border-indigo-600 dark:hover:bg-indigo-900/40"
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
                  {targetPlayerForPower ? (
                    <>
                      <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                        3) Choisis sa carte
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {targetPlayerForPower.hand.map((card, cardIndex) => (
                          <button
                            key={card.id}
                            type="button"
                            className="rounded-md border border-indigo-300 px-3 py-2 text-left text-sm hover:bg-indigo-100 dark:border-indigo-600 dark:hover:bg-indigo-900/40"
                            onClick={() =>
                              applyGameUpdate({
                                updateGameState: (currentState) =>
                                  pickTargetCardForPower({
                                    gameState: currentState,
                                    targetCardIndex: cardIndex,
                                  }),
                              })
                            }
                          >
                            Carte {cardIndex + 1}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                  {gameState.activePowerEffect.targetViewedCard ? (
                    <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                      Carte adverse vue:{" "}
                      {getCardLabel({ card: gameState.activePowerEffect.targetViewedCard })}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
                      onClick={() =>
                        applyGameUpdate({
                          updateGameState: (currentState) =>
                            applyQueenSwapPower({ gameState: currentState, shouldSwap: true }),
                        })
                      }
                    >
                      Echanger
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-indigo-400 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-100 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
                      onClick={() =>
                        applyGameUpdate({
                          updateGameState: (currentState) =>
                            applyQueenSwapPower({ gameState: currentState, shouldSwap: false }),
                        })
                      }
                    >
                      Ne pas echanger
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3 rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="text-lg font-semibold">Etat des joueurs</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {gameState.players.map((player) => (
            <article
              key={player.id}
              className="rounded-lg border border-black/10 p-3 dark:border-white/15"
            >
              <p className="font-semibold">{player.name}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                {player.hand.length} cartes
                {isFinished ? ` - ${getPlayerTotalPoints({ player })} pts` : ""}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {player.hand.map((card) => (
                  <li key={card.id} className="flex items-center justify-between gap-2">
                    <span>{getCardLabel({ card })}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {getCardPoints({ card })} pts
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      {isFinished && gameState.finalScores ? (
        <div className="space-y-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-950/30">
          <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">
            Fin de partie
          </h2>
          <p className="text-sm text-emerald-900 dark:text-emerald-100">
            Gagnant(s): {winnerNames.join(", ")}
          </p>
          <div className="grid gap-2 text-sm">
            {gameState.finalScores
              .slice()
              .sort((firstScore, secondScore) => firstScore.points - secondScore.points)
              .map((score) => (
                <p key={score.playerId}>
                  {score.playerName}: <span className="font-semibold">{score.points}</span> pts
                </p>
              ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
