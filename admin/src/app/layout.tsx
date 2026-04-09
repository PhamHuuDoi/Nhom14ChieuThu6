import type { Metadata } from "next"

import { AuthProvider } from "@/context/auth-context"

import "./globals.css"

export const metadata: Metadata = {
  title: "TheZooCoffee Admin",
  description: "Separate admin workspace for TheZooCoffee",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
