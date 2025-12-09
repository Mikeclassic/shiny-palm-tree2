import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC", // Very light gray (Slate-50) for SaaS look
        foreground: "#1E293B", // Dark slate (Slate-800) for text readability
        
        // Brand Color (Trust/Professional) - Deep Navy Blue
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          900: '#0f172a', // Main Dark Brand Color
        },

        // CTA Color (Action/Urgency) - Vibrant Orange-Red
        // Research suggests red/orange outperforms blending colors for CTAs
        action: {
          DEFAULT: '#F97316', // Orange-500
          hover: '#EA580C',   // Orange-600
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;