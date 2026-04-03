import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Khoti - Pakistani Card Game",
  description: "Play the classic Pakistani Khoti card game online with friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
