"use client";

import { useState, useEffect } from "react";
import { X, Copy, CheckCircle2, Calculator, Wand2, Loader2, Save, Sparkles, Image as ImageIcon, Download, ExternalLink, Search, DollarSign, Tag, Type } from "lucide-react";
import Image from "next/image";

// DIVERSE DROPSHIPPING TEMPLATES
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

  // --- TAB 1: AI COPYWRITER ---
  const [tone, setTone] = useState(product.style || "Persuasive");
  const [category, setCategory] = useState(product.era || "General");
  const [generatedDesc, setGeneratedDesc] = useState(product.generatedDesc || "");
  const [loadingText, setLoadingText] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- TAB 2: MAGIC STUDIO ---
  const [selectedTemplate, setSelectedTemplate] = useState(SCENE_TEMPLATES[0]);
  // LOAD SAVED IMAGE IF EXISTS
  const [resultImage, setResultImage] = useState(product.generatedImage || ""); 
  const [loadingImage, setLoadingImage] = useState(false);

  // --- TAB 3: PROFIT STATE ---
  const [supplierPrice, setSupplierPrice] = useState<string>(product.supplierPrice?.toString() || "");
  const [sellingPrice, setSellingPrice] = useState<string>(product.price.toString());
  const [profit, setProfit] = useState<number | null>(null);

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

  // --- MASTER SAVE FUNCTION ---
  const saveEverything = async () => {
    try {
        await fetch("/api/product/save", {
            method: "POST",
            body: JSON.stringify({
                id: product.id,
                generatedDesc: generatedDesc, 
                generatedImage: resultImage, // Saves the AI Image
                preferences: { style: tone, era: category },
            })
        });
    } catch (e) {
        console.error("Auto-save failed", e);
    }
  };

  const generateWithAI = async () => {
    setLoadingText(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({
            title: product.title,
            price: sellingPrice,
            imageUrl: product.imageUrl, 
            preferences: { style: tone, era: category }
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedDesc(data);
      
      // Auto-save Text
      await fetch("/api/product/save", {
        method: "POST",
        body: JSON.stringify({
            id: product.id,
            generatedDesc: data,
            preferences: { style: tone, era: category }
        })
      });

    } catch (e: any) {
      alert(`Generation Failed: ${e.message}`);
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
            
            // AUTO-SAVE IMAGE TO DB IMMEDIATELY
            await fetch("/api/product/save", {
                method: "POST",
                body: JSON.stringify({
                    id: product.id,
                    generatedImage: data.output,
                    preferences: { style: tone, era: category }
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

  // Google Search for "Deep Search"
  const manualSearchUrl = `https://www.google.com/search?q=site:aliexpress.com+${encodeURIComponent(product.title)}&tbm=isch`;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-950 border border-gray-800 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 relative rounded-md overflow-hidden border border-gray-700">
                <Image src={product.imageUrl} alt="Product" fill className="object-cover" />
             </div>
             <div>
                <h3 className="font-bold text-white text-sm line-clamp-1 max-w-md">{product.title}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded border border-purple-800">
                        {category}
                    </span>
                    <span className="text-xs text-gray-500">One-Stop Studio</span>
                </div>
             </div>
          </div>
          <div className="flex gap-2">
              <button onClick={() => { saveEverything(); onClose(); }} className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-gray-200 transition flex items-center gap-2">
                <Save size={14} /> Save & Close
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition text-gray-400">
                <X size={20} />
              </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-800 bg-gray-900/30">
            <button 
                onClick={() => setActiveTab("text")}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${activeTab === "text" ? "border-purple-500 text-white bg-purple-500/10" : "border-transparent text-gray-500 hover:text-gray-300"}`}
            >
                <Type size={16} /> AI Copywriter
            </button>
            <button 
                onClick={() => setActiveTab("media")}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${activeTab === "media" ? "border-pink-500 text-white bg-pink-500/10" : "border-transparent text-gray-500 hover:text-gray-300"}`}
            >
                <ImageIcon size={16} /> Magic Studio
            </button>
            <button 
                onClick={() => setActiveTab("profit")}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${activeTab === "profit" ? "border-green-500 text-white bg-green-500/10" : "border-transparent text-gray-500 hover:text-gray-300"}`}
            >
                <DollarSign size={16} /> Profit & Sourcing
            </button>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6 bg-black">
            
            {/* --- TAB 1: COPYWRITER (UNIVERSAL) --- */}
            {activeTab === "text" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                    {/* Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-2 flex items-center gap-2">
                                    <Tag size={12} /> Product Category
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {["Fashion", "Home Decor", "Tech/Gadgets", "Beauty", "Pets", "Kids", "Fitness", "General"].map(opt => (
                                        <button key={opt} onClick={() => setCategory(opt)} className={`py-2 text-[10px] rounded-lg border transition ${category === opt ? "bg-purple-600 border-purple-600 text-white" : "border-gray-800 text-gray-400 hover:border-gray-600"}`}>{opt}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-2 flex items-center gap-2">
                                    <Wand2 size={12} /> Tone of Voice
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {["Persuasive", "Luxury/High-End", "Viral/Hype", "Friendly", "Professional", "Minimalist"].map(opt => (
                                        <button key={opt} onClick={() => setTone(opt)} className={`py-2 text-[10px] rounded-lg border transition ${tone === opt ? "bg-purple-600 border-purple-600 text-white" : "border-gray-800 text-gray-400 hover:border-gray-600"}`}>{opt}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={generateWithAI} 
                            disabled={loadingText}
                            className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2 mt-4 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                        >
                            {loadingText ? <Loader2 className="animate-spin" /> : <Sparkles size={16} className="text-yellow-600 fill-yellow-600" />}
                            {loadingText ? "Writing Magic..." : "Generate Description"}
                        </button>
                    </div>

                    {/* Output */}
                    <div className="lg:col-span-2 flex flex-col h-full">
                        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-4 relative group">
                            {generatedDesc ? (
                                <textarea 
                                    value={generatedDesc}
                                    onChange={(e) => setGeneratedDesc(e.target.value)}
                                    className="w-full h-full bg-transparent border-none focus:ring-0 text-sm text-gray-300 resize-none font-mono leading-relaxed custom-scrollbar"
                                    placeholder="AI output will appear here..."
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600">
                                    <Type size={32} className="mb-2 opacity-20" />
                                    <p className="text-sm">Select options and click Generate</p>
                                </div>
                            )}
                            
                            {generatedDesc && (
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(generatedDesc); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
                                    className="absolute top-4 right-4 bg-black/80 hover:bg-black text-white p-2 rounded-lg text-xs flex items-center gap-2 border border-gray-700 transition"
                                >
                                    {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 2: MAGIC STUDIO --- */}
            {activeTab === "media" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                    {/* Controls */}
                    <div className="lg:col-span-1 flex flex-col h-full">
                        <label className="text-xs text-gray-500 uppercase font-bold mb-3 block">Choose Environment</label>
                        <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1 flex-1 min-h-0 custom-scrollbar max-h-[400px]">
                            {SCENE_TEMPLATES.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTemplate(t)}
                                    className={`p-3 rounded-xl border text-left transition relative ${selectedTemplate.id === t.id ? 'border-pink-500 bg-pink-500/10' : 'border-gray-800 hover:border-gray-600 bg-gray-900'}`}
                                >
                                    <span className="text-[10px] font-bold block mb-1 text-white">{t.name}</span>
                                    <span className="text-[9px] text-gray-500 line-clamp-1">{t.prompt.substring(0, 30)}...</span>
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={generateBackground}
                            disabled={loadingImage}
                            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-3 rounded-xl mt-4 hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20"
                        >
                            {loadingImage ? <Loader2 className="animate-spin" /> : <Sparkles size={16} className="text-yellow-300 fill-yellow-300" />}
                            {loadingImage ? "Rendering Scene..." : "Generate Image"}
                        </button>
                    </div>

                    {/* Preview */}
                    <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-center relative overflow-hidden">
                        {/* Background Gradients */}
                        <div className="absolute top-0 right-0 p-32 bg-pink-600/10 blur-3xl rounded-full pointer-events-none"></div>
                        
                        {resultImage ? (
                            <div className="relative w-full h-full p-4 flex flex-col items-center justify-center animate-in fade-in zoom-in">
                                <div className="relative w-full h-full max-h-[400px] aspect-square">
                                    <img src={resultImage} className="w-full h-full object-contain drop-shadow-2xl" alt="Result" />
                                </div>
                                <div className="absolute bottom-4 flex gap-2">
                                    <button onClick={handleDownload} className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-gray-200">
                                        <Download size={14} /> Download HD
                                    </button>
                                    <button onClick={() => setResultImage("")} className="bg-black/50 text-white px-4 py-2 rounded-full text-xs font-bold border border-gray-600 hover:bg-black">
                                        Reset
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="relative w-full h-full p-8 flex items-center justify-center transition duration-500">
                                {/* CLEAN PREVIEW - NO OVERLAY */}
                                <Image src={product.imageUrl} alt="Original" fill className="object-contain p-4" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- TAB 3: PROFIT & SOURCING --- */}
            {activeTab === "profit" && (
                <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    
                    {/* Calculator */}
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                        <div className="flex items-center gap-2 text-green-400 mb-6">
                            <Calculator size={20} />
                            <h3 className="font-bold text-lg">Profit Calculator</h3>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-6 items-end">
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Supplier Cost</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                                    <input 
                                        type="number" 
                                        value={supplierPrice} 
                                        onChange={(e) => setSupplierPrice(e.target.value)} 
                                        className="w-full bg-black border border-gray-700 rounded-xl py-3 pl-8 pr-4 text-white font-mono"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Selling Price</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                                    <input 
                                        type="number" 
                                        value={sellingPrice} 
                                        onChange={(e) => setSellingPrice(e.target.value)} 
                                        className="w-full bg-black border border-gray-700 rounded-xl py-3 pl-8 pr-4 text-white font-mono"
                                    />
                                </div>
                            </div>
                            <div className="bg-black border border-gray-800 rounded-xl p-3 text-right">
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Net Profit</p>
                                <p className={`text-3xl font-mono font-bold ${profit && profit > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                                    {profit ? `$${profit}` : "--"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sourcing Links */}
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                        <div className="flex items-center gap-2 text-blue-400 mb-6">
                            <ExternalLink size={20} />
                            <h3 className="font-bold text-lg">Sourcing Links</h3>
                        </div>

                        <div className="space-y-3">
                            <a href={product.sourceUrl} target="_blank" className="flex items-center justify-between p-4 bg-black border border-gray-800 rounded-xl hover:border-gray-600 transition group">
                                <div className="flex items-center gap-3">
                                    <span className="bg-gray-800 p-2 rounded-lg text-xs font-bold text-gray-300">COMPETITOR</span>
                                    <span className="text-sm font-medium text-gray-300 group-hover:text-white">View Original Listing</span>
                                </div>
                                <ExternalLink size={16} className="text-gray-600 group-hover:text-white" />
                            </a>

                            {product.supplierUrl ? (
                                <a href={product.supplierUrl} target="_blank" className="flex items-center justify-between p-4 bg-green-900/10 border border-green-900/30 rounded-xl hover:bg-green-900/20 hover:border-green-500/50 transition group">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-green-600 p-2 rounded-lg text-xs font-bold text-white">SUPPLIER</span>
                                        <span className="text-sm font-medium text-green-100 group-hover:text-white">Buy on AliExpress</span>
                                    </div>
                                    <ExternalLink size={16} className="text-green-500 group-hover:text-green-300" />
                                </a>
                            ) : (
                                <div className="p-4 bg-black border border-dashed border-gray-800 rounded-xl text-center text-gray-500 text-sm">
                                    No supplier matched automatically. 
                                    <a 
                                        href={manualSearchUrl} 
                                        target="_blank" 
                                        className="text-blue-400 hover:underline ml-1 font-bold flex items-center justify-center gap-1 mt-2"
                                    >
                                        <Search size={12} /> Deep Search
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            )}

        </div>
      </div>
    </div>
  );
}