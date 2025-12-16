"use client";

import { useState } from "react";
import Link from 'next/link';
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, Wand2, CreditCard, Zap, Bookmark, ImagePlus, Menu, X, LogOut, User, Settings, Flame, Link2, Download } from 'lucide-react';

export default function DashboardMobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <>
      {/* MOBILE APP BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsOpen(true)}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-brand-900 p-1.5 rounded-md">
                <Zap className="text-white fill-white" size={16} />
            </div>
            <span className="font-bold text-brand-900 text-lg tracking-tight">ClearSeller</span>
          </div>
        </div>
        {/* User Avatar / Profile */}
        <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
            {session?.user?.image ? (
                <img src={session.user.image} alt="Profile" className="h-full w-full object-cover" />
            ) : (
                <div className="h-full w-full flex items-center justify-center bg-brand-900 text-white font-bold text-xs">
                    {session?.user?.name?.[0] || "U"}
                </div>
            )}
        </div>
      </div>

      <div className="h-16 md:hidden"></div>

      {/* MOBILE DRAWER */}
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
            <MobileSidebarItem href="/dashboard/winning-products" icon={<Flame size={20} />} label="Winning Products" onClick={() => setIsOpen(false)} highlight />
            <MobileSidebarItem href="/dashboard/import-from-link" icon={<Link2 size={20} />} label="Import from Link" onClick={() => setIsOpen(false)} special />
            <MobileSidebarItem href="/download-extension" icon={<Download size={20} />} label="Get Extension" onClick={() => setIsOpen(false)} />
            <MobileSidebarItem href="/dashboard/saved" icon={<Bookmark size={20} />} label="Saved Listings" onClick={() => setIsOpen(false)} />
            <MobileSidebarItem href="/dashboard/background-changer" icon={<ImagePlus size={20} />} label="Magic Studio" onClick={() => setIsOpen(false)} />
            <MobileSidebarItem href="/dashboard/tools" icon={<Wand2 size={20} />} label="AI Tools" onClick={() => setIsOpen(false)} />
            <MobileSidebarItem href="/dashboard/settings" icon={<Settings size={20} />} label="Settings" onClick={() => setIsOpen(false)} />
            <MobileSidebarItem href="/dashboard/billing" icon={<CreditCard size={20} />} label="Billing" onClick={() => setIsOpen(false)} />
        </nav>

        <div className="p-4 border-t border-brand-800 bg-brand-950/30">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center text-xs font-bold border border-brand-700">
                        {session?.user?.image ? (
                            <img src={session.user.image} alt="User" className="h-full w-full object-cover" />
                        ) : (
                            <span>{session?.user?.name?.[0] || "U"}</span>
                        )}
                    </div>
                    <div className="flex flex-col max-w-[100px]">
                        <span className="text-sm font-bold text-white truncate">{session?.user?.name || "User"}</span>
                        <span className="text-[10px] text-brand-300">Pro Plan</span>
                    </div>
                </div>
                <button onClick={() => signOut()} className="p-2 bg-brand-800 rounded-lg hover:bg-red-900/50 hover:text-red-400 transition">
                    <LogOut size={18} />
                </button>
            </div>
        </div>
      </div>
    </>
  );
}

function MobileSidebarItem({ href, icon, label, onClick, highlight, special }: { href: string, icon: React.ReactNode, label: string, onClick: () => void, highlight?: boolean, special?: boolean }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`flex items-center gap-3 p-3.5 rounded-xl transition-all active:scale-95 ${
                highlight
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
                    : special
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
        >
            <span className={highlight || special ? '' : 'text-orange-500'}>{icon}</span>
            <span className="font-medium text-sm">{label}</span>
            {highlight && <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">NEW</span>}
        </Link>
    )
}