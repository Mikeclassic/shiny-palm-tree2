"use client";

import { useState, useRef } from "react";
import { ImagePlus, Upload, Check, Loader2, Sparkles, Download, Search, X } from "lucide-react";
import Image from "next/image";

// REVISED TEMPLATES: ONLY describing the background/place
const TEMPLATES = [
  { id: 't1', name: 'White Podium', prompt: 'a pristine white round podium, professional studio lighting' },
  { id: 't2', name: 'Luxury Marble', prompt: 'a luxury white marble surface with soft window reflection' },
  { id: 't3', name: 'Living Room', prompt: 'a cozy modern living room with a beige sofa in the blurred background' },
  { id: 't4', name: 'Sunny Garden', prompt: 'a sunny garden with green leaves and bokeh background' },
  { id: 't5', name: 'Urban Street', prompt: 'a cool urban street setting with city lights in the background' },
  { id: 't6', name: 'Bathroom Vanity', prompt: 'a clean white bathroom vanity shelf next to a mirror' },
  { id: 't7', name: 'Beach Sunset', prompt: 'warm sand at the beach during golden hour sunset' },
  { id: 't8', name: 'Dark Slate', prompt: 'a dark slate stone surface with dramatic moody lighting' },
  { id: 't9', name: 'Silk Fabric', prompt: 'smooth champagne colored silk fabric folds' },
  { id: 't10', name: 'Kitchen', prompt: 'a modern kitchen island with a blurred background' },
];

interface BackgroundStudioProps {
    userProducts: any[];
}

