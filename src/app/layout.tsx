import type { Metadata } from "next"
import { Noto_Sans, Instrument_Serif } from "next/font/google"
import "streamdown/styles.css"
import "./globals.css"
import { brand } from "@/config/brand"
import { ThemeProvider } from "@/components/theme-provider"

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
})

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: `${brand.name} — KI-Assistent`,
  description: `${brand.name} AI Chat Plattform`,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" data-brand={brand.id} suppressHydrationWarning>
      <body className={`${notoSans.variable} ${instrumentSerif.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
