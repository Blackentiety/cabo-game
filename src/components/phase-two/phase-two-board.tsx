"use client";

import { useMemo, useState } from "react";

import { getCardLabel, getCardPoints } from "@/lib/deck";
import {
  announceCabo,
  canAnnounceCabo,
  canDrawCard,
  canTakeDiscard,
  createPhaseTwoGame,
  discardPendingDraw,
  drawFromSource,
  getCurrentPlayerName,
  getPlayerTotalPoints,
  isGameFinished,
  replaceWithPendingDraw,
} from "@/lib/phase-two";
import type { PhaseTwoGameState } from "@/lib/types";

const PLAYER_OPTIONS = [2, 3, 4];

function getTopDiscardLabel({ gameState }: { gameState: PhaseTwoGameState }) {
  const topDiscardCard = gameState.discardPile.at(-1);
  return topDiscardCard ? getCardLabel({ card: topDiscardCard }) : "Aucune";
}

function getStatusLabel({ gameState }: { gameState: PhaseTwoGameState }) {
  if (gameState.finalScores) {
    return "Partie terminee";
  }

  if (gameState.lastRound) {
    return `Dernier tour (${gameState.lastRound.remainingTurns} tour(s) restant(s))`;
  }

  return "Partie en cours";
}

function getWinnerNames({ gameState }: { gameState: PhaseTwoGameState }) {
  return gameState.players
    .filter((player) => gameState.winnerPlayerIds.includes(player.id))
    .map((player) => player.name);
}

export default function PhaseTwoBoard() {
  const [playerCount, setPlayerCount] = useState(4);
  const [gameState, setGameState] = useState<PhaseTwoGameState>(() =>
    createPhaseTwoGame({ playerCount: 4 }),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const winnerNames = useMemo(() => getWinnerNames({ gameState }), [gameState]);
  const isFinished = isGameFinished({ gameState });

  function applyGameUpdate({
    updateGameState,
  }: {
    updateGameState: (currentState: PhaseTwoGameState) => PhaseTwoGameState;
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
    setGameState(createPhaseTwoGame({ playerCount }));
    setErrorMessage(null);
  }

  if (!currentPlayer) {
    return null;
  }

  return (
    <section className="w-full max-w-6xl space-y-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Cabo - Phase 2</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Tour par tour: piocher, remplacer ou defausser, annoncer Cabo et calcul final.
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

          {!gameState.pendingDraw ? (
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
          ) : (
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
          )}
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
