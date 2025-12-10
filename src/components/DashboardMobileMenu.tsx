"use client";

import { useState } from "react";
import Link from 'next/link';
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Wand2, CreditCard, Zap, Bookmark, ImagePlus, Menu, X } from 'lucide-react';

export default function DashboardMobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-brand-900 p-1.5 rounded-md">
                <Zap className="text-white fill-white" size={16} />
            </div>
            <span className="font-bold text-brand-900 text-lg tracking-tight">ClearSeller</span>
          </div>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>

      <div className="h-16 md:hidden"></div>

      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity duration-300 md:hidden ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsOpen(false)}
      />

      <div className={`fixed top-0 left-0 h-full w-72 bg-brand-900 text-white z-50 transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 flex items-center justify-between border-b border-brand-800 h-16">
            <div className="flex items-center gap-2">
                <Zap className="text-orange-500 fill-orange-500" size={20} />
                <span className="font-bold text-xl">ClearSeller</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition">
                <X size={24} />
            </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <MobileSidebarItem href="/dashboard" icon={<LayoutDashboard size={20} />} label="Product Feed" onClick={() => setIsOpen(false)} />
            <MobileSidebarItem href="/dashboard/saved" icon={<Bookmark size={20} />} label="Saved Listings" onClick={() => setIsOpen(false)} />
            <MobileSidebarItem href="/dashboard/background-changer" icon={<ImagePlus size={20} />} label="Magic Studio" onClick={() => setIsOpen(false)} />
            <MobileSidebarItem href="/dashboard/tools" icon={<Wand2 size={20} />} label="AI Tools" onClick={() => setIsOpen(false)} />
            <MobileSidebarItem href="/dashboard/billing" icon={<CreditCard size={20} />} label="Billing" onClick={() => setIsOpen(false)} />
        </nav>

        <div className="p-4 border-t border-brand-800 bg-brand-950/30">
            <div className="flex items-center gap-3">
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-400">Signed in as</span>
                    <span className="text-sm font-bold text-white">User</span>
                </div>
            </div>
        </div>
      </div>
    </>
  );
}

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