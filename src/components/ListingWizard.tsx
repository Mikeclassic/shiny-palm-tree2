"use client";

import { useState, useEffect, useRef } from "react";
import { X, Copy, CheckCircle2, Calculator, Wand2, Loader2, Save, Sparkles, Image as ImageIcon, Download, ExternalLink, Search, DollarSign, Type, FileText } from "lucide-react";
import Image from "next/image";

const SCENE_TEMPLATES = [
  { id: 't1', name: 'White Podium', prompt: 'a pristine white round podium, professional studio lighting, minimalist' },
  { id: 't2', name: 'Luxury Marble', prompt: 'a luxury white marble surface with soft window reflection, premium feel' },
  { id: 't3', name: 'Cozy Living Room', prompt: 'a cozy modern living room with soft beige furniture in the blurred background' },
  { id: 't4', name: 'Sleek Tech Desk', prompt: 'a modern wooden desk setup with blurred monitor and led lights in background' },
  { id: 't5', name: 'Sunny Garden', prompt: 'a sunny outdoor garden table with green leaves and bokeh background' },
  { id: 't6', name: 'Urban Street', prompt: 'a cool urban concrete street setting with city lights in the background' },
  { id: 't7', name: 'Kitchen Counter', prompt: 'a clean modern kitchen island with bright airy lighting' },
  { id: 't8', name: 'Bathroom Vanity', prompt: 'a clean white bathroom vanity shelf next to a mirror, spa atmosphere' },
  { id: 't9', name: 'Neon Cyberpunk', prompt: 'a dark surface with neon purple and blue lighting, futuristic vibe' },
  { id: 't10', name: 'Baby Nursery', prompt: 'a soft pastel colored nursery room with blurred toys in background' },
  { id: 't11', name: 'Gym / Fitness', prompt: 'a gym floor texture with blurred workout equipment in the background' },
  { id: 't12', name: 'Silk Fabric', prompt: 'smooth champagne colored silk fabric folds, elegant and soft texture' },
];

interface ListingWizardProps {
  product: any;
  onClose: () => void;
}

