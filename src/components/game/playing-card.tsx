import type { CaboCard } from "@/lib/types";

type CardSize = "xs" | "sm" | "md";

type PlayingCardProps = {
  card: CaboCard | null;
  isFaceUp: boolean;
  size?: CardSize;
  isSelectable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
};

const cardSizeClassName: Record<CardSize, string> = {
  xs: "h-20 w-14 text-[10px]",
  sm: "h-24 w-16 text-xs",
  md: "h-32 w-24 text-sm",
};

function getRankLabel({ card }: { card: CaboCard }): string {
  if (card.kind === "joker") {
    return "JOKER";
  }

  if (typeof card.rank === "number") {
    return String(card.rank);
  }

  if (card.rank === "jack") {
    return "J";
  }

  if (card.rank === "queen") {
    return "Q";
  }

  return "K";
}

function getSuitLabel({ card }: { card: CaboCard }): string {
  if (card.kind === "joker") {
    return "";
  }

  if (card.suit === "clubs") {
    return "♣";
  }

  if (card.suit === "diamonds") {
    return "♦";
  }

  if (card.suit === "hearts") {
    return "♥";
  }

  return "♠";
}

function getCardTextColor({ card }: { card: CaboCard }): string {
  if (card.kind === "joker") {
    return "text-violet-700";
  }

  return card.color === "red" ? "text-red-600" : "text-zinc-900";
}

function buildCardClassName({
  size,
  isSelectable,
  isSelected,
}: {
  size: CardSize;
  isSelectable: boolean;
  isSelected: boolean;
}) {
  const baseClassName =
    "rounded-xl border bg-white shadow-sm transition select-none relative overflow-hidden";
  const sizeClassName = cardSizeClassName[size];
  const selectedClassName = isSelected
    ? "border-emerald-500 ring-2 ring-emerald-300"
    : "border-zinc-300";
  const interactiveClassName = isSelectable
    ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
    : "cursor-default";

  return `${baseClassName} ${sizeClassName} ${selectedClassName} ${interactiveClassName}`;
}

export default function PlayingCard({
  card,
  isFaceUp,
  size = "md",
  isSelectable = false,
  isSelected = false,
  onClick,
}: PlayingCardProps) {
  const cardClassName = buildCardClassName({ size, isSelectable, isSelected });

  if (!card) {
    return (
      <div className={`${cardClassName} flex items-center justify-center border-dashed text-zinc-400`}>
        Vide
      </div>
    );
  }

  if (!isFaceUp) {
    return (
      <button
        type="button"
        className={`${cardClassName} bg-gradient-to-br from-sky-700 to-indigo-800 text-white`}
        onClick={onClick}
        disabled={!isSelectable}
      >
        <div className="flex h-full items-center justify-center">
          <span className="rounded-md border border-white/40 px-2 py-1 text-[10px] font-semibold tracking-[0.2em]">
            CABO
          </span>
        </div>
      </button>
    );
  }

  const rankLabel = getRankLabel({ card });
  const suitLabel = getSuitLabel({ card });
  const textColorClassName = getCardTextColor({ card });

  return (
    <button type="button" className={cardClassName} onClick={onClick} disabled={!isSelectable}>
      <div className={`absolute left-2 top-2 flex flex-col leading-none ${textColorClassName}`}>
        <span className="font-bold">{rankLabel}</span>
        <span>{suitLabel}</span>
      </div>
      <div className={`flex h-full items-center justify-center text-2xl font-semibold ${textColorClassName}`}>
        {card.kind === "joker" ? "★" : suitLabel}
      </div>
      <div
        className={`absolute bottom-2 right-2 flex -rotate-180 flex-col leading-none ${textColorClassName}`}
      >
        <span className="font-bold">{rankLabel}</span>
        <span>{suitLabel}</span>
      </div>
    </button>
  );
}
