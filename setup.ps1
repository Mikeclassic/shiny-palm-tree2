<![CDATA[# Setup script for GlowSeller project

# Create directories
$directories = @(
    "prisma",
    "scripts",
    ".github/workflows",
    "src/lib",
    "src/app",
    "src/app/sign-in/[[...sign-in]]",
    "src/app/sign-up/[[...sign-up]]",
    "src/app/dashboard",
    "src/app/dashboard/tools",
    "src/app/dashboard/billing",
    "src/app/api/ai/generate",
    "src/app/api/ai/remove-bg"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

function Write-File($path, $content) {
    Set-Content -Path $path -Value $content -Encoding UTF8
}

# ------------------------------------------------------------------------------
# package.json
$packageJson = @'
{
  "name": "glow-seller",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "scrape": "ts-node --compiler-options '{\"module\":\"commonjs\"}' scripts/daily-scrape.ts"
  },
  "dependencies": {
    "@clerk/nextjs": "^5.1.0",
    "@prisma/client": "^5.10.2",
    "@radix-ui/react-slot": "^1.0.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.344.0",
    "next": "14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwind-merge": "^2.2.1",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^20.11.24",
    "@types/react": "^18.2.61",
    "@types/react-dom": "^18.2.19",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "prisma": "^5.10.2",
    "tailwindcss": "^3.4.1",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
'@
Write-File "package.json" $packageJson

# ------------------------------------------------------------------------------
# tsconfig.json (fixed paths)
$tsconfig = @'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
'@
Write-File "tsconfig.json" $tsconfig

# ------------------------------------------------------------------------------
# next.config.mjs
$nextConfig = @'
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'replicate.delivery' },
            { protocol: 'https', hostname: 'ae01.alicdn.com' }
        ]
    }
};

export default nextConfig;
'@
Write-File "next.config.mjs" $nextConfig

# ------------------------------------------------------------------------------
# tailwind.config.ts
$tailwindConfig = @'
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        primary: "#8b5cf6",
      },
    },
  },
  plugins: [],
};
export default config;
'@
Write-File "tailwind.config.ts" $tailwindConfig

# ------------------------------------------------------------------------------
# postcss.config.mjs
$postcssConfig = @'
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
'@
Write-File "postcss.config.mjs" $postcssConfig

# ------------------------------------------------------------------------------
# prisma/schema.prisma
$prismaSchema = @'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String
  credits   Int      @default(5)
  isPro     Boolean  @default(false)
  createdAt DateTime @default(now())
}

model Product {
  id          String   @id @default(cuid())
  title       String
  price       Float
  imageUrl    String
  sourceUrl   String
  aesthetic   String?  @default("Y2K")
  createdAt   DateTime @default(now())
}
'@
Write-File "prisma/schema.prisma" $prismaSchema

