import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Milestone <span className="text-[hsl(280,100%,70%)]">AI</span>
        </h1>
        <p className="text-2xl text-white text-center max-w-2xl">
          Transform your goals into actionable plans with AI assistance
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard"
            className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Get Started
          </Link>
          <AuthButton />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
          <div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20">
            <h3 className="text-2xl font-bold">AI-Powered Planning</h3>
            <div className="text-lg">
              Get personalized, step-by-step plans for any goal using advanced AI technology.
            </div>
          </div>
          <div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20">
            <h3 className="text-2xl font-bold">Track Progress</h3>
            <div className="text-lg">
              Monitor your achievements and get intelligent suggestions to stay on track.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
