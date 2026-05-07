import type { CaboCard } from "@/lib/types";

import PlayingCard from "@/components/game/playing-card";

type CardPileProps = {
  title: string;
  card: CaboCard | null;
  count: number;
  isFaceUp: boolean;
  onClick?: () => void;
  isDisabled?: boolean;
};

export default function CardPile({
  title,
  card,
  count,
  isFaceUp,
  onClick,
  isDisabled = false,
}: CardPileProps) {
  return (
    <div className="space-y-2 text-center">
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      <div className={isDisabled ? "opacity-50" : ""}>
        <PlayingCard
          card={card}
          isFaceUp={isFaceUp}
          isSelectable={!isDisabled && Boolean(onClick)}
          onClick={onClick}
        />
      </div>
      <p className="text-xs text-zinc-500">{count} carte(s)</p>
    </div>
  );
}
