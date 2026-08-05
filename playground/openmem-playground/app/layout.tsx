import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.scss";

export const metadata: Metadata = {
  title: "OpenMem Playground",
  description: "Memory Engine playground for OpenMem",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
    >
      <body >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
