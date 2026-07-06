import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import KeepAwake from "@/components/KeepAwake";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mosaic Feedback Wall",
  description: "Submit feedback and watch it appear on the live mosaic wall",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Feedback Wall",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b0d12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="app-body">
        <KeepAwake />
        {children}
      </body>
    </html>
  );
}
