import PhaseThreeBoard from "@/components/phase-three/phase-three-board";

export default function Home() {
  const initialSeed = 20260507;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-3">
      <main className="w-full">
        <PhaseThreeBoard initialSeed={initialSeed} />
      </main>
    </div>
  );
}
