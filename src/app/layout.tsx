import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const montserrat = Montserrat({ 
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-montserrat"
});

export const metadata: Metadata = {
  title: "Nexar - Viví Argentina a tu manera",
  description: "Elegí entre alojamientos, actividades, excursiones y medios para moverte.<br> Todo en un solo lugar, seguro y fácil de reservar.",
  keywords: "turismo, alquiler, hoteles, aventuras, viajes, España",
  authors: [{ name: "Nexar" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`scroll-smooth ${montserrat.variable}`}>
      <body className={`${montserrat.className} antialiased`}>
        <AuthProvider>
          <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
