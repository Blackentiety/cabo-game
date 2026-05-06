"use client";

import { useMemo, useState } from "react";

import { getCardLabel, getCardPoints } from "@/lib/deck";
import { createPhaseOneGame } from "@/lib/game-setup";
import type { PhaseOneGameState } from "@/lib/types";

const PLAYER_OPTIONS = [2, 3, 4];

function getTotalCardsInGame({ gameState }: { gameState: PhaseOneGameState }) {
  const cardsInHands = gameState.players.reduce(
    (totalCards, player) => totalCards + player.hand.length,
    0,
  );

  return cardsInHands + gameState.drawPile.length + gameState.discardPile.length;
}

export default function PhaseOneBoard() {
  const [playerCount, setPlayerCount] = useState(4);
  const [gameState, setGameState] = useState<PhaseOneGameState>(() =>
    createPhaseOneGame({ playerCount: 4 }),
  );

  const totalCardsInGame = useMemo(
    () => getTotalCardsInGame({ gameState }),
    [gameState],
  );

  function handleDealNewGame() {
    setGameState(createPhaseOneGame({ playerCount }));
  }

  const topDiscardCard = gameState.discardPile.at(-1);

  return (
    <section className="w-full max-w-5xl space-y-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Cabo - Phase 1</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Data model, generation du deck (54), melange et distribution initiale.
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
          onClick={handleDealNewGame}
        >
          Distribuer
        </button>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg border border-black/10 p-3 dark:border-white/15">
          <p className="text-zinc-600 dark:text-zinc-300">Deck restant</p>
          <p className="text-xl font-semibold">{gameState.drawPile.length}</p>
        </div>
        <div className="rounded-lg border border-black/10 p-3 dark:border-white/15">
          <p className="text-zinc-600 dark:text-zinc-300">Defausse (top)</p>
          <p className="text-sm font-medium">
            {topDiscardCard ? getCardLabel({ card: topDiscardCard }) : "Aucune"}
          </p>
        </div>
        <div className="rounded-lg border border-black/10 p-3 dark:border-white/15">
          <p className="text-zinc-600 dark:text-zinc-300">Cartes totales</p>
          <p className="text-xl font-semibold">{totalCardsInGame}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {gameState.players.map((player) => (
          <article
            key={player.id}
            className="rounded-lg border border-black/10 p-4 dark:border-white/15"
          >
            <h2 className="font-semibold">{player.name}</h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
              {player.hand.length} cartes
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {player.hand.map((card) => (
                <li key={card.id} className="flex items-center justify-between gap-3">
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
    </section>
  );
}

