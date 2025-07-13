"use client";

import {
    BookOpen,
    Calendar,
    BarChart3,
    GraduationCap,
    BookOpenCheck,
    User,
    LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const navigation = [
    {
        name: "Dashboard",
        href: "/dashboard",
        icon: BarChart3,
    },
    {
        name: "Study",
        href: "/study",
        icon: BookOpen,
    },
    {
        name: "Calendar",
        href: "/calendar",
        icon: Calendar,
    },
];

// Add more sections to the sidebar
const resources = [
    {
        name: "Practice Tests",
        href: "/practice",
        icon: BookOpenCheck,
    },
    {
        name: "Profile",
        href: "/profile",
        icon: User,
    },
];

export function AppSidebar() {
    const pathname = usePathname();
    const { userName, signOut } = useAuth();

    // Hide sidebar on login and register pages
    if (pathname === "/login" || pathname === "/register") {
        return null;
    }

    const handleSignOut = async () => {
        await signOut();
    };

    const handleLogout = () => {
        signOut();
    };

    return (
        <Sidebar variant="inset" className="bg-card border-r border-border">
            <SidebarHeader className="px-3 py-2">
                <div className="flex items-center space-x-2 px-2 py-3">
                    <span className="text-lg font-bold tracking-tight text-primary relative">
                        Navigation
                        <span className="absolute -bottom-1 left-0 w-8 h-0.5 bg-primary rounded-full"></span>
                    </span>
                </div>
            </SidebarHeader>

            <SidebarContent className="px-2">
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-1">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <SidebarMenuItem key={item.name}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            className={`transition-all duration-200 ${
                                                isActive
                                                    ? "bg-primary/10 text-primary font-medium"
                                                    : "hover:bg-accent hover:text-accent-foreground"
                                            }`}
                                        >
                                            <Link
                                                href={item.href}
                                                className="flex items-center gap-3"
                                            >
                                                <item.icon
                                                    className={`h-5 w-5 ${
                                                        isActive
                                                            ? "text-primary"
                                                            : "text-muted-foreground"
                                                    }`}
                                                />
                                                <span>{item.name}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator className="my-4" />
            </SidebarContent>

            <SidebarFooter className="border-t border-border mt-auto p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border">
                            <AvatarImage
                                src="/placeholder-user.jpg"
                                alt={userName || "User"}
                            />
                            <AvatarFallback>
                                {userName
                                    ? userName.substring(0, 2).toUpperCase()
                                    : "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                            <p className="font-medium">{userName || "User"}</p>
                            <p className="text-xs text-muted-foreground">
                                Stay focused & pass the exam! 💪
                            </p>
                        </div>
                    </div>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Logout</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
