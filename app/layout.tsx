import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { hasClerk } from "@/lib/auth";
import { ClerkProvider } from "@clerk/nextjs";
import TabBar from "@/components/TabBar";
import Toast from "@/components/Toast";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://crabcakes.app"),
  title: "Crabcake",
  description: "Every crab cake in America, ranked. By the Baltimore Boys.",
  openGraph: {
    title: "Crabcake",
    description: "Every crab cake in America, ranked. By the Baltimore Boys.",
    url: "https://crabcakes.app",
    siteName: "Crabcake",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crabcake",
    description: "Every crab cake in America, ranked. By the Baltimore Boys.",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Crabcake",
    "theme-color": "#f6f2ea",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

function Body({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <div className="device">
        <div className="screen-root">{children}</div>
        <TabBar />
        <Toast />
      </div>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${manrope.variable} ${jetbrains.variable}`}
    >
      <body>
        {hasClerk ? (
          <ClerkProvider
            appearance={{
              variables: {
                colorPrimary: "#e83d35",
                colorBackground: "#ffffff",
                colorText: "#1a1612",
                fontFamily: "Manrope, system-ui, sans-serif",
                borderRadius: "14px",
              },
            }}
          >
            <Body>{children}</Body>
          </ClerkProvider>
        ) : (
          <Body>{children}</Body>
        )}
      </body>
    </html>
  );
}
