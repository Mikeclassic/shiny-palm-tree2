import Link from "next/link";
import { ArrowRight, CheckCircle2, Zap } from "lucide-react";
import { auth } from "@clerk/nextjs/server"; // FIXED IMPORT
import { redirect } from "next/navigation";

export default function LandingPage() {
  const { userId } = auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-black text-white selection:bg-purple-500 selection:text-white">
      {/* Header */}
      <header className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full border-b border-gray-800/50">
        <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text flex items-center gap-2">
            <Zap className="text-purple-500 fill-purple-500" /> GlowSeller
        </div>
        <div className="flex gap-4">
          <Link href="/sign-in">
            <button className="text-gray-300 hover:text-white font-medium px-4 py-2 transition">
              Login
            </button>
          </Link>
          <Link href="/sign-up">
            <button className="bg-white text-black px-5 py-2 rounded-full font-bold hover:bg-gray-200 transition">
              Get Started
            </button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="inline-block px-4 py-1.5 mb-6 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm font-medium">
          🚀 #1 Dropshipping Tool for Depop
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
          Automate your <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400">
            Reselling Empire
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed">
          GlowSeller helps you find winning products, write viral descriptions with AI, 
          and edit photos in seconds. Stop wasting time and start scaling.
        </p>
        
        <Link href="/sign-up">
          <button className="group relative bg-white text-black text-lg px-8 py-4 rounded-full font-bold shadow-[0_0_40px_-10px_rgba(168,85,247,0.5)] hover:shadow-[0_0_60px_-10px_rgba(168,85,247,0.7)] hover:scale-105 transition duration-300 flex items-center gap-3 overflow-hidden">
            <span className="relative z-10 flex items-center gap-2">Start for Free <ArrowRight className="group-hover:translate-x-1 transition" /></span>
          </button>
        </Link>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full text-left">
            {[
                { title: "Winning Products", desc: "Daily drops of high-margin items scraped from trends." },
                { title: "AI Writer", desc: "Generate SEO-optimized descriptions in the 'Depop style'." },
                { title: "Magic Eraser", desc: "Remove clutter backgrounds and replace them with studio vibes." }
            ].map((f, i) => (
                <div key={i} className="bg-gray-900/50 border border-gray-800 p-8 rounded-2xl hover:border-purple-500/50 transition duration-300">
                    <CheckCircle2 className="text-purple-500 mb-4 h-8 w-8" /> 
                    <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                    <p className="text-gray-400">{f.desc}</p>
                </div>
            ))}
        </div>
      </main>
    </div>
  );
}
