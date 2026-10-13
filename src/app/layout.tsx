import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "crm-lab",
  description: "Reverse engineering fonctionnel d'une application Salesforce de démonstration",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
