import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // Backup path
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // Backup path
    "./pages/**/*.{js,ts,jsx,tsx,mdx}", // Backup path
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        primary: "#8b5cf6",
      },
    },
  },
  plugins: [],
};
export default config;