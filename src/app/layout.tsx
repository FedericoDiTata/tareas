import type { Metadata, Viewport } from "next";
import { Caveat, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
});

const hand = Caveat({
  subsets: ["latin"],
  variable: "--font-hand",
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Escritorio",
  description: "Un lugar para vaciar la cabeza. Tablero, post-its y canvas libre.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f3fb" },
    { media: "(prefers-color-scheme: dark)", color: "#07070d" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

/** Se ejecuta antes del primer pintado para que no haya flash de tema. */
const themeScript = `
(function () {
  try {
    var saved = localStorage.getItem('escritorio.theme');
    var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} ${display.variable} ${hand.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
