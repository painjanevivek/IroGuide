import type { Metadata } from "next";
import { AuthProvider } from "@/features/auth/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "IroGuide Sign Up",
  title: {
    default: "IroGuide Sign Up",
    template: "%s | IroGuide",
  },
  description: "Create a new IroGuide profile.",
  openGraph: {
    title: "IroGuide Sign Up",
    description: "Create a new IroGuide profile.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#app-content">Skip to main content</a>
        <AuthProvider>
          <div id="app-content">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
