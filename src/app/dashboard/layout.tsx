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
