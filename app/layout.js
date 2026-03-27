import "./globals.css";

import { PwaClientShell } from "@/components/pwa/pwa-client-shell";

export const metadata = {
  title: "OMEGA FIT",
  description: "Plateforme premium de coaching sportif pour piloter clients, programmes et performance.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#0A0A0A",
  viewportFit: "cover",
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <PwaClientShell />
      </body>
    </html>
  );
}
