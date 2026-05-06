export type Suit = "clubs" | "diamonds" | "hearts" | "spades";

export type NonJokerRank =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | "jack"
  | "queen"
  | "king";

export type CardColor = "black" | "red";

export type StandardCard = {
  id: string;
  kind: "standard";
  suit: Suit;
  rank: NonJokerRank;
  color: CardColor;
};

export type JokerCard = {
  id: string;
  kind: "joker";
};

export type CaboCard = StandardCard | JokerCard;

export type CaboPlayer = {
  id: string;
  name: string;
  hand: CaboCard[];
};

export type PhaseOneGameState = {
  players: CaboPlayer[];
  drawPile: CaboCard[];
  discardPile: CaboCard[];
};

