"use client";

import { useState, useEffect } from "react";
import { X, Copy, CheckCircle2, Calculator, Wand2, Loader2, Save, Sparkles, RefreshCw } from "lucide-react";

interface ListingWizardProps {
  product: any;
  onClose: () => void;
}

export default function ListingWizard({ product, onClose }: ListingWizardProps) {
  // If we already have a saved description, start at the "result" step
  const [step, setStep] = useState<"options" | "result">(product.generatedDesc ? "result" : "options");

  // User Preferences
  const [condition, setCondition] = useState(product.condition || "");
  const [era, setEra] = useState(product.era || "");
  const [gender, setGender] = useState(product.gender || "");
  const [style, setStyle] = useState(product.style || "");

  // Financials
  const [supplierPrice, setSupplierPrice] = useState<string>("");
  const [sellingPrice, setSellingPrice] = useState<string>(product.price.toString());
  const [profit, setProfit] = useState<number | null>(null);

  // AI State
  const [generatedDesc, setGeneratedDesc] = useState(product.generatedDesc || "");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const sell = parseFloat(sellingPrice) || 0;
    const cost = parseFloat(supplierPrice) || 0;
    
    if (sell > 0 && cost > 0) {
      const fees = sell * 0.13;
      const net = sell - cost - fees;
      setProfit(parseFloat(net.toFixed(2)));
    } else {
      setProfit(null);
    }
  }, [supplierPrice, sellingPrice]);

  const saveToDb = async (desc: string) => {
    setSaving(true);
    try {
        await fetch("/api/product/save", {
            method: "POST",
            body: JSON.stringify({
                id: product.id,
                generatedDesc: desc,
                preferences: { condition, era, gender, style }
            })
        });
    } catch(e) {
        console.error(e);
    } finally {
        setSaving(false);
    }
  };

  const generateWithAI = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({
            title: product.title,
            aesthetic: product.aesthetic,
            price: sellingPrice,
            imageUrl: product.imageUrl, 
            preferences: { condition, era, gender, style }
        }),
      });
      
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `Server Error ${res.status}`);
      }
      
      setGeneratedDesc(data);
      setStep("result");
      saveToDb(data);

    } catch (e: any) {
      alert(`Generation Failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Sparkles className="text-purple-500 fill-purple-500" size={20} /> 
            {step === "options" ? "Listing Setup" : "AI Magic Result"}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === "options" ? (
             <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-2 text-sm text-gray-400 font-bold mb-3">
                        <Calculator size={14} /> Quick Profit Check
                    </div>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 uppercase">Supplier Cost</label>
                            <input type="number" value={supplierPrice} onChange={(e) => setSupplierPrice(e.target.value)} placeholder="$5.00" className="w-full bg-black border border-gray-700 rounded-lg p-2 text-white text-sm" />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 uppercase">Selling Price</label>
                            <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-2 text-white text-sm" />
                        </div>
                        <div className="flex-1 text-right">
                             <p className="text-[10px] text-gray-500 uppercase">Est. Profit</p>
                             <p className={`text-xl font-mono font-bold ${profit && profit > 0 ? 'text-green-400' : 'text-gray-600'}`}>{profit ? `$${profit}` : "--"}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="font-bold text-white">Tell the AI about this item:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Condition</label>
                            <div className="space-y-2">
                                {["Brand New", "Like New", "Vintage Used", "Thrifted"].map(opt => (
                                    <label key={opt} className="flex items-center gap-2 cursor-pointer group"><input type="radio" name="cond" checked={condition === opt} onChange={() => setCondition(opt)} className="accent-purple-500" /><span className="text-sm text-gray-300 group-hover:text-white">{opt}</span></label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Era</label>
                            <div className="space-y-2">
                                {["Modern", "Y2K", "90s Grunge", "80s Retro"].map(opt => (
                                    <label key={opt} className="flex items-center gap-2 cursor-pointer group"><input type="radio" name="era" checked={era === opt} onChange={() => setEra(opt)} className="accent-purple-500" /><span className="text-sm text-gray-300 group-hover:text-white">{opt}</span></label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Style / Core</label>
                            <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-2 text-sm text-white">
                                <option value="">Select Style...</option>
                                <option value="Streetwear">Streetwear</option>
                                <option value="Coquette">Coquette / Fairy</option>
                                <option value="Goth / Emo">Goth / Emo</option>
                                <option value="Cyberpunk">Cyberpunk</option>
                                <option value="Boho">Boho / Indie</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Gender</label>
                            <div className="flex gap-4">
                                {["Womens", "Mens", "Unisex"].map(opt => (
                                    <label key={opt} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="gen" checked={gender === opt} onChange={() => setGender(opt)} className="accent-purple-500" /><span className="text-sm text-gray-300">{opt}</span></label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <button onClick={generateWithAI} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20">
                    {loading ? <Loader2 className="animate-spin" /> : <Wand2 />}
                    {loading ? "Analyzing Image & Writing..." : "Generate Description"}
                </button>
             </div>
          ) : (
             <div className="space-y-4 h-full flex flex-col animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400">Review & Edit before copying.</p>
                    <button onClick={() => setStep("options")} className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition">
                        <RefreshCw size={12} /> Regenerate
                    </button>
                </div>
                {/* BIG TEXT BOX */}
                <textarea 
                    value={generatedDesc} 
                    onChange={(e) => setGeneratedDesc(e.target.value)} 
                    className="w-full h-96 bg-black border border-gray-700 rounded-xl p-4 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none leading-relaxed font-mono" 
                />
                <div className="flex gap-3 pt-2">
                    <button onClick={() => saveToDb(generatedDesc)} className="px-6 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition flex items-center gap-2">{saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save</button>
                    <button onClick={() => { navigator.clipboard.writeText(generatedDesc); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex-1 bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition flex justify-center items-center gap-2">{copied ? <CheckCircle2 size={18} className="text-green-600" /> : <Copy size={18} />} {copied ? "Copied!" : "Copy to Depop"}</button>
                </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}