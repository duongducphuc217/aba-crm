import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const robotoSans = Roboto({
  variable: "--font-roboto-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
  preload: true,
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

export const metadata: Metadata = {
  title: "CRM Trường học",
  description: "Dashboard CRM đọc dữ liệu từ Excel",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${robotoSans.variable} h-full`}>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
