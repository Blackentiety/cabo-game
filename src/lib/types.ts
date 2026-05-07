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

export type DrawSource = "drawPile" | "discardPile";

export type PendingDraw = {
  card: CaboCard;
  source: DrawSource;
};

export type CaboLastRoundState = {
  callerPlayerId: string;
  remainingTurns: number;
};

export type CaboPlayerScore = {
  playerId: string;
  playerName: string;
  points: number;
};

export type PhaseTwoGameState = {
  players: CaboPlayer[];
  drawPile: CaboCard[];
  discardPile: CaboCard[];
  currentPlayerIndex: number;
  pendingDraw: PendingDraw | null;
  lastRound: CaboLastRoundState | null;
  finalScores: CaboPlayerScore[] | null;
  winnerPlayerIds: string[];
};

export type SelfPeekPowerEffect = {
  kind: "selfPeek";
  viewerPlayerId: string;
  selectedOwnCardIndex: number | null;
  viewedCard: CaboCard | null;
};

export type OpponentPeekPowerEffect = {
  kind: "opponentPeek";
  viewerPlayerId: string;
  targetPlayerId: string | null;
  targetCardIndex: number | null;
  viewedCard: CaboCard | null;
};

export type JackSwapPowerEffect = {
  kind: "jackSwap";
  playerId: string;
  ownCardIndex: number | null;
  targetPlayerId: string | null;
  targetCardIndex: number | null;
};

export type QueenSwapPowerEffect = {
  kind: "queenSwap";
  playerId: string;
  ownCardIndex: number | null;
  ownViewedCard: CaboCard | null;
  targetPlayerId: string | null;
  targetCardIndex: number | null;
  targetViewedCard: CaboCard | null;
};

export type ActivePowerEffect =
  | SelfPeekPowerEffect
  | OpponentPeekPowerEffect
  | JackSwapPowerEffect
  | QueenSwapPowerEffect;

export type PhaseThreeGameState = {
  players: CaboPlayer[];
  drawPile: CaboCard[];
  discardPile: CaboCard[];
  currentPlayerIndex: number;
  pendingDraw: PendingDraw | null;
  activePowerEffect: ActivePowerEffect | null;
  lastRound: CaboLastRoundState | null;
  finalScores: CaboPlayerScore[] | null;
  winnerPlayerIds: string[];
};
