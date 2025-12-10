"use client";

import { useState } from "react";
import Link from 'next/link';
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Wand2, CreditCard, Zap, Bookmark, ImagePlus, Menu, X } from 'lucide-react';

export default function DashboardMobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* MOBILE HEADER BAR */}
      <div className="md:hidden flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-4 z-40">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsOpen(true)}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-brand-900 p-1.5 rounded-md">
                <Zap className="text-white fill-white" size={14} />
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">GlowSeller</span>
          </div>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>

      {/* MOBILE SIDEBAR OVERLAY */}
      {/* Background Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity duration-300 md:hidden ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sliding Sidebar Drawer */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-brand-900 text-white z-50 transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        
        {/* Drawer Header */}
        <div className="p-6 flex items-center justify-between border-b border-brand-800">
            <div className="flex items-center gap-2">
                <Zap className="text-orange-500 fill-orange-500" size={20} />
                <span className="font-bold text-xl">GlowSeller</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition">
                <X size={24} />
            </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <MobileSidebarItem href="/dashboard" icon={<LayoutDashboard size={20} />} label="Product Feed" onClick={() => setIsOpen(false)} />
            <MobileSidebarItem href="/dashboard/saved" icon={<Bookmark size={20} />} label="Saved Listings" onClick={() => setIsOpen(false)} />
            <MobileSidebarItem href="/dashboard/background-changer" icon={<ImagePlus size={20} />} label="Magic Studio" onClick={() => setIsOpen(false)} />
            <MobileSidebarItem href="/dashboard/tools" icon={<Wand2 size={20} />} label="AI Tools" onClick={() => setIsOpen(false)} />
            <MobileSidebarItem href="/dashboard/billing" icon={<CreditCard size={20} />} label="Billing" onClick={() => setIsOpen(false)} />
        </nav>

        {/* Drawer Footer */}
        <div className="p-6 border-t border-brand-800 bg-brand-950/30">
            <div className="flex items-center gap-3">
                <UserButton afterSignOutUrl="/" />
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">My Account</span>
                    <span className="text-xs text-brand-300">Pro Plan</span>
                </div>
            </div>
        </div>
      </div>
    </>
  );
}

// Helper for mobile links
function MobileSidebarItem({ href, icon, label, onClick }: { href: string, icon: React.ReactNode, label: string, onClick: () => void }) {
    return (
        <Link 
            href={href} 
            onClick={onClick}
            className="flex items-center gap-3 p-3.5 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all active:scale-95"
        >
            <span className="text-orange-500">{icon}</span>
            <span className="font-medium text-sm">{label}</span>
        </Link>
    )
}