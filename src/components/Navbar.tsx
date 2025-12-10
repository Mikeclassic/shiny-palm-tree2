"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Zap } from "lucide-react";
import { Container } from "@/components/ui/Container";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Product", href: "#product" },
    { name: "Pricing", href: "#pricing" },
    { name: "Support", href: "#support" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <div className="flex-shrink-0 flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-action" fill="currentColor" />
              <span className="text-xl font-bold tracking-tight text-brand-900">
                ClearSeller
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-brand-900 transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/sign-in" className="text-sm font-medium text-gray-600 hover:text-brand-900">
              Log in
            </Link>
            <Link href="/sign-up">
              <button className="bg-action hover:bg-action-hover text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-orange-500/20 hover:scale-105">
                Start Free Trial
              </button>
            </Link>
          </div>

          <div className="flex md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600 hover:text-brand-900 p-2">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </Container>

      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-200 shadow-xl animate-in slide-in-from-top-5">
          <div className="flex flex-col p-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-base font-medium text-gray-700 hover:text-action py-2 border-b border-gray-100"
              >
                {link.name}
              </Link>
            ))}
            <div className="flex flex-col gap-3 pt-2">
              <Link href="/sign-in">
                <button className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold">Log in</button>
              </Link>
              <Link href="/sign-up">
                <button className="w-full bg-action text-white py-3 rounded-lg font-bold shadow-md">Start Free Trial</button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}