export default function BackgroundStudio({ userProducts }: BackgroundStudioProps) {
  const [mode, setMode] = useState<'upload' | 'saved'>('saved');
  const [selectedProductUrl, setSelectedProductUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setSelectedProductUrl(""); 
    }
  };

  const handleGenerate = async () => {
    let mainImageUrl = selectedProductUrl;

    if (mode === 'upload') {
        if (!uploadedFile) {
            alert("Please upload an image first.");
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(uploadedFile);
        
        await new Promise((resolve) => {
            reader.onloadend = () => {
                mainImageUrl = reader.result as string;
                resolve(true);
            };
        });
    }

    if (!mainImageUrl) {
        alert("Please select or upload an image.");
        return;
    }

    setLoading(true);
    setResultImage("");

    // CONSTRUCT THE PROMPT EXACTLY AS REQUESTED
    const finalPrompt = `Change the background with ${selectedTemplate.prompt}`;

    try {
        const res = await fetch("/api/ai/background-change", {
            method: "POST",
            body: JSON.stringify({
                productImageUrl: mainImageUrl,
                prompt: finalPrompt // Sends "Change the background with..."
            })
        });

        const data = await res.json();
        
        if (data.output) {
            setResultImage(data.output);
        } else {
            alert("AI Failed to process image. Try a different image.");
        }
    } catch (e) {
        console.error(e);
        alert("Something went wrong.");
    } finally {
        setLoading(false);
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
        link.download = `glowseller-magic-${Date.now()}.png`; 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (e) {
        window.open(resultImage, '_blank');
    }
  };

  const filteredProducts = userProducts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 border-b border-gray-800 pb-6">
        <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
            <ImagePlus size={24} />
        </div>
        <div>
            <h2 className="text-3xl font-bold">Magic Studio ✨</h2>
            <p className="text-gray-400 mt-1">Transform product images using AI-powered scene generation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-1 space-y-8">
            
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                <h3 className="font-bold text-lg mb-4 text-white">1. Select Product</h3>
                <div className="flex bg-black p-1 rounded-lg mb-4 border border-gray-800">
                    <button 
                        onClick={() => setMode('saved')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition ${mode === 'saved' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        From Saved
                    </button>
                    <button 
                        onClick={() => setMode('upload')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition ${mode === 'upload' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Manual Upload
                    </button>
                </div>

                {mode === 'upload' ? (
                    <div>
                        <input 
                            type="file" 
                            accept="image/*" 
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-gray-800/50 transition h-40"
                        >
                            {previewUrl ? (
                                <img src={previewUrl} className="h-full w-full object-contain" alt="Preview" />
                            ) : (
                                <>
                                    <Upload size={24} className="text-gray-500 mb-2" />
                                    <span className="text-xs text-gray-400 font-bold">Click to Upload Image</span>
                                    <span className="text-[10px] text-gray-600 mt-1">JPG, PNG (Max 5MB)</span>
                                </>
                            )}
                        </div>
                        {previewUrl && (
                            <button onClick={() => { setPreviewUrl(""); setUploadedFile(null); }} className="mt-2 text-xs text-red-400 flex items-center gap-1 hover:text-red-300">
                                <X size={12} /> Remove
                            </button>
                        )}
                    </div>
                ) : (
                    <div>
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                            <input 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search products..."
                                className="w-full bg-black border border-gray-800 rounded-lg py-2 pl-9 pr-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {filteredProducts.map(p => (
                                <div 
                                    key={p.id}
                                    onClick={() => setSelectedProductUrl(p.imageUrl)}
                                    className={`cursor-pointer border rounded-lg overflow-hidden relative group p-2 bg-black ${selectedProductUrl === p.imageUrl ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-gray-800 hover:border-gray-600'}`}
                                >
                                    <div className="h-24 relative w-full">
                                        <Image 
                                            src={p.imageUrl} 
                                            alt={p.title}
                                            fill
                                            className="object-contain" 
                                            sizes="150px"
                                        />
                                    </div>
                                    <div className="pt-2 text-center">
                                        <p className="text-[10px] text-gray-400 truncate w-full">{p.title}</p>
                                    </div>
                                    {selectedProductUrl === p.imageUrl && (
                                        <div className="absolute inset-0 bg-purple-500/10 flex items-start justify-end p-1 pointer-events-none">
                                            <div className="bg-purple-500 text-white p-0.5 rounded-full"><Check size={10} /></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {filteredProducts.length === 0 && <p className="text-sm text-gray-500 col-span-2 text-center py-4">No products found.</p>}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                <h3 className="font-bold text-lg mb-4 text-white">2. Select Scene</h3>
                <div className="grid grid-cols-2 gap-3">
                    {TEMPLATES.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setSelectedTemplate(t)}
                            className={`p-3 rounded-xl border text-left transition relative ${selectedTemplate.id === t.id ? 'border-purple-500 bg-purple-900/10 ring-1 ring-purple-500' : 'border-gray-700 hover:border-gray-500 bg-black'}`}
                        >
                            <span className="text-xs font-bold block mb-1 text-white">{t.name}</span>
                            <span className="text-[10px] text-gray-500 line-clamp-2 leading-tight">{t.prompt}</span>
                            {selectedTemplate.id === t.id && (
                                <div className="absolute top-2 right-2 text-purple-500"><Check size={14} /></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <button 
                onClick={handleGenerate}
                disabled={loading || (!uploadedFile && !selectedProductUrl)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles className="text-yellow-300 fill-yellow-300" />}
                {loading ? "Generating Scene..." : "Generate Image"}
            </button>

        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 bg-black border border-gray-800 rounded-3xl p-8 flex items-center justify-center relative overflow-hidden min-h-[600px]">
            <div className="absolute top-0 right-0 p-64 bg-purple-900/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 p-64 bg-blue-900/10 blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none"></div>

            {resultImage ? (
                <div className="relative w-full h-full flex flex-col items-center animate-in fade-in zoom-in duration-500">
                    <div className="relative w-full max-w-2xl aspect-square rounded-xl overflow-hidden shadow-2xl border border-gray-700">
                        <img src={resultImage} alt="Result" className="w-full h-full object-contain bg-gray-900" />
                    </div>
                    <div className="mt-6 flex gap-4">
                        <button 
                            onClick={handleDownload}
                            className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition shadow-lg"
                        >
                            <Download size={18} /> Download HD
                        </button>
                        <button onClick={() => setResultImage("")} className="px-6 py-3 rounded-full font-bold text-gray-400 hover:text-white transition">
                            Create Another
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
                        <p className="text-sm mt-1 max-w-xs mx-auto">Select a product and choose a scene style. The AI will blend your product naturally into the environment.</p>
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}