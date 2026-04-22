import type { Metadata } from "next";
import { Figtree, Fira_Code } from "next/font/google";
import "./globals.css";
import "./nprogress.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { WalletProvider } from "@/context/WalletProvider";
import { ConnectWalletProvider } from "@/context/ConnectWalletContext";
import ClientLayout from "@/components/layout/ClientLayout"; // Import the new client layout
import { NotificationProvider } from "@/context/NotificationContext";
import { LoadingProvider } from "@/context/LoadingContext";
import { QueryProvider } from "@/providers/QueryProvider";
import { RollupProvider } from "@/context/RollupContext";
import { AppProvider } from "@/context/AppContext";
import { Suspense } from "react";

const figtree = Figtree({
  variable: "--font-geist-sans", // Re-using the variable name is easiest
  subsets: ["latin"],
  display: 'swap', // Ensures text is visible while font loads
});

const firaCode = Fira_Code({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Dashtec - Sequencer Dashboard",
  description: "Monitor sequencer performance and network metrics for Aztec.",
  openGraph: {
    images: [
      {
        url: `${process.env.APP_URL}/og-image.png`,
        alt: 'Dashtec - Monitor aztec sequencer performance and network metrics',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: `${process.env.APP_URL}/og-image.png`,
        alt: 'Dashtec - Monitor aztec sequencer performance and network metrics',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitializationScript = `
    (function() {
      try {
        const theme = window.localStorage.getItem('theme');
        if (theme == null) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.add(theme);
        } 
      } catch (e) {
        document.documentElement.classList.add('dark');
      }
    })();
  `;
  return (
    <html lang="en" className={`${figtree.variable} ${firaCode.variable}`} suppressHydrationWarning>
      <body
        className={`antialiased 
                   bg-slate-100 text-slate-900 
                   dark:bg-slate-900 dark:text-slate-50
                   transition-colors duration-300`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
        <WalletProvider>
          <ConnectWalletProvider>
            <ThemeProvider>
              <NotificationProvider>
                <LoadingProvider>
                  <QueryProvider>
                    <Suspense>
                      <RollupProvider>
                        <AppProvider>
                          <ClientLayout>
                            {children}
                          </ClientLayout>
                        </AppProvider>
                      </RollupProvider>
                    </Suspense>
                  </QueryProvider>
                </LoadingProvider>
              </NotificationProvider>
            </ThemeProvider>
          </ConnectWalletProvider>
        </WalletProvider>
      </body>
    </html>
  );
}