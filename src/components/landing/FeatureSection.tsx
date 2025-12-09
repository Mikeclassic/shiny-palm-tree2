import { Check } from "lucide-react";
import { Container } from "@/components/ui/Container";

interface FeatureProps {
  title: string;
  description: string;
  benefits: string[];
  imageSide: "left" | "right";
  imageLabel: string; // Placeholder text for the visual
}

export function FeatureSection({ title, description, benefits, imageSide, imageLabel }: FeatureProps) {
  return (
    <section className="py-20 lg:py-32 overflow-hidden">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          {/* Text Content */}
          <div className={`flex flex-col space-y-6 ${imageSide === "left" ? "lg:order-2" : "lg:order-1"}`}>
            <h2 className="text-3xl md:text-4xl font-extrabold text-brand-900 leading-tight">
              {title}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              {description}
            </p>
            
            <ul className="space-y-4 pt-4">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Check size={14} className="text-green-600" strokeWidth={3} />
                  </div>
                  <span className="text-base font-medium text-slate-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Visual / Image */}
          <div className={`relative ${imageSide === "left" ? "lg:order-1" : "lg:order-2"}`}>
            {/* Decorative blob */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-brand-100 to-purple-100 rounded-full blur-3xl -z-10 opacity-60`} />
            
            <div className="relative rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden aspect-[4/3] flex items-center justify-center group hover:scale-[1.02] transition-transform duration-500">
               {/* In a real app, use <Image /> here */}
               <div className="text-center p-8">
                  <span className="block text-4xl mb-2">📸</span>
                  <span className="font-bold text-slate-400 uppercase tracking-widest">{imageLabel}</span>
               </div>
            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}