"use client";

import { useMemo, useState } from "react";

import CardPile from "@/components/game/card-pile";
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

function getTopDiscardCard({ gameState }: { gameState: PhaseThreeGameState }) {
  return gameState.discardPile.at(-1) ?? null;
}

function getStatusLabel({ gameState }: { gameState: PhaseThreeGameState }) {
  if (gameState.finalScores) {
    return "Partie terminee";
  }

  if (gameState.initialPeek) {
    return "Vision initiale";
  }

  if (gameState.lastRound) {
    return `Dernier tour (${gameState.lastRound.remainingTurns} tour(s) restant(s))`;
  }

  if (gameState.activePowerEffect) {
    return "Pouvoir actif";
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

type PlayerHandProps = {
  player: CaboPlayer;
  isFaceUp: boolean;
  selectedCardIndex?: number | null;
  onSelectCard?: (cardIndex: number) => void;
};

function PlayerHand({
  player,
  isFaceUp,
  selectedCardIndex = null,
  onSelectCard,
}: PlayerHandProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {player.hand.map((card, cardIndex) => (
        <div key={card.id} className="space-y-1">
          <PlayingCard
            card={card}
            isFaceUp={isFaceUp}
            size="sm"
            isSelectable={Boolean(onSelectCard)}
            isSelected={selectedCardIndex === cardIndex}
            onClick={onSelectCard ? () => onSelectCard(cardIndex) : undefined}
          />
          <p className="text-center text-[11px] text-zinc-500">Carte {cardIndex + 1}</p>
        </div>
      ))}
    </div>
  );
}

export default function PhaseThreeBoard() {
  const [playerCount, setPlayerCount] = useState(4);
  const [gameState, setGameState] = useState<PhaseThreeGameState>(() =>
    createPhaseThreeGame({ playerCount: 4 }),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [revealedInitialPeekPlayerId, setRevealedInitialPeekPlayerId] = useState<string | null>(
    null,
  );
  const [visibleTurnKey, setVisibleTurnKey] = useState<string | null>(null);

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
      if (error instanceof Error) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage("Action impossible pour le moment");
    }
  }

  function handleNewGame() {
    setGameState(createPhaseThreeGame({ playerCount }));
    setErrorMessage(null);
    setRevealedInitialPeekPlayerId(null);
    setVisibleTurnKey(null);
  }

  if (!currentPlayer) {
    return null;
  }

  const opponentPlayers = getOpponentPlayers({
    gameState,
    currentPlayerId: currentPlayer.id,
  });
  const initialPeekCards = gameState.initialPeek ? getInitialPeekCards({ gameState }) : [];
  const currentTurnKey = `${currentPlayer.id}-${gameState.turnSequence}`;
  const isTurnVisible = isFinished || visibleTurnKey === currentTurnKey;
  const isInitialPeekRevealed =
    gameState.initialPeek !== null &&
    revealedInitialPeekPlayerId === gameState.initialPeek.activePlayerId;
  const topDiscardCard = getTopDiscardCard({ gameState });
  const selectedOwnCardIndex = getSelectedOwnCardIndex({ gameState });
  const selectedTargetCardIndex = getSelectedTargetCardIndex({ gameState });
  const initialPeekPlayerName =
    gameState.players.find((player) => player.id === gameState.initialPeek?.activePlayerId)?.name ??
    "";

  return (
    <section className="w-full max-w-7xl space-y-6 rounded-2xl border border-emerald-900/30 bg-emerald-900 p-6 text-emerald-50 shadow-xl">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Cabo</h1>
        <p className="text-sm text-emerald-100/90">
          Mode pass-and-play avec cartes visuelles, vision initiale et pouvoirs.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Joueurs
            <select
              className="rounded-md border border-emerald-200/30 bg-emerald-950/60 px-3 py-2"
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
            onClick={handleNewGame}
          >
            Nouvelle partie
          </button>
        </div>
      </header>

      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-lg border border-emerald-200/20 bg-emerald-950/40 p-3">
          <p className="text-emerald-100/80">Etat</p>
          <p className="font-medium">{getStatusLabel({ gameState })}</p>
        </div>
        <div className="rounded-lg border border-emerald-200/20 bg-emerald-950/40 p-3">
          <p className="text-emerald-100/80">Joueur actif</p>
          <p className="font-medium">{getCurrentPlayerName({ gameState })}</p>
        </div>
        <div className="rounded-lg border border-emerald-200/20 bg-emerald-950/40 p-3">
          <p className="text-emerald-100/80">Deck restant</p>
          <p className="text-xl font-semibold">{gameState.drawPile.length}</p>
        </div>
        <div className="rounded-lg border border-emerald-200/20 bg-emerald-950/40 p-3">
          <p className="text-emerald-100/80">Defausse</p>
          <p className="font-medium">{topDiscardCard ? getCardLabel({ card: topDiscardCard }) : "Aucune"}</p>
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-red-300/60 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {gameState.initialPeek ? (
        <div className="space-y-4 rounded-xl border border-sky-300/40 bg-sky-950/40 p-5">
          <h2 className="text-lg font-semibold">Vision initiale</h2>
          <p className="text-sm text-sky-100">
            Passe l ecran a <span className="font-semibold">{initialPeekPlayerName}</span>.
          </p>
          {!isInitialPeekRevealed ? (
            <button
              type="button"
              className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400"
              onClick={() => setRevealedInitialPeekPlayerId(gameState.initialPeek?.activePlayerId ?? null)}
            >
              Voir mes 2 cartes
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {initialPeekCards.map((card) => (
                  <PlayingCard key={card.id} card={card} isFaceUp />
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
                Terminer ma vision
              </button>
            </div>
          )}
        </div>
      ) : null}

      {!gameState.initialPeek && !isFinished && !isTurnVisible ? (
        <div className="space-y-3 rounded-xl border border-amber-300/50 bg-amber-950/40 p-5">
          <h2 className="text-lg font-semibold">Passation</h2>
          <p className="text-sm text-amber-100">
            Passe l ecran a <span className="font-semibold">{currentPlayer.name}</span>.
          </p>
          <button
            type="button"
            className="rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-300"
            onClick={() => setVisibleTurnKey(currentTurnKey)}
          >
            Commencer le tour
          </button>
        </div>
      ) : null}

      {!gameState.initialPeek && isTurnVisible ? (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-center gap-8 rounded-xl border border-emerald-200/20 bg-emerald-950/40 p-4">
            <CardPile
              title="Deck"
              card={gameState.drawPile.length > 0 ? gameState.drawPile[0] ?? null : null}
              count={gameState.drawPile.length}
              isFaceUp={false}
              isDisabled={!canDrawCard({ gameState })}
              onClick={() =>
                applyGameUpdate({
                  updateGameState: (currentState) =>
                    drawFromSource({ gameState: currentState, source: "drawPile" }),
                })
              }
            />
            <CardPile
              title="Defausse"
              card={topDiscardCard}
              count={gameState.discardPile.length}
              isFaceUp
              isDisabled={!canTakeDiscard({ gameState })}
              onClick={() =>
                applyGameUpdate({
                  updateGameState: (currentState) =>
                    drawFromSource({ gameState: currentState, source: "discardPile" }),
                })
              }
            />
          </div>

          {!isFinished ? (
            <div className="space-y-4 rounded-xl border border-emerald-200/20 bg-emerald-950/40 p-4">
              <h2 className="text-lg font-semibold">Main active: {currentPlayer.name}</h2>

              {!gameState.pendingDraw && !gameState.activePowerEffect ? (
                <div className="space-y-3">
                  <PlayerHand player={currentPlayer} isFaceUp={false} />
                  <div>
                    <button
                      type="button"
                      className="rounded-md border border-emerald-300/70 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-800/60 disabled:opacity-50"
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
                </div>
              ) : null}

              {gameState.pendingDraw ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-sm">Carte piochée</p>
                    <PlayingCard card={gameState.pendingDraw.card} isFaceUp />
                    <p className="text-xs text-emerald-100/80">
                      {getCardLabel({ card: gameState.pendingDraw.card })} (
                      {getCardPoints({ card: gameState.pendingDraw.card })} pts)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="rounded-md border border-emerald-300/70 px-4 py-2 text-sm font-semibold hover:bg-emerald-800/60"
                      onClick={() =>
                        applyGameUpdate({
                          updateGameState: (currentState) =>
                            discardPendingDraw({ gameState: currentState }),
                        })
                      }
                    >
                      Defausser la carte piochée
                    </button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm">Choisis une carte de ta main a remplacer</p>
                    <PlayerHand
                      player={currentPlayer}
                      isFaceUp={false}
                      onSelectCard={(handCardIndex) =>
                        applyGameUpdate({
                          updateGameState: (currentState) =>
                            replaceWithPendingDraw({
                              gameState: currentState,
                              handCardIndex,
                            }),
                        })
                      }
                    />
                  </div>
                </div>
              ) : null}

              {gameState.activePowerEffect ? (
                <div className="space-y-4 rounded-lg border border-indigo-300/50 bg-indigo-950/40 p-4">
                  <h3 className="font-semibold">Resolution du pouvoir</h3>

                  {gameState.activePowerEffect.kind === "selfPeek" ? (
                    <div className="space-y-3">
                      <p className="text-sm">7/8: choisis une de tes cartes.</p>
                      <PlayerHand
                        player={currentPlayer}
                        isFaceUp={false}
                        selectedCardIndex={selectedOwnCardIndex}
                        onSelectCard={(ownCardIndex) =>
                          applyGameUpdate({
                            updateGameState: (currentState) =>
                              pickOwnCardForPower({
                                gameState: currentState,
                                ownCardIndex,
                              }),
                          })
                        }
                      />
                      {gameState.activePowerEffect.viewedCard ? (
                        <PlayingCard card={gameState.activePowerEffect.viewedCard} isFaceUp />
                      ) : null}
                      <button
                        type="button"
                        className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-indigo-950 hover:bg-indigo-400"
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
                      <p className="text-sm">9/10: choisis un adversaire puis une carte.</p>
                      <div className="flex flex-wrap gap-2">
                        {opponentPlayers.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            className="rounded-md border border-indigo-300/60 px-3 py-2 text-sm hover:bg-indigo-900/60"
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
                        <PlayerHand
                          player={targetPlayerForPower}
                          isFaceUp={false}
                          selectedCardIndex={selectedTargetCardIndex}
                          onSelectCard={(targetCardIndex) =>
                            applyGameUpdate({
                              updateGameState: (currentState) =>
                                pickTargetCardForPower({
                                  gameState: currentState,
                                  targetCardIndex,
                                }),
                            })
                          }
                        />
                      ) : null}
                      {gameState.activePowerEffect.viewedCard ? (
                        <PlayingCard card={gameState.activePowerEffect.viewedCard} isFaceUp />
                      ) : null}
                      <button
                        type="button"
                        className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-indigo-950 hover:bg-indigo-400"
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
                      <p className="text-sm">Valet: echange a l aveugle.</p>
                      <p className="text-xs text-indigo-100/80">1) Ta carte</p>
                      <PlayerHand
                        player={currentPlayer}
                        isFaceUp={false}
                        selectedCardIndex={selectedOwnCardIndex}
                        onSelectCard={(ownCardIndex) =>
                          applyGameUpdate({
                            updateGameState: (currentState) =>
                              pickOwnCardForPower({
                                gameState: currentState,
                                ownCardIndex,
                              }),
                          })
                        }
                      />
                      <p className="text-xs text-indigo-100/80">2) Adversaire</p>
                      <div className="flex flex-wrap gap-2">
                        {opponentPlayers.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            className="rounded-md border border-indigo-300/60 px-3 py-2 text-sm hover:bg-indigo-900/60"
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
                          <p className="text-xs text-indigo-100/80">3) Sa carte</p>
                          <PlayerHand
                            player={targetPlayerForPower}
                            isFaceUp={false}
                            selectedCardIndex={selectedTargetCardIndex}
                            onSelectCard={(targetCardIndex) =>
                              applyGameUpdate({
                                updateGameState: (currentState) =>
                                  pickTargetCardForPower({
                                    gameState: currentState,
                                    targetCardIndex,
                                  }),
                              })
                            }
                          />
                        </>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-indigo-950 hover:bg-indigo-400"
                        onClick={() =>
                          applyGameUpdate({
                            updateGameState: (currentState) =>
                              applyJackSwapPower({ gameState: currentState }),
                          })
                        }
                      >
                        Confirmer l echange
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-indigo-300/60 px-4 py-2 text-sm font-semibold hover:bg-indigo-900/60"
                        onClick={() =>
                          applyGameUpdate({
                            updateGameState: (currentState) =>
                              skipJackSwapPower({ gameState: currentState }),
                          })
                        }
                      >
                        Ne pas utiliser le pouvoir
                      </button>
                    </div>
                  ) : null}

                  {gameState.activePowerEffect.kind === "queenSwap" ? (
                    <div className="space-y-3">
                      <p className="text-sm">Dame: regarde 2 cartes puis decide l echange.</p>
                      <p className="text-xs text-indigo-100/80">1) Ta carte</p>
                      <PlayerHand
                        player={currentPlayer}
                        isFaceUp={false}
                        selectedCardIndex={selectedOwnCardIndex}
                        onSelectCard={(ownCardIndex) =>
                          applyGameUpdate({
                            updateGameState: (currentState) =>
                              pickOwnCardForPower({
                                gameState: currentState,
                                ownCardIndex,
                              }),
                          })
                        }
                      />
                      {gameState.activePowerEffect.ownViewedCard ? (
                        <PlayingCard card={gameState.activePowerEffect.ownViewedCard} isFaceUp />
                      ) : null}
                      <p className="text-xs text-indigo-100/80">2) Adversaire puis carte</p>
                      <div className="flex flex-wrap gap-2">
                        {opponentPlayers.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            className="rounded-md border border-indigo-300/60 px-3 py-2 text-sm hover:bg-indigo-900/60"
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
                        <PlayerHand
                          player={targetPlayerForPower}
                          isFaceUp={false}
                          selectedCardIndex={selectedTargetCardIndex}
                          onSelectCard={(targetCardIndex) =>
                            applyGameUpdate({
                              updateGameState: (currentState) =>
                                pickTargetCardForPower({
                                  gameState: currentState,
                                  targetCardIndex,
                                }),
                            })
                          }
                        />
                      ) : null}
                      {gameState.activePowerEffect.targetViewedCard ? (
                        <PlayingCard card={gameState.activePowerEffect.targetViewedCard} isFaceUp />
                      ) : null}
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-indigo-950 hover:bg-indigo-400"
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
                          className="rounded-md border border-indigo-300/60 px-4 py-2 text-sm font-semibold hover:bg-indigo-900/60"
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

          <div className="space-y-3 rounded-xl border border-emerald-200/20 bg-emerald-950/40 p-4">
            <h2 className="text-lg font-semibold">Table</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {gameState.players.map((player) => (
                <article
                  key={player.id}
                  className={`space-y-2 rounded-lg border p-3 ${
                    player.id === currentPlayer.id
                      ? "border-amber-300/70 bg-amber-950/30"
                      : "border-emerald-200/20 bg-emerald-950/30"
                  }`}
                >
                  <p className="font-semibold">{player.name}</p>
                  <p className="text-xs text-emerald-100/70">
                    {player.hand.length} cartes
                    {isFinished ? ` - ${getPlayerTotalPoints({ player })} pts` : ""}
                  </p>
                  <PlayerHand player={player} isFaceUp={isFinished} />
                </article>
              ))}
            </div>
          </div>

          {isFinished && gameState.finalScores ? (
            <div className="space-y-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
              <h2 className="text-lg font-semibold">Fin de partie</h2>
              <p className="text-sm">Gagnant(s): {winnerNames.join(", ")}</p>
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
        </div>
      ) : null}
    </section>
  );
}
