import Link from 'next/link';
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Wand2, CreditCard, Zap, Bookmark, ImagePlus } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* Sidebar - Deep Brand Blue */}
      <aside className="w-64 bg-brand-900 border-r border-brand-800 hidden md:flex flex-col p-6 fixed h-full z-20 shadow-xl">
        <div className="flex items-center gap-3 mb-10 px-2">
            <div className="bg-action/10 p-2 rounded-lg">
                <Zap className="text-action fill-action" size={24} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">GlowSeller</h1>
        </div>
        
        <nav className="space-y-1 flex-1">
          <SidebarItem href="/dashboard" icon={<LayoutDashboard size={20} />} label="Product Feed" />
          <SidebarItem href="/dashboard/saved" icon={<Bookmark size={20} />} label="Saved Listings" />
          <SidebarItem href="/dashboard/background-changer" icon={<ImagePlus size={20} />} label="Magic Studio" />
          <SidebarItem href="/dashboard/tools" icon={<Wand2 size={20} />} label="AI Tools" />
          <SidebarItem href="/dashboard/billing" icon={<CreditCard size={20} />} label="Billing" />
        </nav>

        <div className="pt-6 border-t border-brand-800">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-brand-800/50 hover:bg-brand-800 transition cursor-pointer">
                <UserButton afterSignOutUrl="/" />
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">My Account</span>
                    <span className="text-xs text-brand-200">Pro Plan</span>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-8 lg:p-12 max-w-7xl mx-auto">
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="md:hidden flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2">
                <Zap className="text-action" size={20} />
                <h1 className="font-bold text-brand-900">GlowSeller</h1>
            </div>
            <UserButton afterSignOutUrl="/" />
        </div>
        
        {children}
      </main>
    </div>
  );
}

// Helper Component for consistent links
function SidebarItem({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
    return (
        <Link 
            href={href} 
            className="flex items-center gap-3 p-3 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-all group"
        >
            <span className="group-hover:text-action transition-colors">{icon}</span>
            <span className="font-medium">{label}</span>
        </Link>
    )
}