# ------------------------------------------------------------------------------
# scripts/daily-scrape.ts
$dailyScrape = @'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// This simulates finding "Winning Products". 
// In a real scenario, you would scrape AliExpress/Depop/TikTok here.
const MOCK_WINNERS = [
  { title: "Y2K Star Zip Hoodie", price: 24.99, imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=500&q=60", aesthetic: "Y2K" },
  { title: "Vintage Carhartt Jacket", price: 85.00, imageUrl: "https://images.unsplash.com/photo-1551028919-ac7d21422db7?auto=format&fit=crop&w=500&q=60", aesthetic: "Vintage" },
  { title: "Baggy Cyber Jeans", price: 45.00, imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=500&q=60", aesthetic: "Cyber" },
  { title: "Coquette Bow Top", price: 18.50, imageUrl: "https://images.unsplash.com/photo-1620799140408-ed5341cd2431?auto=format&fit=crop&w=500&q=60", aesthetic: "Coquette" }
];

async function main() {
  console.log("Starting Scrape...");
  // Clear old products to keep the feed fresh
  await prisma.product.deleteMany({});
  
  for (const item of MOCK_WINNERS) {
    await prisma.product.create({
      data: {
        title: item.title,
        price: item.price,
        imageUrl: item.imageUrl,
        sourceUrl: "https://aliexpress.com", // Placeholder
        aesthetic: item.aesthetic
      }
    });
  }
  console.log("Feed Updated.");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
'@
Write-File "scripts/daily-scrape.ts" $dailyScrape

# ------------------------------------------------------------------------------
# .github/workflows/scraper.yml
$scraperYml = @'
name: Daily Product Scraper

on:
  schedule:
    - cron: '0 8 * * *' # Runs daily at 8am
  workflow_dispatch:

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install Dependencies
        run: npm ci
      - name: Generate Prisma
        run: npx prisma generate
      - name: Run Scraper
        run: npm run scrape
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
'@
Write-File ".github/workflows/scraper.yml" $scraperYml

# ------------------------------------------------------------------------------
# .github/workflows/db-push.yml
$dbPushYml = @'
name: Database Schema Push

on:
  workflow_dispatch:

jobs:
  push-schema:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install Deps
        run: npm ci
      - name: Push DB Schema
        run: npx prisma db push
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
'@
Write-File ".github/workflows/db-push.yml" $dbPushYml

# ------------------------------------------------------------------------------
# src/middleware.ts
$middleware = @'
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Protect dashboard routes
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
'@
Write-File "src/middleware.ts" $middleware

# ------------------------------------------------------------------------------
# src/lib/db.ts
$libDb = @'
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
'@
Write-File "src/lib/db.ts" $libDb

# ------------------------------------------------------------------------------
# src/lib/utils.ts
$libUtils = @'
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
'@
Write-File "src/lib/utils.ts" $libUtils

# ------------------------------------------------------------------------------
# src/app/globals.css
$globalsCss = @'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 10%;
    --primary: 263 70% 50%;
  }
}

body {
  @apply bg-background text-foreground;
}
'@
Write-File "src/app/globals.css" $globalsCss

# ------------------------------------------------------------------------------
# src/app/layout.tsx
$layout = @'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GlowSeller - Depop Automation',
  description: 'The #1 Tool for Depop Dropshipping',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  )
}
'@
Write-File "src/app/layout.tsx" $layout

# ------------------------------------------------------------------------------
# src/app/page.tsx
$page = @'
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
'@
Write-File "src/app/page.tsx" $page

# ------------------------------------------------------------------------------
# src/app/sign-in/[[...sign-in]]/page.tsx
$signInPage = @'
import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-black">
      <SignIn appearance={{
        elements: {
          formButtonPrimary: 'bg-purple-600 hover:bg-purple-700',
          footerActionLink: 'text-purple-400 hover:text-purple-300'
        }
      }} />
    </div>
  );
}
'@
Write-File "src/app/sign-in/[[...sign-in]]/page.tsx" $signInPage

# ------------------------------------------------------------------------------
# src/app/sign-up/[[...sign-up]]/page.tsx
$signUpPage = @'
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-black">
      <SignUp appearance={{
        elements: {
          formButtonPrimary: 'bg-purple-600 hover:bg-purple-700',
          footerActionLink: 'text-purple-400 hover:text-purple-300'
        }
      }} />
    </div>
  );
}
'@
Write-File "src/app/sign-up/[[...sign-up]]/page.tsx" $signUpPage

# ------------------------------------------------------------------------------
# src/app/dashboard/layout.tsx
$dashboardLayout = @'
import Link from 'next/link';
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Wand2, CreditCard, LogOut, Zap } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-black text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-950 border-r border-gray-900 hidden md:flex flex-col p-6 fixed h-full z-10">
        <div className="flex items-center gap-2 mb-10">
            <Zap className="text-purple-500 fill-purple-500" />
            <h1 className="text-xl font-bold">GlowSeller</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          <Link href="/dashboard" className="flex items-center gap-3 p-3 rounded-lg text-gray-400 hover:bg-gray-900 hover:text-white transition">
            <LayoutDashboard size={20} /> <span className="font-medium">Dashboard</span>
          </Link>
          <Link href="/dashboard/tools" className="flex items-center gap-3 p-3 rounded-lg text-gray-400 hover:bg-gray-900 hover:text-white transition">
            <Wand2 size={20} /> <span className="font-medium">AI Tools</span>
          </Link>
          <Link href="/dashboard/billing" className="flex items-center gap-3 p-3 rounded-lg text-gray-400 hover:bg-gray-900 hover:text-white transition">
            <CreditCard size={20} /> <span className="font-medium">Billing</span>
          </Link>
        </nav>

        <div className="pt-6 border-t border-gray-900">
            <div className="flex items-center gap-3 text-sm text-gray-500">
                <UserButton afterSignOutUrl="/" />
                <span>My Profile</span>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-8">
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-8">
            <h1 className="text-xl font-bold text-purple-500">GlowSeller</h1>
            <UserButton afterSignOutUrl="/" />
        </div>
        
        {children}
      </main>
    </div>
  );
}
'@
Write-File "src/app/dashboard/layout.tsx" $dashboardLayout