export default function ListingWizard({ product, onClose }: ListingWizardProps) {
  const [activeTab, setActiveTab] = useState<"text" | "media" | "profit">("text");

  // STATE
  const [tone, setTone] = useState(product.style || "Persuasive");
  const [category, setCategory] = useState(product.era || "General");
  const [currentDesc, setCurrentDesc] = useState(product.generatedDesc || "");
  const [loadingText, setLoadingText] = useState(false);
  const [copied, setCopied] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState(SCENE_TEMPLATES[0]);
  const [resultImage, setResultImage] = useState(product.generatedImage || ""); 
  const [loadingImage, setLoadingImage] = useState(false);

  const [supplierPrice, setSupplierPrice] = useState<string>(product.supplierPrice?.toString() || "");
  const [sellingPrice, setSellingPrice] = useState<string>(product.price.toString());
  const [profit, setProfit] = useState<number | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll Reset
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo(0, 0);
    }
  }, [activeTab]);

  // Profit Calculation
  useEffect(() => {
    const sell = parseFloat(sellingPrice) || 0;
    const cost = parseFloat(supplierPrice) || 0;
    if (sell > 0 && cost > 0) {
      const net = sell - cost;
      setProfit(parseFloat(net.toFixed(2)));
    } else {
      setProfit(null);
    }
  }, [supplierPrice, sellingPrice]);

  // ACTIONS
  const saveEverything = async () => {
    try {
        await fetch("/api/product/save", {
            method: "POST",
            body: JSON.stringify({
                id: product.id,
                generatedDesc: currentDesc, 
                generatedImage: resultImage,
                preferences: { style: tone, era: category },
            })
        });
    } catch (e) {
        console.error("Auto-save failed", e);
    }
  };

  const optimizeWithAI = async () => {
    setLoadingText(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({
            title: product.title,
            originalDesc: product.originalDesc || product.title, 
            tone: tone
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCurrentDesc(data); 
      await fetch("/api/product/save", {
        method: "POST",
        body: JSON.stringify({
            id: product.id,
            generatedDesc: data,
            preferences: { style: tone }
        })
      });
    } catch (e: any) {
      alert(`Optimization Failed: ${e.message}`);
    } finally {
      setLoadingText(false);
    }
  };

  const generateBackground = async () => {
    setLoadingImage(true);
    const finalPrompt = `Change the background with ${selectedTemplate.prompt}`;
    try {
        const res = await fetch("/api/ai/background-change", {
            method: "POST",
            body: JSON.stringify({
                productImageUrl: product.imageUrl,
                prompt: finalPrompt
            })
        });
        const data = await res.json();
        if (data.output) {
            setResultImage(data.output);
            await fetch("/api/product/save", {
                method: "POST",
                body: JSON.stringify({
                    id: product.id,
                    generatedImage: data.output,
                    preferences: { style: tone }
                })
            });
        } else {
            alert("AI Failed to process image.");
        }
    } catch (e) {
        console.error(e);
        alert("Something went wrong.");
    } finally {
        setLoadingImage(false);
    }
  };

  const handleDownload = async () => {
    if (!resultImage) return;
    try {
        const response = await fetch(resultImage);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `glowseller-${product.id}.png`; 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        window.open(resultImage, '_blank');
    }
  };

  // FIX 1: RESTORE GOOGLE LENS URL (Visual Search + Text Context)
  const query = `site:aliexpress.com ${product.title}`;
  const manualSearchUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=${encodeURIComponent(query)}`;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center sm:p-4 overflow-hidden">
      
      <div className="bg-white w-full h-[100dvh] sm:h-[90vh] sm:max-w-6xl sm:rounded-2xl shadow-2xl flex flex-col border-0 sm:border border-slate-200 overflow-hidden">
        
        {/* HEADER */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 z-10">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                <Image src={product.imageUrl} alt="Product" fill className="object-cover" />
             </div>
             <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm truncate max-w-[150px] sm:max-w-md">{product.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-bold border border-brand-100 whitespace-nowrap">
                        {category}
                    </span>
                </div>
             </div>
          </div>
          <div className="flex gap-2">
              <button onClick={() => { saveEverything(); onClose(); }} className="px-3 py-2 sm:px-5 sm:py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition flex items-center gap-2 shadow-lg">
                <Save size={14} /> <span className="hidden sm:inline">Save & Close</span>
              </button>
              <button onClick={onClose} className="p-2 sm:p-2.5 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
          </div>
        </div>

        {/* FIX 2: TABS (GRID LAYOUT - NO SCROLL) */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50/50 shrink-0">
            <button 
                onClick={() => setActiveTab("text")}
                className={`py-3 sm:py-4 px-2 text-[10px] sm:text-sm font-bold flex items-center justify-center gap-1 sm:gap-2 border-b-2 transition whitespace-nowrap ${activeTab === "text" ? "border-slate-900 text-slate-900 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
            >
                <Type size={14} className="sm:w-4 sm:h-4" /> AI Copywriter
            </button>
            <button 
                onClick={() => setActiveTab("media")}
                className={`py-3 sm:py-4 px-2 text-[10px] sm:text-sm font-bold flex items-center justify-center gap-1 sm:gap-2 border-b-2 transition whitespace-nowrap ${activeTab === "media" ? "border-slate-900 text-slate-900 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
            >
                <ImageIcon size={14} className="sm:w-4 sm:h-4" /> Magic Studio
            </button>
            <button 
                onClick={() => setActiveTab("profit")}
                className={`py-3 sm:py-4 px-2 text-[10px] sm:text-sm font-bold flex items-center justify-center gap-1 sm:gap-2 border-b-2 transition whitespace-nowrap ${activeTab === "profit" ? "border-slate-900 text-slate-900 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
                <DollarSign size={14} className="sm:w-4 sm:h-4" /> Profit
            </button>
        </div>

        {/* CONTENT AREA */}
        <div 
            ref={contentRef} 
            className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/30 pb-32" 
        >
            
            {/* --- TAB 1: COPYWRITER --- */}
            {activeTab === "text" && (
                <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 pb-24">
                    
                    {/* LEFT: CONTROLS */}
                    <div className="lg:col-span-1 space-y-4 flex flex-col shrink-0 order-1 lg:order-1">
                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold mb-2 flex items-center gap-2">
                                <Wand2 size={12} /> Tone of Voice
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {["Persuasive", "Luxury", "Viral", "Friendly", "Professional", "Minimalist"].map(opt => (
                                    <button 
                                        key={opt} 
                                        onClick={() => setTone(opt)} 
                                        className={`py-2 text-[10px] sm:text-xs rounded-lg border font-medium transition ${tone === opt ? "bg-slate-900 border-slate-900 text-white shadow-md" : "bg-white border-slate-200 text-slate-600 hover:border-brand-300"}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-col min-h-0 flex">
                            <label className="text-xs text-slate-500 uppercase font-bold mb-2 flex gap-2 items-center"><FileText size={12}/> Original Source</label>
                            <div className="bg-white border border-slate-200 rounded-xl p-3 overflow-y-auto custom-scrollbar shadow-sm h-32 sm:max-h-48 lg:flex-1">
                                <p className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed">
                                    {product.originalDesc || product.title}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: EDITOR */}
                    <div className="lg:col-span-2 flex flex-col flex-1 min-h-[300px] order-2 lg:order-2">
                        <label className="text-xs text-slate-500 uppercase font-bold mb-2">Optimized Content</label>
                        <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 sm:p-6 relative group shadow-sm hover:shadow-md transition">
                            {currentDesc ? (
                                <textarea 
                                    value={currentDesc}
                                    onChange={(e) => setCurrentDesc(e.target.value)}
                                    className="w-full h-full min-h-[250px] bg-transparent border-none focus:ring-0 text-sm text-slate-700 resize-none font-mono leading-relaxed custom-scrollbar outline-none"
                                />
                            ) : (
                                <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-slate-400">
                                    <Type size={48} className="mb-4 opacity-20" />
                                    <p className="text-sm font-medium">Select a tone and click Generate</p>
                                </div>
                            )}
                            
                            {currentDesc && (
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(currentDesc); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
                                    className="absolute top-4 right-4 bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-200 transition shadow-sm"
                                >
                                    {copied ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 2: MAGIC STUDIO --- */}
            {activeTab === "media" && (
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 pb-24">
                    
                    {/* CONTROLS */}
                    <div className="lg:col-span-1 flex flex-col shrink-0 order-2 lg:order-1">
                        <label className="text-xs text-slate-500 uppercase font-bold mb-3 block">Choose Environment</label>
                        <div className="grid grid-cols-2 gap-3 pb-8">
                            {SCENE_TEMPLATES.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTemplate(t)}
                                    className={`p-3 rounded-xl border text-left transition relative ${selectedTemplate.id === t.id ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-200' : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'}`}
                                >
                                    <span className="text-[11px] font-bold block mb-1 text-slate-900">{t.name}</span>
                                    <span className="text-[10px] text-slate-500 line-clamp-1">{t.prompt.substring(0, 30)}...</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* PREVIEW */}
                    <div className="lg:col-span-1 bg-slate-200/50 border border-slate-200 rounded-xl flex items-center justify-center relative overflow-hidden bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] min-h-[350px] flex-1 order-1 lg:order-2">
                        {resultImage ? (
                            <div className="relative w-full h-full p-6 flex flex-col items-center justify-center animate-in fade-in zoom-in">
                                <div className="relative w-full h-full max-h-[450px] aspect-square bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 p-2">
                                    <img src={resultImage} className="w-full h-full object-contain" alt="Result" />
                                </div>
                                <div className="absolute bottom-6 flex gap-3">
                                    <button onClick={handleDownload} className="bg-white text-slate-900 px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-slate-50 border border-slate-200 shadow-lg">
                                        <Download size={14} /> HD
                                    </button>
                                    <button onClick={() => setResultImage("")} className="bg-slate-900 text-white px-5 py-2.5 rounded-full text-xs font-bold hover:bg-slate-800 shadow-lg">
                                        Reset
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="relative w-full h-full p-8 flex items-center justify-center transition duration-500">
                                <div className="relative w-full max-w-sm aspect-square bg-white rounded-xl shadow-xl p-4 border border-slate-200">
                                    <Image src={product.imageUrl} alt="Original" fill className="object-contain p-4" />
                                    <div className="absolute inset-x-0 bottom-4 text-center">
                                        <span className="bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-[10px] font-medium shadow-sm">Original Image</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- TAB 3: PROFIT --- */}
            {activeTab === "profit" && (
                <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in pt-4 pb-24">
                    <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 text-brand-600 mb-6">
                            <div className="p-2 bg-brand-50 rounded-lg"><Calculator size={20} /></div>
                            <h3 className="font-bold text-lg text-slate-900">Profit Calculator</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 items-end">
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Supplier Cost</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-slate-400">$</span>
                                    <input 
                                        type="number" 
                                        value={supplierPrice} 
                                        onChange={(e) => setSupplierPrice(e.target.value)} 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-8 pr-4 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Selling Price</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-slate-400">$</span>
                                    <input 
                                        type="number" 
                                        value={sellingPrice} 
                                        onChange={(e) => setSellingPrice(e.target.value)} 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-8 pr-4 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition"
                                    />
                                </div>
                            </div>
                            <div className="bg-brand-900 rounded-xl p-4 text-right shadow-lg shadow-brand-900/20">
                                <p className="text-[10px] text-brand-200 uppercase font-bold mb-1">Net Profit</p>
                                <p className={`text-3xl font-mono font-bold ${profit && profit > 0 ? 'text-green-400' : 'text-white'}`}>
                                    {profit ? `$${profit}` : "--"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 text-orange-600 mb-6">
                            <div className="p-2 bg-orange-50 rounded-lg"><ExternalLink size={20} /></div>
                            <h3 className="font-bold text-lg text-slate-900">Sourcing Links</h3>
                        </div>
                        <div className="space-y-4">
                            <a href={product.sourceUrl} target="_blank" className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition group">
                                <div className="flex items-center gap-3">
                                    <span className="bg-slate-200 px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-600 uppercase tracking-wide">Competitor</span>
                                    <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">View Original Listing</span>
                                </div>
                                <ExternalLink size={16} className="text-slate-400 group-hover:text-slate-600" />
                            </a>

                            {product.supplierUrl ? (
                                <a href={product.supplierUrl} target="_blank" className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100/80 hover:border-green-300 transition group shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-green-600 px-2.5 py-1 rounded-md text-[10px] font-bold text-white uppercase tracking-wide">Supplier</span>
                                        <span className="text-sm font-semibold text-green-800 group-hover:text-green-900">Buy on AliExpress</span>
                                    </div>
                                    <ExternalLink size={16} className="text-green-600 group-hover:text-green-800" />
                                </a>
                            ) : (
                                <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
                                    <p className="text-slate-500 text-sm mb-3">No automated match found.</p>
                                </div>
                            )}

                             {/* DEEP SEARCH LINK */}
                             <a 
                                href={manualSearchUrl} 
                                target="_blank" 
                                className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="bg-orange-600 px-2.5 py-1 rounded-md text-[10px] font-bold text-white uppercase tracking-wide">Manual</span>
                                    <span className="text-sm font-semibold text-orange-800 group-hover:text-orange-900">Deep Supplier Search</span>
                                </div>
                                <Search size={16} className="text-orange-600" />
                            </a>
                        </div>
                    </div>
                </div>
            )}

        </div>

        {/* FIXED STICKY FOOTER (Primary Actions) */}
        {activeTab !== "profit" && (
            <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex items-center justify-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] absolute bottom-0 left-0 right-0">
                {activeTab === "text" && (
                     <button 
                        onClick={optimizeWithAI} 
                        disabled={loadingText}
                        className="w-full max-w-md bg-slate-900 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg hover:bg-slate-800 active:scale-95 disabled:opacity-50"
                    >
                        {loadingText ? <Loader2 className="animate-spin" /> : <Sparkles size={16} className="text-yellow-300 fill-yellow-300" />}
                        {loadingText ? "Rewriting..." : "Generate High-Converting Copy ✨"}
                    </button>
                )}
                {activeTab === "media" && (
                    <button 
                        onClick={generateBackground}
                        disabled={loadingImage}
                        className="w-full max-w-md bg-slate-900 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg hover:bg-slate-800 active:scale-95 disabled:opacity-50"
                    >
                        {loadingImage ? <Loader2 className="animate-spin" /> : <Sparkles size={16} className="text-yellow-300 fill-yellow-300" />}
                        {loadingImage ? "Rendering Scene..." : "Generate Professional Scene ✨"}
                    </button>
                )}
            </div>
        )}
      </div>
    </div>
  );
}