import "./globals.css";
import AppProviders from "../providers/AppProviders";

export const metadata = {
  title: "AgroVista | Modern Agriculture Marketplace & Auction Platform",
  description: "Connect directly with verified farmers, bid on fresh crop lots in real-time, get AI-powered crop valuation suggestions, and track shipments live.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};


export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}