# ------------------------------------------------------------------------------
# src/app/dashboard/page.tsx (fixed import)
$dashboardPage = @'
import { db } from "@/lib/db";
import { ArrowUpRight } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const products = await db.product.findMany({
    take: 9,
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Winning Products 🔥</h2>
        <p className="text-gray-400 mt-2">Curated high-margin items updated daily.</p>
      </div>

      {products.length === 0 ? (
        <div className="p-10 border border-dashed border-gray-800 rounded-xl text-center text-gray-500">
            <p>No products found yet.</p>
            <p className="text-sm mt-2">Go to GitHub Actions and run "Daily Product Scraper" manually to populate data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
            <div key={product.id} className="group bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-purple-500/50 transition duration-300">
                <div className="h-64 relative overflow-hidden">
                    <img 
                        src={product.imageUrl} 
                        alt={product.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                    />
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                        {product.aesthetic}
                    </div>
                </div>
                <div className="p-5">
                    <h3 className="font-bold text-lg truncate mb-1">{product.title}</h3>
                    <div className="flex justify-between items-end mt-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Market Price</p>
                            <p className="text-2xl font-mono text-white">${product.price}</p>
                        </div>
                        <button className="bg-white text-black p-2 rounded-full hover:bg-purple-400 transition">
                            <ArrowUpRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
            ))}
        </div>
      )}
    </div>
  );
}
'@
Write-File "src/app/dashboard/page.tsx" $dashboardPage

# ------------------------------------------------------------------------------
# src/app/dashboard/tools/page.tsx
$dashboardTools = @'
"use client";
import { useState } from "react";
import { Wand2, Image as ImageIcon, Loader2, Copy } from "lucide-react";

export default function AITools() {
  const [productName, setProductName] = useState("");
  const [descResult, setDescResult] = useState("");
  const [loading, setLoading] = useState(false);

  const [imageUrl, setImageUrl] = useState("");
  const [bgResult, setBgResult] = useState("");
  const [bgLoading, setBgLoading] = useState(false);

  const generateDescription = async () => {
    if(!productName) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({ productName }),
      });
      const data = await res.json();
      setDescResult(data);
    } catch (e) {
      alert("Error generating description");
    } finally {
      setLoading(false);
    }
  };

  const removeBackground = async () => {
    if(!imageUrl) return;
    setBgLoading(true);
    try {
      const res = await fetch("/api/ai/remove-bg", {
        method: "POST",
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      if(data.output) setBgResult(data.output);
      else alert("Failed to process image");
    } catch (e) {
      alert("Error processing image");
    } finally {
      setBgLoading(false);
    }
  };

  return (
    <div className="space-y-8">
        <div>
            <h2 className="text-3xl font-bold">AI Studio ✨</h2>
            <p className="text-gray-400 mt-2">Generate content and edit photos instantly.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Description Gen */}
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-purple-600/10 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
                        <Wand2 size={24} />
                    </div>
                    <h3 className="font-bold text-xl">Description Writer</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Product Name</label>
                        <input 
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="e.g. Vintage Nike Sweatshirt"
                            className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white focus:ring-2 ring-purple-500 outline-none transition"
                        />
                    </div>
                    <button 
                        onClick={generateDescription}
                        disabled={loading}
                        className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Generate Magic"}
                    </button>
                </div>

                {descResult && (
                <div className="mt-6 p-4 bg-black/50 border border-gray-800 rounded-xl">
                    <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">{descResult}</p>
                    <button 
                        onClick={() => navigator.clipboard.writeText(descResult)}
                        className="mt-3 flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wider"
                    >
                        <Copy size={12} /> Copy Text
                    </button>
                </div>
                )}
            </div>

            {/* BG Remover */}
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-pink-600/10 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-pink-500/10 rounded-lg text-pink-400">
                        <ImageIcon size={24} />
                    </div>
                    <h3 className="font-bold text-xl">Background Remover</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Image URL</label>
                        <input 
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white focus:ring-2 ring-pink-500 outline-none transition"
                        />
                    </div>
                    <button 
                        onClick={removeBackground}
                        disabled={bgLoading}
                        className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                        {bgLoading ? <Loader2 className="animate-spin" /> : "Remove Background"}
                    </button>
                </div>

                {bgResult && (
                <div className="mt-6 border border-gray-800 rounded-xl overflow-hidden">
                    <img src={bgResult} alt="Result" className="w-full" />
                </div>
                )}
            </div>
        </div>
    </div>
  );
}
'@
Write-File "src/app/dashboard/tools/page.tsx" $dashboardTools

