import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { AuthProvider } from "@/lib/auth-context";
import { BackgroundProvider } from "@/components/background-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Licensure Review App",
    description: "Personal study planner and review tool for licensure exams",
    generator: "v0.dev",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning style={{ overflow: "hidden" }}>
            <body className={`${inter.className} antialiased`}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                >
                    <AuthProvider>
                        <SidebarProvider>
                            <AppSidebar />
                            <SidebarInset>
                                <BackgroundProvider>
                                    <div className="flex flex-col h-screen">
                                        <Header />
                                        <main className="flex-1 overflow-auto p-0">
                                            {children}
                                        </main>
                                    </div>
                                </BackgroundProvider>
                            </SidebarInset>
                        </SidebarProvider>
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
