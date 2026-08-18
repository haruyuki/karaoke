import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {NextIntlClientProvider} from "next-intl";
import {Analytics} from "@vercel/analytics/next";
import {getLocale} from "next-intl/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Haru Twitch Karaoke Dashboard',
  description: 'A dashboard for managing Twitch karaoke song requests and settings',
  keywords: ['Twitch', 'karaoke', 'dashboard', 'song requests'],
  robots: 'index, follow',
  openGraph: {
    title: "Haru Twitch Karaoke Dashboard",
    description: 'A dashboard for managing Twitch karaoke song requests and settings',
    url: 'https://karaoke.haruyuki.moe/',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Haru Twitch Karaoke Dashboard",
    description: 'A dashboard for managing Twitch karaoke song requests and settings',
    site: 'https://karaoke.haruyuki.moe/',
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
