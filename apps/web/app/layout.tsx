import type { Metadata } from "next";
import "@lyceum/ui/globals.css";
import { ThemeProvider } from "@lyceum/ui/components/theme-provider";

export const metadata: Metadata = {
  title: "The Lyceum Project",
  description: "A project by the Lyceum Project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}