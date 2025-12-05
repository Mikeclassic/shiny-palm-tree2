"use client";
import { useState } from "react";
import { Wand2, Image as ImageIcon, Loader2, Copy } from "lucide-react";

export default function AITools() {
  const [productName, setProductName] = useState("");
  const [descResult, setDescResult] = useState("");
  const [loading, setLoading] = useState(false);

  const [imageUrl, setImageUrl] = useState("");
  const [bgResult, setBgResult] = useState("");
  const [bgLoading, setBgLoading] = useState(false);

  const generateDescription = async () => {
    if(!productName) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({ productName }),
      });
      const data = await res.json();
      setDescResult(data);
    } catch (e) {
      alert("Error generating description");
    } finally {
      setLoading(false);
    }
  };

  const removeBackground = async () => {
    if(!imageUrl) return;
    setBgLoading(true);
    try {
      const res = await fetch("/api/ai/remove-bg", {
        method: "POST",
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      if(data.output) setBgResult(data.output);
      else alert("Failed to process image");
    } catch (e) {
      alert("Error processing image");
    } finally {
      setBgLoading(false);
    }
  };

  return (
    <div className="space-y-8">
        <div>
            <h2 className="text-3xl font-bold">AI Studio ✨</h2>
            <p className="text-gray-400 mt-2">Generate content and edit photos instantly.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Description Gen */}
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-purple-600/10 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
                        <Wand2 size={24} />
                    </div>
                    <h3 className="font-bold text-xl">Description Writer</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Product Name</label>
                        <input 
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="e.g. Vintage Nike Sweatshirt"
                            className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white focus:ring-2 ring-purple-500 outline-none transition"
                        />
                    </div>
                    <button 
                        onClick={generateDescription}
                        disabled={loading}
                        className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Generate Magic"}
                    </button>
                </div>

                {descResult && (
                <div className="mt-6 p-4 bg-black/50 border border-gray-800 rounded-xl">
                    <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">{descResult}</p>
                    <button 
                        onClick={() => navigator.clipboard.writeText(descResult)}
                        className="mt-3 flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wider"
                    >
                        <Copy size={12} /> Copy Text
                    </button>
                </div>
                )}
            </div>

            {/* BG Remover */}
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-pink-600/10 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-pink-500/10 rounded-lg text-pink-400">
                        <ImageIcon size={24} />
                    </div>
                    <h3 className="font-bold text-xl">Background Remover</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Image URL</label>
                        <input 
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white focus:ring-2 ring-pink-500 outline-none transition"
                        />
                    </div>
                    <button 
                        onClick={removeBackground}
                        disabled={bgLoading}
                        className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                        {bgLoading ? <Loader2 className="animate-spin" /> : "Remove Background"}
                    </button>
                </div>

                {bgResult && (
                <div className="mt-6 border border-gray-800 rounded-xl overflow-hidden">
                    <img src={bgResult} alt="Result" className="w-full" />
                </div>
                )}
            </div>
        </div>
    </div>
  );
}
