"use client";

import { useState } from "react";
import { Check, Zap } from "lucide-react";
import { Container } from "@/components/ui/Container";
import Link from "next/link";

const PLANS = [
  {
    name: "Starter",
    description: "Perfect for testing the waters.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "Daily Product Scraper (Top 10)",
      "5 AI Descriptions / day",
      "Basic Background Remover",
      "Standard Support"
    ],
    cta: "Start for Free",
    popular: false,
  },
  {
    name: "Pro Seller",
    description: "For dropshippers ready to scale.",
    monthlyPrice: 29,
    yearlyPrice: 24, // $290/yr usually
    features: [
      "Unlimited Daily Scraper",
      "Unlimited AI Copywriting",
      "Unlimited Magic Studio (HD)",
      "Profit Calculator",
      "AliExpress Supplier Linker",
      "Priority Support"
    ],
    cta: "Start Free Trial",
    popular: true, // The "Nudge"
  },
  {
    name: "Empire",
    description: "For agencies and power users.",
    monthlyPrice: 99,
    yearlyPrice: 79,
    features: [
      "Everything in Pro",
      "Multiple User Seats (3)",
      "API Access",
      "Dedicated Account Manager",
      "Early Access to Beta Features",
      "Custom Branding"
    ],
    cta: "Contact Sales",
    popular: false,
  }
];

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="pricing" className="py-24 bg-slate-50 relative overflow-hidden">
      <Container>
        {/* HEADER */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-extrabold text-brand-900">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-slate-600">
            No hidden fees. Start for free and upgrade as you grow.
          </p>

          {/* TOGGLE */}
          <div className="flex items-center justify-center mt-8">
            <div className="bg-white p-1 rounded-full border border-slate-200 flex items-center relative">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${!isAnnual ? 'bg-brand-900 text-white shadow-lg' : 'text-slate-500 hover:text-brand-900'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${isAnnual ? 'bg-brand-900 text-white shadow-lg' : 'text-slate-500 hover:text-brand-900'}`}
              >
                Yearly <span className="text-green-400 text-xs ml-1">-20%</span>
              </button>
            </div>
          </div>
        </div>

        {/* CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 items-start">
          {PLANS.map((plan) => (
            <div 
              key={plan.name}
              className={`
                relative bg-white rounded-2xl border p-8 transition-all duration-300
                ${plan.popular 
                  ? 'border-action ring-2 ring-action shadow-2xl scale-105 z-10' 
                  : 'border-slate-200 hover:border-brand-200 hover:shadow-xl'
                }
              `}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-action to-pink-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1 shadow-lg">
                  <Zap size={12} fill="currentColor" /> Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold text-brand-900">{plan.name}</h3>
                <p className="text-sm text-slate-500 mt-2">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-brand-900">
                    ${isAnnual ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-slate-500 font-medium">/mo</span>
                </div>
                {isAnnual && plan.monthlyPrice > 0 && (
                    <p className="text-xs text-green-600 font-bold mt-2">
                        Billed ${plan.yearlyPrice * 12} yearly
                    </p>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3">
                    <Check size={18} className={`flex-shrink-0 ${plan.popular ? 'text-action' : 'text-slate-400'}`} strokeWidth={3} />
                    <span className="text-sm text-slate-700">{feat}</span>
                  </li>
                ))}
              </ul>

              <Link href="/sign-up" className="block">
                <button 
                  className={`
                    w-full py-4 rounded-xl font-bold transition-transform active:scale-95
                    ${plan.popular 
                      ? 'bg-action hover:bg-action-hover text-white shadow-lg shadow-orange-500/20' 
                      : 'bg-slate-100 hover:bg-slate-200 text-brand-900'
                    }
                  `}
                >
                  {plan.cta}
                </button>
              </Link>
              
              {plan.popular && (
                  <p className="text-xs text-center text-slate-400 mt-4">
                      30-day money-back guarantee
                  </p>
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}