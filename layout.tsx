import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoTrack | Personal Carbon Footprint Assistant",
  description: "Calculate, track, and reduce your carbon emissions. Get personalized AI insights, log sustainable habits, and join community eco-challenges.",
  keywords: ["sustainability", "carbon footprint", "climate change", "eco-friendly", "personal carbon tracker", "sustainability coach"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {children}
      </body>
    </html>
  );
}


