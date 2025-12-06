import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "./components/Footer";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Client Collaboration Platform | Built by Wahb Amir",
  description:
    "A secure, real-time collaboration platform built by Wahb Amir — designed for clients to track projects, timelines, updates, GitHub sync, and communicate smoothly.",
  authors: [{ name: "Wahb Amir", url: "https://wahb.space" }],
  creator: "Wahb Amir",
  publisher: "Wahb Amir",
  metadataBase: new URL("https://projects.buttnetworks.com"),
  openGraph: {
    title: "Client Collaboration Platform",
    description:
      "A modern client–developer collaboration dashboard built by Wahb Amir. Track updates, manage tasks, and communicate in real time.",
    url: "https://projects.buttnetworks.com",
    siteName: "Client Collaboration Platform",
    images: [
      {
        url: "/client-platform-og.png",
        width: 1200,
        height: 630,
        alt: "Client Collaboration Dashboard Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Client Collaboration Platform",
    description:
      "A unified client–developer collaboration platform built by Wahb Amir — timelines, chat, GitHub, and more.",
    images: ["/client-platform-og.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-96x96.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Footer />
      </body>
    </html>
  );
}