# ------------------------------------------------------------------------------
# src/app/dashboard/billing/page.tsx
$billing = @'
import { Check } from "lucide-react";

export default function Billing() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Subscription 💎</h2>
        <p className="text-gray-400 mt-2">Upgrade to Pro to unlock unlimited AI and scraping.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        {/* Free Plan */}
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl">
            <h3 className="text-xl font-bold text-gray-300">Starter</h3>
            <div className="text-4xl font-bold mt-4 text-white">$0 <span className="text-lg font-normal text-gray-500">/mo</span></div>
            <ul className="mt-8 space-y-4">
                <li className="flex gap-3 text-gray-400"><Check className="text-gray-600" /> 5 AI Generations / day</li>
                <li className="flex gap-3 text-gray-400"><Check className="text-gray-600" /> Basic Product Feed</li>
            </ul>
            <button className="w-full mt-8 bg-gray-800 text-white font-bold py-3 rounded-xl border border-gray-700 cursor-not-allowed">Current Plan</button>
        </div>

        {/* Pro Plan */}
        <div className="bg-gradient-to-b from-purple-900/20 to-gray-900 border border-purple-500/30 p-8 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
            <h3 className="text-xl font-bold text-purple-300">Pro Seller</h3>
            <div className="text-4xl font-bold mt-4 text-white">$29 <span className="text-lg font-normal text-gray-500">/mo</span></div>
            <ul className="mt-8 space-y-4">
                <li className="flex gap-3 text-white"><Check className="text-purple-500" /> Unlimited AI Tools</li>
                <li className="flex gap-3 text-white"><Check className="text-purple-500" /> Daily Top 100 Products</li>
                <li className="flex gap-3 text-white"><Check className="text-purple-500" /> Auto-Fulfill (Beta)</li>
            </ul>
            <button className="w-full mt-8 bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition">Upgrade Now</button>
        </div>
      </div>
    </div>
  );
}
'@
Write-File "src/app/dashboard/billing/page.tsx" $billing

# ------------------------------------------------------------------------------
# src/app/api/ai/generate/route.ts
$aiGenerate = @'
import { auth } from "@clerk/nextjs/server"; // CORRECT IMPORT
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { productName } = await req.json();

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://glowseller.com", 
        },
        body: JSON.stringify({
        model: "moonshotai/kimi-k2-thinking",
        messages: [
            {
            role: "user",
            content: `Write a trendy, Gen-Z style Depop description for a product named "${productName}". Include hashtags like #y2k #streetwear.`
            }
        ],
        reasoning: { enabled: true }
        }),
    });

    const data = await response.json();
    // Safety check for API response structure
    const content = data.choices?.[0]?.message?.content || "AI generation failed. Please try again.";
    
    return NextResponse.json(content);
  } catch (error) {
    console.error("AI Gen Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
'@
Write-File "src/app/api/ai/generate/route.ts" $aiGenerate

# ------------------------------------------------------------------------------
# src/app/api/ai/remove-bg/route.ts
$aiRemoveBg = @'
import { auth } from "@clerk/nextjs/server"; // CORRECT IMPORT
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { imageUrl } = await req.json();

    const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
        "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        "Prefer": "wait",
        },
        body: JSON.stringify({
        version: "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
        input: { image: imageUrl }
        }),
    });

    const data = await response.json();
    return NextResponse.json({ output: data.output });
  } catch (error) {
    console.error("BG Remove Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
'@
Write-File "src/app/api/ai/remove-bg/route.ts" $aiRemoveBg

# ------------------------------------------------------------------------------
# .gitignore
$gitignore = @'
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
'@
Write-File ".gitignore" $gitignore

Write-Host "All files created successfully."
]]>
