import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { FloatingWhatsApp } from "./FloatingWhatsApp";

interface PublicLayoutProps {
  children: ReactNode;
  transparentHeader?: boolean;
}

export function PublicLayout({ children, transparentHeader = false }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#202124] selection:bg-[#24292F]/15 selection:text-[#202124]">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className={`flex-1 ${transparentHeader ? "" : "pt-24 print:pt-0"}`}>
        {children}
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
      <div className="print:hidden">
        <FloatingWhatsApp />
      </div>
    </div>
  );
}
