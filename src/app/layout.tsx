import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito, Pacifico } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const pacifico = Pacifico({
  variable: "--font-pacifico",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "PB Zone",
  description: "PB Zone — Potato Bazaar Game Zone. Play. Learn. Earn.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PB Zone",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#EDE7FC",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${fredoka.variable} ${pacifico.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#EDE7FC] font-sans">{children}</body>
    </html>
  );
}
