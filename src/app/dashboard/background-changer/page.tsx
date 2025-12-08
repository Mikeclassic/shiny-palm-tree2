"use client";

import { useState, useEffect } from "react";
import { ImagePlus, Upload, Check, Loader2, Sparkles, Download } from "lucide-react";
import Image from "next/image";

// 12 Professional Dropshipping Backgrounds
const TEMPLATES = [
  { id: 't1', name: 'Clean Studio', url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1000&auto=format&fit=crop' },
  { id: 't2', name: 'Marble Luxury', url: 'https://images.unsplash.com/photo-1596464528177-33eb97c0f833?q=80&w=1000&auto=format&fit=crop' },
  { id: 't3', name: 'Wooden Table', url: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=1000&auto=format&fit=crop' },
  { id: 't4', name: 'Nature Bokeh', url: 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?q=80&w=1000&auto=format&fit=crop' },
  { id: 't5', name: 'Modern Concrete', url: 'https://images.unsplash.com/photo-1517646331032-9e8563c523ac?q=80&w=1000&auto=format&fit=crop' },
  { id: 't6', name: 'Soft Silk', url: 'https://images.unsplash.com/photo-1528458909336-e7a0adfed0a5?q=80&w=1000&auto=format&fit=crop' },
  { id: 't7', name: 'Podium Beige', url: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?q=80&w=1000&auto=format&fit=crop' },
  { id: 't8', name: 'Tropical Leaf', url: 'https://images.unsplash.com/photo-1533038590840-1cde6e668a91?q=80&w=1000&auto=format&fit=crop' },
  { id: 't9', name: 'Urban Street', url: 'https://images.unsplash.com/photo-1449824913929-4b8a6143236c?q=80&w=1000&auto=format&fit=crop' },
  { id: 't10', name: 'Kitchen Counter', url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=1000&auto=format&fit=crop' },
  { id: 't11', name: 'Sunset Gradient', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=1000&auto=format&fit=crop' },
  { id: 't12', name: 'Minimal Blue', url: 'https://images.unsplash.com/photo-1595113316349-9fa4eb24f884?q=80&w=1000&auto=format&fit=crop' },
];

export default function BackgroundChanger() {
  // Mode: 'upload' or 'saved'
  const [mode, setMode] = useState<'upload' | 'saved'>('upload');
  
  // Inputs
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [selectedProductUrl, setSelectedProductUrl] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  
  // Data
  const [savedProducts, setSavedProducts] = useState<any[]>([]);
  
  // Processing
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState("");

  // Fetch saved products on load
  useEffect(() => {
    // In a real app, you'd fetch this from an API endpoint listing your DB products.
    // For now, we will simulate fetching or you can add a route to get products.
    // Assuming you might have an API or Server Action. 
    // Here is a fetch to your dashboard API if it existed, or we mock it for UI demonstration.
    // If you want to strictly use DB, we'd need a server component to pass data or an API route.
    
    // MOCK DATA for "Saved Products" demonstration
    // Replace with: fetch('/api/products').then(...)
    setSavedProducts([
        { id: '1', title: 'Vintage Hoodie', imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=500&q=60' },
        { id: '2', title: 'Cyber Jeans', imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=500&q=60' }
    ]);
  }, []);

  const handleGenerate = async () => {
    const mainImage = mode === 'upload' ? uploadedUrl : selectedProductUrl;
    
    if (!mainImage) {
        alert("Please provide a main image first.");
        return;
    }

    setLoading(true);
    setResultImage("");

    try {
        const res = await fetch("/api/ai/background-change", {
            method: "POST",
            body: JSON.stringify({
                productImageUrl: mainImage,
                backgroundImageUrl: selectedTemplate.url
            })
        });

        const data = await res.json();
        
        if (data.output) {
            setResultImage(data.output);
        } else {
            alert("AI Failed to process image.");
        }
    } catch (e) {
        console.error(e);
        alert("Something went wrong.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center gap-3 border-b border-gray-800 pb-6">
        <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
            <ImagePlus size={24} />
        </div>
        <div>
            <h2 className="text-3xl font-bold">Magic Studio ✨</h2>
            <p className="text-gray-400 mt-1">Replace product backgrounds with professional scenes in seconds.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: CONTROLS */}
        <div className="lg:col-span-1 space-y-8">
            
            {/* 1. SELECT SOURCE */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                <h3 className="font-bold text-lg mb-4 text-white">1. Select Product</h3>
                <div className="flex bg-black p-1 rounded-lg mb-4 border border-gray-800">
                    <button 
                        onClick={() => setMode('upload')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition ${mode === 'upload' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Upload URL
                    </button>
                    <button 
                        onClick={() => setMode('saved')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition ${mode === 'saved' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        From Saved
                    </button>
                </div>

                {mode === 'upload' ? (
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Image URL</label>
                        <div className="relative">
                            <Upload size={16} className="absolute left-3 top-3.5 text-gray-500" />
                            <input 
                                value={uploadedUrl}
                                onChange={(e) => setUploadedUrl(e.target.value)}
                                placeholder="https://..." 
                                className="w-full bg-black border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            />
                        </div>
                        {uploadedUrl && (
                            <div className="mt-4 rounded-xl overflow-hidden border border-gray-800 h-40 relative">
                                <img src={uploadedUrl} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                        {savedProducts.map(p => (
                            <div 
                                key={p.id}
                                onClick={() => setSelectedProductUrl(p.imageUrl)}
                                className={`cursor-pointer border rounded-lg overflow-hidden relative group ${selectedProductUrl === p.imageUrl ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-gray-800 hover:border-gray-600'}`}
                            >
                                <div className="h-24 bg-black">
                                    <img src={p.imageUrl} className="w-full h-full object-cover" />
                                </div>
                                <div className="p-2 bg-gray-950">
                                    <p className="text-[10px] text-gray-300 truncate">{p.title}</p>
                                </div>
                                {selectedProductUrl === p.imageUrl && (
                                    <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                                        <div className="bg-purple-500 text-white p-1 rounded-full"><Check size={12} /></div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {savedProducts.length === 0 && <p className="text-sm text-gray-500 col-span-2 text-center py-4">No saved products found.</p>}
                    </div>
                )}
            </div>

            {/* 2. SELECT BACKGROUND */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                <h3 className="font-bold text-lg mb-4 text-white">2. Select Background</h3>
                <div className="grid grid-cols-3 gap-2">
                    {TEMPLATES.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setSelectedTemplate(t)}
                            className={`relative aspect-square rounded-lg overflow-hidden border transition ${selectedTemplate.id === t.id ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-gray-800 hover:border-gray-600'}`}
                        >
                            <img src={t.url} alt={t.name} className="w-full h-full object-cover" />
                            {selectedTemplate.id === t.id && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Check className="text-white" size={20} />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">Selected: <span className="text-purple-400 font-bold">{selectedTemplate.name}</span></p>
            </div>

            {/* GENERATE BUTTON */}
            <button 
                onClick={handleGenerate}
                disabled={loading || (!uploadedUrl && !selectedProductUrl)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles className="text-yellow-300 fill-yellow-300" />}
                {loading ? "Magic in progress..." : "Generate Image"}
            </button>

        </div>

        {/* RIGHT COLUMN: PREVIEW */}
        <div className="lg:col-span-2 bg-black border border-gray-800 rounded-3xl p-8 flex items-center justify-center relative overflow-hidden min-h-[500px]">
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 p-64 bg-purple-900/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 p-64 bg-blue-900/10 blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none"></div>

            {resultImage ? (
                <div className="relative w-full h-full flex flex-col items-center animate-in fade-in zoom-in duration-500">
                    <div className="relative w-full max-w-lg aspect-square rounded-xl overflow-hidden shadow-2xl border border-gray-700">
                        <img src={resultImage} alt="Result" className="w-full h-full object-contain bg-gray-900" />
                    </div>
                    <div className="mt-6 flex gap-4">
                        <a href={resultImage} download target="_blank" className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition">
                            <Download size={18} /> Download HD
                        </a>
                        <button onClick={() => setResultImage("")} className="px-6 py-3 rounded-full font-bold text-gray-400 hover:text-white transition">
                            Reset
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-600 space-y-4">
                    <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mx-auto border border-gray-800">
                        <ImagePlus size={40} className="opacity-20" />
                    </div>
                    <div>
                        <p className="text-xl font-medium">Ready to create magic?</p>
                        <p className="text-sm mt-1 max-w-xs mx-auto">Select a product and a background template to merge them using AI.</p>
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}