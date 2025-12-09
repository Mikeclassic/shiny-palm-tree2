import { Star } from "lucide-react";
import { Container } from "@/components/ui/Container";

const REVIEWS = [
  {
    name: "Sarah Jenkins",
    role: "Top Rated Seller on Depop",
    quote: "I used to spend 4 hours a day writing descriptions. GlowSeller does it in 10 minutes. My sales increased by 40% in the first month.",
    image: "SJ"
  },
  {
    name: "Mike Chen",
    role: "E-commerce Entrepreneur",
    quote: "The background remover is better than Photoshop. It turns messy thrift store photos into professional catalog images instantly.",
    image: "MC"
  },
  {
    name: "Jessica Doe",
    role: "Vintage Reseller",
    quote: "Finding winning products was my nightmare. The daily scraper finds items that actually sell. This tool is a cheat code.",
    image: "JD"
  }
];

export function Testimonials() {
  return (
    <section className="py-24 bg-brand-900 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-action rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-20 w-72 h-72 bg-purple-500 rounded-full blur-[100px]"></div>
      </div>

      <Container className="relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Don't just take our word for it</h2>
          <p className="text-slate-400 text-lg">Join 10,000+ sellers automating their empire.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {REVIEWS.map((review, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors">
              <div className="flex gap-1 mb-6">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={16} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-lg text-slate-200 mb-8 leading-relaxed">"{review.quote}"</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-action to-pink-600 flex items-center justify-center font-bold text-sm">
                    {review.image}
                </div>
                <div>
                    <p className="font-bold text-white">{review.name}</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">{review.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}