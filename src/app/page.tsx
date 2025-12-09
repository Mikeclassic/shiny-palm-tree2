import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Container } from "@/components/ui/Container";
import { FeatureSection } from "@/components/landing/FeatureSection";
import { Testimonials } from "@/components/landing/Testimonials";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-action selection:text-white font-sans">
      <Navbar />

      {/* --- HERO SECTION --- */}
      <section className="pt-16 pb-20 lg:pt-32 lg:pb-28 overflow-hidden relative">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 z-10">
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

            <div className="relative mx-auto w-full max-w-[600px] lg:max-w-none z-10">
              <div className="relative rounded-2xl bg-brand-900 p-2 shadow-2xl ring-1 ring-gray-900/10 transform rotate-1 hover:rotate-0 transition duration-500">
                 {/* Dashboard Mockup Placeholder */}
                <div className="relative rounded-xl bg-slate-800 aspect-[16/10] overflow-hidden flex items-center justify-center border border-slate-700">
                   <div className="text-slate-500 font-medium">Dashboard Preview UI</div>
                </div>
              </div>
            </div>

          </div>
        </Container>
      </section>

      {/* --- SOCIAL PROOF --- */}
      <section className="py-10 border-y border-gray-200 bg-white">
        <Container>
          <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-widest mb-8">
            Trusted by 10,000+ Dropshippers scaling on
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
             {/* Replace with SVGs in production */}
            {['Shopify', 'TikTok Shop', 'Depop', 'WooCommerce', 'Etsy'].map((brand) => (
              <div key={brand} className="flex items-center justify-center font-bold text-xl text-slate-400 cursor-default hover:text-brand-900 transition">
                {brand}
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* --- FEATURES (ZIG ZAG) --- */}
      <div id="product" className="bg-slate-50/50">
        <FeatureSection 
            title="Find Winning Products Before They Go Viral"
            description="Our bot scrapes 300+ top Shopify stores daily to find trending items. We automatically match them with suppliers on AliExpress so you can source instantly."
            benefits={[
                "Daily scraped trends from FashionNova, Gymshark, & more",
                "Instant supplier matching (No more manual searching)",
                "Real-time profit calculator built-in"
            ]}
            imageSide="right"
            imageLabel="Product Sourcing Dashboard"
        />

        <FeatureSection 
            title="AI Copywriting That Actually Sells"
            description="Stop staring at a blank screen. Our AI analyzes your product image and writes SEO-optimized titles, descriptions, and hashtags in seconds."
            benefits={[
                "Optimized for Depop, Vinted, and Shopify SEO",
                "Choose your tone: Luxury, Hype, or Professional",
                "Auto-generates relevant hashtags"
            ]}
            imageSide="left"
            imageLabel="AI Writer Interface"
        />

        <FeatureSection 
            title="Magic Studio: Professional Photos in 1 Click"
            description="Bad lighting? Messy room? No problem. Our AI removes the background and places your product in a professional studio setting instantly."
            benefits={[
                "10+ Professional Templates (Marble, Studio, Nature)",
                "No Photoshop skills required",
                "High-resolution downloads ready for upload"
            ]}
            imageSide="right"
            imageLabel="Background Changer Tool"
        />
      </div>

      {/* --- TESTIMONIALS --- */}
      <Testimonials />

      {/* --- FINAL CTA --- */}
      <section className="py-24 bg-white">
          <Container>
              <div className="bg-brand-900 rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden">
                  <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                      <h2 className="text-3xl md:text-5xl font-bold">Ready to scale your empire?</h2>
                      <p className="text-slate-300 text-lg">Join the fastest growing community of automated dropshippers today.</p>
                      <Link href="/sign-up">
                        <button className="bg-action hover:bg-action-hover text-white text-lg px-10 py-4 rounded-xl font-bold shadow-xl shadow-orange-500/20 transition-transform hover:-translate-y-1 mt-4">
                            Get Started for Free
                        </button>
                      </Link>
                  </div>
                  
                  {/* Decorative */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-action/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
              </div>
          </Container>
      </section>

    </div>
  );
}