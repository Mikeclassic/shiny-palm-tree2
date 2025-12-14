import Link from "next/link";
import { Zap, Twitter, Instagram, Linkedin } from "lucide-react";
import { Container } from "@/components/ui/Container";

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 pt-16 pb-8">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Zap className="h-6 w-6 text-action" fill="currentColor" />
              <span className="text-xl font-bold tracking-tight text-brand-900">
                ClearSeller
              </span>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs mb-6">
              The all-in-one automation platform for modern dropshippers. 
              Source, list, and scale faster than ever before.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-slate-400 hover:text-brand-900 transition"><Twitter size={20} /></a>
              <a href="#" className="text-slate-400 hover:text-brand-900 transition"><Instagram size={20} /></a>
              <a href="#" className="text-slate-400 hover:text-brand-900 transition"><Linkedin size={20} /></a>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-brand-900 mb-4">Product</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li><Link href="#features" className="hover:text-action transition">Features</Link></li>
              <li><Link href="#pricing" className="hover:text-action transition">Pricing</Link></li>
              <li><Link href="#" className="hover:text-action transition">Integrations</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-brand-900 mb-4">Company</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li><Link href="#" className="hover:text-action transition">About Us</Link></li>
              <li><Link href="#" className="hover:text-action transition">Blog</Link></li>
              <li><Link href="#" className="hover:text-action transition">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-brand-900 mb-4">Legal</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li><Link href="/privacy" className="hover:text-action transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-action transition">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 text-center text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} ClearSeller Inc. All rights reserved.</p>
        </div>
      </Container>
    </footer>
  );
}