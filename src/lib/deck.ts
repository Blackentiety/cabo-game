import type { CaboCard, CardColor, NonJokerRank, Suit } from "@/lib/types";

const SUITS: readonly Suit[] = ["clubs", "diamonds", "hearts", "spades"];
const RANKS: readonly NonJokerRank[] = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  "jack",
  "queen",
  "king",
];

type ShuffleDeckOptions = {
  deck: CaboCard[];
  randomizer?: () => number;
};

const RED_SUITS = new Set<Suit>(["diamonds", "hearts"]);

function getCardColor({ suit }: { suit: Suit }): CardColor {
  return RED_SUITS.has(suit) ? "red" : "black";
}

function createStandardCard({
  suit,
  rank,
}: {
  suit: Suit;
  rank: NonJokerRank;
}): CaboCard {
  return {
    id: `${rank}-${suit}`,
    kind: "standard",
    suit,
    rank,
    color: getCardColor({ suit }),
  };
}

export function createFullDeck(): CaboCard[] {
  const standardCards = SUITS.flatMap((suit) =>
    RANKS.map((rank) => createStandardCard({ suit, rank })),
  );

  const jokers: CaboCard[] = [
    { id: "joker-1", kind: "joker" },
    { id: "joker-2", kind: "joker" },
  ];

  return [...standardCards, ...jokers];
}

export function shuffleDeck({ deck, randomizer = Math.random }: ShuffleDeckOptions) {
  const shuffledDeck = [...deck];

  for (let currentIndex = shuffledDeck.length - 1; currentIndex > 0; currentIndex -= 1) {
    const swapIndex = Math.floor(randomizer() * (currentIndex + 1));
    const currentCard = shuffledDeck[currentIndex];
    const nextCard = shuffledDeck[swapIndex];
    shuffledDeck[currentIndex] = nextCard;
    shuffledDeck[swapIndex] = currentCard;
  }

  return shuffledDeck;
}

export function getCardPoints({ card }: { card: CaboCard }): number {
  if (card.kind === "joker") {
    return 0;
  }

  if (typeof card.rank === "number") {
    return card.rank;
  }

  if (card.rank === "king") {
    return card.color === "red" ? -1 : 15;
  }

  return 10;
}

export function getCardLabel({ card }: { card: CaboCard }): string {
  if (card.kind === "joker") {
    return "Joker";
  }

  return `${String(card.rank)} of ${card.suit}`;
}

