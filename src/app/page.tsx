import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Container } from "@/components/ui/Container";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-action selection:text-white">
      <Navbar />

      {/* HERO SECTION */}
      {/* Strategy: Clear Value Prop above fold. 1 Col Mobile, 2 Col Desktop. */}
      <section className="pt-16 pb-20 lg:pt-32 lg:pb-28 overflow-hidden">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left: Copy & CTA */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-bold uppercase tracking-wider">
                🚀 #1 Dropshipping Automation Tool
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-brand-900 leading-[1.1]">
                Launch Your Store in <br className="hidden lg:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-action to-pink-600">
                  2 Minutes
                </span>
              </h1>
              
              <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
                Automate finding winning products, writing viral descriptions, and editing photos. 
                Stop wasting time on manual work and start scaling.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Link href="/sign-up" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto bg-action hover:bg-action-hover text-white text-lg px-8 py-4 rounded-xl font-bold shadow-xl shadow-orange-500/20 transition-transform hover:-translate-y-1 flex items-center justify-center gap-2">
                    Start Free Trial <ArrowRight size={20} />
                  </button>
                </Link>
                <Link href="#demo" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 text-lg px-8 py-4 rounded-xl font-bold transition-colors">
                    View Demo
                  </button>
                </Link>
              </div>

              <p className="text-sm text-slate-500 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" /> No credit card required
                <span className="mx-2">•</span>
                <CheckCircle2 size={16} className="text-green-500" /> 14-day free trial
              </p>
            </div>

            {/* Right: Visual / Dashboard Preview */}
            <div className="relative mx-auto w-full max-w-[600px] lg:max-w-none">
              <div className="relative rounded-2xl bg-brand-900 p-2 shadow-2xl ring-1 ring-gray-900/10">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-action/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-brand-500/20 rounded-full blur-3xl"></div>
                
                {/* Placeholder for Dashboard Image */}
                <div className="relative rounded-xl bg-slate-800 aspect-[16/10] overflow-hidden flex items-center justify-center border border-slate-700">
                   <div className="text-slate-500 font-medium">Dashboard Preview UI</div>
                </div>
              </div>
            </div>

          </div>
        </Container>
      </section>

      {/* SOCIAL PROOF SECTION */}
      {/* Strategy: Bandwagon effect immediately after Hero. */}
      <section className="py-10 border-y border-gray-200 bg-white">
        <Container>
          <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-widest mb-8">
            Trusted by 10,000+ Dropshippers scaling on
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Placeholders for Logos - Using text for now */}
            {['Shopify', 'TikTok Shop', 'Depop', 'WooCommerce', 'Etsy'].map((brand) => (
              <div key={brand} className="flex items-center justify-center font-bold text-xl text-slate-400">
                {brand}
              </div>
            ))}
          </div>
        </Container>
      </section>
      
      {/* More sections (Features, Pricing) will go here in Phase 2/3 */}
      <div className="h-40"></div>
    </div>
  );
}