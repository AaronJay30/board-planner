"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { PanelLeft, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "@/components/theme-selector";
import { useSidebar } from "@/components/ui/sidebar";

export function Header() {
    const { toggleSidebar } = useSidebar();
    const pathname = usePathname();

    // Hide header on login and register pages
    if (pathname === "/login" || pathname === "/register") {
        return null;
    }

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <Button
                variant="ghost"
                size="icon"
                className="mr-2"
                onClick={toggleSidebar}
            >
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle sidebar</span>
            </Button>

            <div className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                <Link
                    href="/dashboard"
                    className="font-semibold text-lg transition-colors hover:text-primary"
                >
                    BoardPlanner
                </Link>
            </div>

            <div className="ml-auto flex items-center gap-2">
                <ThemeSelector />
            </div>
        </header>
    );
}
