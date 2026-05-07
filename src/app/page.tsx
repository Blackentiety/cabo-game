import PhaseThreeBoard from "@/components/phase-three/phase-three-board";

export default function Home() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-100 px-4 py-10 dark:bg-black">
      <main className="w-full">
        <PhaseThreeBoard />
      </main>
    </div>
  );
}
