import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Submit CV | DirectHR",
  description:
    "Upload your CV and explore career opportunities. DirectHR connects exceptional talent with companies efficiently.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50">{children}</body>
    </html>
  );
}
