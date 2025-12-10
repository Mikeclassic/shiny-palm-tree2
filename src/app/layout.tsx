import { Providers } from "@/components/Providers";
import './globals.css'
// ... imports ...

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="...">
        <Providers>
            {children}
        </Providers>
      </body>
    </html>
  )
}