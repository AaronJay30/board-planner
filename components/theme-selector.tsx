"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Palette, Check, Upload, Image as ImageIcon } from "lucide-react";
import { useColorTheme } from "./theme-provider";
import { useAuth } from "@/lib/auth-context";

type ColorKey =
    | "primary"
    | "secondary"
    | "accent"
    | "background"
    | "foreground";
type CustomColors = Record<ColorKey, string>;

const themes = [
    {
        name: "Default",
        value: "default",
        description: "Clean and professional",
        colors: {
            primary: "hsl(222.2, 84%, 4.9%)",
            secondary: "hsl(210, 40%, 96%)",
            accent: "hsl(210, 40%, 94%)",
            background: "hsl(0, 0%, 100%)",
            foreground: "hsl(222.2, 84%, 4.9%)",
            preview: ["#020817", "#f1f5f9", "#e2e8f0"],
        },
    },
    {
        name: "Ocean",
        value: "ocean",
        description: "Calm blue tones",
        colors: {
            primary: "hsl(200, 100%, 28%)",
            secondary: "hsl(200, 100%, 96%)",
            accent: "hsl(200, 100%, 92%)",
            background: "hsl(200, 100%, 98%)",
            foreground: "hsl(200, 100%, 10%)",
            preview: ["#0369a1", "#ebf8ff", "#dbeafe"],
        },
    },
    {
        name: "Forest",
        value: "forest",
        description: "Natural green palette",
        colors: {
            primary: "hsl(142, 76%, 36%)",
            secondary: "hsl(138, 76%, 97%)",
            accent: "hsl(138, 76%, 94%)",
            background: "hsl(138, 76%, 98%)",
            foreground: "hsl(142, 76%, 10%)",
            preview: ["#16a34a", "#ecfdf5", "#dcfce7"],
        },
    },
    {
        name: "Sunset",
        value: "sunset",
        description: "Warm orange and red",
        colors: {
            primary: "hsl(24, 95%, 53%)",
            secondary: "hsl(24, 95%, 97%)",
            accent: "hsl(24, 95%, 94%)",
            background: "hsl(24, 95%, 98%)",
            foreground: "hsl(24, 95%, 10%)",
            preview: ["#ea580c", "#fff7ed", "#fed7aa"],
        },
    },
    {
        name: "Purple",
        value: "purple",
        description: "Rich purple tones",
        colors: {
            primary: "hsl(263, 70%, 50%)",
            secondary: "hsl(263, 70%, 97%)",
            accent: "hsl(263, 70%, 94%)",
            background: "hsl(263, 70%, 98%)",
            foreground: "hsl(263, 70%, 10%)",
            preview: ["#7c3aed", "#faf5ff", "#e9d5ff"],
        },
    },
    {
        name: "Rose",
        value: "rose",
        description: "Elegant pink palette",
        colors: {
            primary: "hsl(330, 81%, 60%)",
            secondary: "hsl(330, 81%, 97%)",
            accent: "hsl(330, 81%, 94%)",
            background: "hsl(330, 81%, 98%)",
            foreground: "hsl(330, 81%, 10%)",
            preview: ["#e11d48", "#fff1f2", "#fce7f3"],
        },
    },
    {
        name: "Custom",
        value: "custom",
        description: "Modern gradient-inspired theme",
        colors: {
            primary: "hsl(280, 65%, 45%)",
            secondary: "hsl(280, 65%, 96%)",
            accent: "hsl(280, 65%, 92%)",
            background: "hsl(280, 65%, 98%)",
            foreground: "hsl(280, 65%, 10%)",
            preview: ["#8b2fba", "#f5ebff", "#edd9ff"],
        },
    },
    {
        name: "Image Theme",
        value: "image-theme",
        description: "Upload your own background image",
        colors: {
            primary: "hsla(220, 14%, 20%, 0.85)", // Dark gray with transparency
            secondary: "hsla(220, 14%, 90%, 0.9)", // Light gray
            accent: "hsla(220, 14%, 80%, 0.9)", // Slightly darker gray
            background: "hsla(220, 14%, 96%, 0.75)", // Light gray transparent
            foreground: "hsla(220, 14%, 20%, 1)", // Solid dark gray
            preview: [
                "rgba(47, 55, 65, 0.85)", // dark gray
                "rgba(228, 231, 235, 0.9)", // light gray
                "rgba(214, 219, 226, 0.9)", // medium gray
            ],
        },
    },
];

export function ThemeSelector() {
    const { colorTheme, setColorTheme } = useColorTheme();
    const [currentTheme, setCurrentTheme] = useState(colorTheme || "default");
    const {
        userPreferences,
        setBackgroundImage,
        removeBackgroundImage,
        updateUserPreferences,
    } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showImageUpload, setShowImageUpload] = useState(false);
    const [customColors, setCustomColors] = useState({
        primary: "hsl(280, 65%, 45%)",
        secondary: "hsl(280, 65%, 96%)",
        accent: "hsl(280, 65%, 92%)",
        background: "hsl(280, 65%, 98%)",
        foreground: "hsl(280, 65%, 10%)",
    });
    const [showCustomization, setShowCustomization] = useState(false);

    useEffect(() => {
        // Wait for client-side render to avoid hydration issues
        if (typeof window !== "undefined") {
            const savedTheme = localStorage.getItem("color-theme") || "default";
            setCurrentTheme(savedTheme);

            // Load custom colors from Firebase if they exist
            if (userPreferences?.customThemeColors) {
                setCustomColors(userPreferences.customThemeColors);

                // Update the custom theme in themes array
                const customTheme = themes.find((t) => t.value === "custom");
                if (customTheme) {
                    customTheme.colors = {
                        ...userPreferences.customThemeColors,
                        preview: [
                            userPreferences.customThemeColors.primary,
                            userPreferences.customThemeColors.secondary,
                            userPreferences.customThemeColors.accent,
                        ],
                    };
                }
            }

            // Check if we should show the image upload section
            if (savedTheme === "image-theme") {
                setShowImageUpload(true);
            }

            // Check if we should show the customization section
            setShowCustomization(savedTheme === "custom");

            // Use a short timeout to ensure the DOM is fully ready
            setTimeout(() => {
                applyTheme(savedTheme);
            }, 50);
        }
    }, [userPreferences]);
    const applyTheme = (themeName: string) => {
        const theme = themes.find((t) => t.value === themeName);
        if (!theme) return;

        const root = document.documentElement;
        const isDarkMode = root.classList.contains("dark");

        // Remove all theme classes first
        root.classList.remove(
            "theme-ocean",
            "theme-forest",
            "theme-sunset",
            "theme-purple",
            "theme-rose"
        );

        if (themeName === "default") {
            // Reset to default theme
            // Clear all custom theme properties to use the default ones in globals.css
            root.style.removeProperty("--background");
            root.style.removeProperty("--foreground");
            root.style.removeProperty("--primary");
            root.style.removeProperty("--secondary");
            root.style.removeProperty("--accent");
            root.style.removeProperty("--card");
            root.style.removeProperty("--card-foreground");
            root.style.removeProperty("--popover");
            root.style.removeProperty("--popover-foreground");
            root.style.removeProperty("--primary-foreground");
            root.style.removeProperty("--secondary-foreground");
            root.style.removeProperty("--accent-foreground");
            root.style.removeProperty("--muted");
            root.style.removeProperty("--muted-foreground");
            root.style.removeProperty("--border");

            // Force an update to ensure styles are applied
            document.body.classList.remove("theme-applied");
            void document.body.offsetWidth; // Trigger a reflow
            document.body.classList.add("theme-applied");
        } else if (themeName === "image-theme") {
            // Apply the image theme with transparent elements
            root.classList.add(`theme-${themeName}`);

            // Apply semi-transparent styles
            if (isDarkMode) {
                root.style.setProperty("--background", "220 14% 10% / 0.75"); // Semi-transparent dark gray
                root.style.setProperty("--foreground", "210 40% 98%");
                root.style.setProperty("--primary", "210 40% 98% / 0.85"); // Semi-transparent
                root.style.setProperty(
                    "--primary-foreground",
                    "222.2 47.4% 11.2%"
                );
                root.style.setProperty(
                    "--secondary",
                    "217.2 32.6% 17.5% / 0.9"
                ); // Semi-transparent
                root.style.setProperty("--secondary-foreground", "210 40% 98%");
                root.style.setProperty("--accent", "217.2 32.6% 17.5% / 0.9"); // Semi-transparent
                root.style.setProperty("--accent-foreground", "210 40% 98%");
                root.style.setProperty("--card", "220 14% 4% / 0.85"); // Semi-transparent dark gray
                root.style.setProperty("--card-foreground", "213 31% 91%");
                root.style.setProperty("--popover", "220 14% 4% / 0.85"); // Semi-transparent dark gray
                root.style.setProperty(
                    "--popover-foreground",
                    "215 20.2% 65.1%"
                );
                root.style.setProperty("--muted", "220 14% 11% / 0.9"); // Semi-transparent dark gray
                root.style.setProperty(
                    "--muted-foreground",
                    "215.4 16.3% 56.9%"
                );
                root.style.setProperty("--border", "220 14% 17% / 0.7"); // Semi-transparent dark gray
            } else {
                root.style.setProperty("--background", "220 14% 96% / 0.75"); // Semi-transparent light gray
                root.style.setProperty("--foreground", "222.2 84% 4.9%");
                root.style.setProperty("--primary", "222.2 47.4% 11.2% / 0.85"); // Semi-transparent
                root.style.setProperty("--primary-foreground", "210 40% 98%");
                root.style.setProperty("--secondary", "210 40% 96.1% / 0.9"); // Semi-transparent
                root.style.setProperty(
                    "--secondary-foreground",
                    "222.2 47.4% 11.2%"
                );
                root.style.setProperty("--accent", "210 40% 96.1% / 0.9"); // Semi-transparent
                root.style.setProperty(
                    "--accent-foreground",
                    "222.2 47.4% 11.2%"
                );
                root.style.setProperty("--card", "220 14% 100% / 0.85"); // Semi-transparent light gray
                root.style.setProperty("--card-foreground", "222.2 84% 4.9%");
                root.style.setProperty("--popover", "220 14% 100% / 0.85"); // Semi-transparent light gray
                root.style.setProperty(
                    "--popover-foreground",
                    "222.2 84% 4.9%"
                );
                root.style.setProperty("--muted", "220 14% 96.1% / 0.9"); // Semi-transparent light gray
                root.style.setProperty(
                    "--muted-foreground",
                    "215.4 16.3% 46.9%"
                );
                root.style.setProperty("--border", "220 14% 91.4% / 0.7"); // Semi-transparent light gray
            }

            // Force an update to ensure styles are applied
            document.body.classList.remove("theme-applied");
            void document.body.offsetWidth; // Trigger a reflow
            document.body.classList.add("theme-applied");
        } else if (themeName === "custom") {
            // Use current customColors from state or userPreferences
            const colors = userPreferences?.customThemeColors || customColors;
            applyCustomColors(colors, isDarkMode);
        } else {
            // Add the theme class with a higher specificity class-based approach
            root.classList.add(`theme-${themeName}`);

            // Instead of removing properties, let's set them directly from our theme object
            // This ensures the CSS variables are set correctly even if the CSS classes aren't working
            if (isDarkMode) {
                // Dark mode colors - set directly for more reliable application
                const hue =
                    theme.colors.primary.match(/hsl\((\d+)[^)]+\)/)?.[1] ||
                    "200";

                root.style.setProperty("--background", `${hue} 30% 10%`);
                root.style.setProperty("--foreground", `${hue} 30% 98%`);
                root.style.setProperty(
                    "--primary",
                    theme.colors.primary.match(/hsl\(([^)]+)\)/)?.[1] || ""
                );
                root.style.setProperty("--primary-foreground", `${hue} 30% 5%`);
                root.style.setProperty("--secondary", `${hue} 30% 20%`);
                root.style.setProperty(
                    "--secondary-foreground",
                    `${hue} 30% 98%`
                );
                root.style.setProperty("--accent", `${hue} 30% 25%`);
                root.style.setProperty("--accent-foreground", `${hue} 30% 98%`);
                root.style.setProperty("--card", `${hue} 30% 12%`);
                root.style.setProperty("--card-foreground", `${hue} 30% 98%`);
                root.style.setProperty("--popover", `${hue} 30% 12%`);
                root.style.setProperty(
                    "--popover-foreground",
                    `${hue} 30% 98%`
                );
                root.style.setProperty("--muted", `${hue} 30% 15%`);
                root.style.setProperty("--muted-foreground", `${hue} 20% 80%`);
                root.style.setProperty("--border", `${hue} 30% 25%`);
            } else {
                // Light mode colors - set directly for more reliable application
                root.style.setProperty(
                    "--background",
                    theme.colors.background.match(/hsl\(([^)]+)\)/)?.[1] || ""
                );
                root.style.setProperty(
                    "--foreground",
                    theme.colors.foreground.match(/hsl\(([^)]+)\)/)?.[1] || ""
                );
                root.style.setProperty(
                    "--primary",
                    theme.colors.primary.match(/hsl\(([^)]+)\)/)?.[1] || ""
                );
                root.style.setProperty("--primary-foreground", "0 0% 100%");
                root.style.setProperty(
                    "--secondary",
                    theme.colors.secondary.match(/hsl\(([^)]+)\)/)?.[1] || ""
                );
                root.style.setProperty(
                    "--secondary-foreground",
                    theme.colors.foreground.match(/hsl\(([^)]+)\)/)?.[1] || ""
                );
                root.style.setProperty(
                    "--accent",
                    theme.colors.accent.match(/hsl\(([^)]+)\)/)?.[1] || ""
                );
                root.style.setProperty(
                    "--accent-foreground",
                    theme.colors.foreground.match(/hsl\(([^)]+)\)/)?.[1] || ""
                );
            }

            // Force an update to ensure styles are applied
            document.body.classList.remove("theme-applied");
            void document.body.offsetWidth; // Trigger a reflow
            document.body.classList.add("theme-applied");
        }
    };

    // Image upload functionality
    const handleImageUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check file size (max 2MB)
        if (file.size > 10 * 1024 * 1024) {
            alert("Image size must be less than 10MB");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) {
                setBackgroundImage(dataUrl);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveBackground = () => {
        removeBackgroundImage();
    };

    // Helper function to convert hex to HSL
    const hexToHSL = (hex: string): string => {
        // Remove the hash if it exists
        hex = hex.replace("#", "");

        // Convert hex to RGB
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0,
            s,
            l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }

        return `hsl(${Math.round(h * 360)}, ${Math.round(
            s * 100
        )}%, ${Math.round(l * 100)}%)`;
    };

    const applyCustomColors = (
        newColors: CustomColors,
        isDarkMode: boolean
    ) => {
        const root = document.documentElement;

        // Helper function to extract HSL values
        const extractHSL = (hslString: string) => {
            const matches = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (matches) {
                return {
                    h: matches[1],
                    s: matches[2],
                    l: matches[3],
                };
            }
            return null;
        };

        // Convert hex colors to HSL
        const primaryHSL = hexToHSL(newColors.primary);
        const secondaryHSL = hexToHSL(newColors.secondary);
        const accentHSL = hexToHSL(newColors.accent);
        const backgroundHSL = hexToHSL(newColors.background);
        const foregroundHSL = hexToHSL(newColors.foreground);

        const primary = extractHSL(primaryHSL);

        if (isDarkMode) {
            const h = primary?.h || "280";
            root.style.setProperty("--background", `${h} 30% 10%`);
            root.style.setProperty("--foreground", `${h} 30% 98%`);
            root.style.setProperty(
                "--primary",
                primaryHSL.match(/hsl\(([^)]+)\)/)?.[1] || ""
            );
            root.style.setProperty("--primary-foreground", `${h} 30% 5%`);
            root.style.setProperty(
                "--secondary",
                secondaryHSL.match(/hsl\(([^)]+)\)/)?.[1] || ""
            );
            root.style.setProperty("--secondary-foreground", `${h} 30% 98%`);
            root.style.setProperty(
                "--accent",
                accentHSL.match(/hsl\(([^)]+)\)/)?.[1] || ""
            );
            root.style.setProperty("--accent-foreground", `${h} 30% 98%`);
            root.style.setProperty("--card", `${h} 25% 15%`);
            root.style.setProperty("--card-foreground", `${h} 30% 98%`);
            root.style.setProperty("--popover", `${h} 25% 15%`);
            root.style.setProperty("--popover-foreground", `${h} 30% 98%`);
            root.style.setProperty("--muted", `${h} 30% 15%`);
            root.style.setProperty("--muted-foreground", `${h} 20% 80%`);
            root.style.setProperty("--border", `${h} 30% 25%`);
        } else {
            root.style.setProperty(
                "--background",
                backgroundHSL.match(/hsl\(([^)]+)\)/)?.[1] || ""
            );
            root.style.setProperty(
                "--foreground",
                foregroundHSL.match(/hsl\(([^)]+)\)/)?.[1] || ""
            );
            root.style.setProperty(
                "--primary",
                primaryHSL.match(/hsl\(([^)]+)\)/)?.[1] || ""
            );
            root.style.setProperty("--primary-foreground", "0 0% 100%");
            root.style.setProperty(
                "--secondary",
                secondaryHSL.match(/hsl\(([^)]+)\)/)?.[1] || ""
            );
            root.style.setProperty(
                "--secondary-foreground",
                foregroundHSL.match(/hsl\(([^)]+)\)/)?.[1] || ""
            );
            root.style.setProperty(
                "--accent",
                accentHSL.match(/hsl\(([^)]+)\)/)?.[1] || ""
            );
            root.style.setProperty(
                "--accent-foreground",
                foregroundHSL.match(/hsl\(([^)]+)\)/)?.[1] || ""
            );
            root.style.setProperty(
                "--card",
                backgroundHSL.match(/hsl\(([^)]+)\)/)?.[1] || ""
            );
            root.style.setProperty(
                "--card-foreground",
                foregroundHSL.match(/hsl\(([^)]+)\)/)?.[1] || ""
            );
            root.style.setProperty(
                "--popover",
                backgroundHSL.match(/hsl\(([^)]+)\)/)?.[1] || ""
            );
            root.style.setProperty(
                "--popover-foreground",
                foregroundHSL.match(/hsl\(([^)]+)\)/)?.[1] || ""
            );
            root.style.setProperty(
                "--muted",
                secondaryHSL.match(/hsl\(([^)]+)\)/)?.[1] || ""
            );
            root.style.setProperty(
                "--muted-foreground",
                `${primary?.h || "280"} 20% 40%`
            );
            root.style.setProperty(
                "--border",
                `${primary?.h || "280"} 20% 80%`
            );
        }

        // Force a reflow to ensure styles are applied
        document.body.classList.remove("theme-applied");
        void document.body.offsetWidth;
        document.body.classList.add("theme-applied");
    };

    const handleCustomColorChange = async (
        colorType: ColorKey,
        value: string
    ) => {
        const newColors = {
            ...customColors,
            [colorType]: value,
        };

        // Update the state immediately for the color picker UI
        setCustomColors(newColors);

        // Convert hex colors to HSL and apply immediately
        const isDarkMode = document.documentElement.classList.contains("dark");
        applyCustomColors(newColors, isDarkMode);

        // Ensure we're using the custom theme
        if (currentTheme !== "custom") {
            setCurrentTheme("custom");
            setColorTheme("custom");
        }

        // Update the custom theme in the themes array
        const customTheme = themes.find((t) => t.value === "custom");
        if (customTheme) {
            const hslColors = {
                primary: hexToHSL(newColors.primary),
                secondary: hexToHSL(newColors.secondary),
                accent: hexToHSL(newColors.accent),
                background: hexToHSL(newColors.background),
                foreground: hexToHSL(newColors.foreground),
            };

            customTheme.colors = {
                ...hslColors,
                preview: [
                    value, // Use the direct hex value for preview
                    newColors.secondary,
                    newColors.accent,
                ],
            };
        }

        try {
            // Save to user preferences
            await updateUserPreferences({
                ...userPreferences,
                customThemeColors: newColors,
                theme: "custom",
            });
        } catch (error) {
            console.error("Failed to save custom colors:", error);
            // Even if save fails, keep the colors applied locally
        }
    };

    const selectTheme = (themeName: string) => {
        setCurrentTheme(themeName);
        setColorTheme(themeName); // This now handles the localStorage and class updates
        applyTheme(themeName); // Apply direct style updates for better visibility

        // Show/hide image upload section based on theme
        setShowImageUpload(themeName === "image-theme");
        setShowCustomization(themeName === "custom");

        // If we're switching to image theme, prompt user to upload an image if they don't have one
        if (themeName === "image-theme" && !userPreferences.backgroundImage) {
            setTimeout(() => {
                // Prompt user to upload an image
                if (
                    window.confirm(
                        "Would you like to upload a background image now?"
                    )
                ) {
                    handleImageUploadClick();
                }
            }, 500);
        }

        // Show a visual indication that the theme has changed
        const body = document.body;
        body.classList.add("theme-transition");
        setTimeout(() => {
            body.classList.remove("theme-transition");
        }, 1000);

        // Show a toast notification
        const toast = document.createElement("div");
        toast.className =
            "fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg transform transition-transform duration-300 translate-y-0 z-50";
        // Add a border to ensure visibility in any theme
        toast.style.border = "1px solid rgba(0,0,0,0.1)";
        toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
        toast.innerHTML = `<div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Theme changed to ${
                themes.find((t) => t.value === themeName)?.name || "Default"
            }</span>
        </div>`;

        document.body.appendChild(toast);

        // Animate the toast
        setTimeout(() => {
            toast.style.opacity = "0";
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 2000);

        // Force reflow to ensure styles are applied
        document.documentElement.style.backgroundColor = "";
        void document.documentElement.offsetWidth;
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 sm:gap-2 border-border relative px-2.5 sm:px-3"
                >
                    <Palette className="h-4 w-4 text-primary" />
                    <span className="hidden sm:inline-block">Theme</span>
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary"></span>
                </Button>
            </DialogTrigger>
            <DialogContent
                className={cn(
                    "sm:max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] p-3 sm:p-6",
                    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-[2%] data-[state=open]:slide-in-from-top-[2%]"
                )}
            >
                <DialogHeader className="space-y-2">
                    <DialogTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                        <Palette className="h-5 w-5" />
                        <span>Choose Color Theme</span>
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                        Select a color theme that matches your style and
                        preferences.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 py-3 sm:py-4">
                    {themes.map((theme) => (
                        <Card
                            key={theme.value}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                                currentTheme === theme.value
                                    ? "ring-2 ring-primary"
                                    : ""
                            }`}
                            onClick={() => selectTheme(theme.value)}
                        >
                            <CardHeader className="p-3 sm:p-4 sm:pb-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base sm:text-lg flex items-center space-x-1 sm:space-x-2">
                                            <span>{theme.name}</span>
                                            {currentTheme === theme.value && (
                                                <Check className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                                            )}
                                        </CardTitle>
                                        <CardDescription className="text-xs sm:text-sm">
                                            {theme.description}
                                        </CardDescription>
                                    </div>
                                    {currentTheme === theme.value && (
                                        <Badge
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            Active
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                                <div className="flex space-x-2 sm:space-x-3">
                                    {/* Background circle with text preview */}
                                    <div
                                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-md border border-border shadow-sm flex items-center justify-center text-xs font-bold"
                                        style={{
                                            backgroundColor:
                                                theme.colors.background,
                                            color: theme.colors.foreground,
                                        }}
                                    >
                                        Aa
                                    </div>

                                    {/* Primary color */}
                                    <div
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-border shadow-sm"
                                        style={{
                                            backgroundColor:
                                                theme.colors.preview[0],
                                        }}
                                    />

                                    {/* Secondary color */}
                                    <div
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-border shadow-sm"
                                        style={{
                                            backgroundColor:
                                                theme.colors.preview[1],
                                        }}
                                    />

                                    {/* Accent color */}
                                    <div
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-border shadow-sm"
                                        style={{
                                            backgroundColor:
                                                theme.colors.preview[2],
                                        }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {showCustomization && (
                    <div className="mt-4 p-4 border border-dashed border-primary/50 rounded-md">
                        <div className="flex flex-col gap-3">
                            <h3 className="text-sm font-medium flex items-center gap-2">
                                <Palette className="h-4 w-4" />
                                Customize Colors
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Primary Color
                                    </label>
                                    <input
                                        type="color"
                                        value={customColors.primary}
                                        onChange={(e) =>
                                            handleCustomColorChange(
                                                "primary",
                                                e.target.value
                                            )
                                        }
                                        onInput={(e) =>
                                            handleCustomColorChange(
                                                "primary",
                                                (e.target as HTMLInputElement)
                                                    .value
                                            )
                                        }
                                        className="w-full h-8 rounded cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Secondary Color
                                    </label>
                                    <input
                                        type="color"
                                        value={customColors.secondary}
                                        onChange={(e) =>
                                            handleCustomColorChange(
                                                "secondary",
                                                e.target.value
                                            )
                                        }
                                        className="w-full h-8 rounded cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Accent Color
                                    </label>
                                    <input
                                        type="color"
                                        value={customColors.accent}
                                        onChange={(e) =>
                                            handleCustomColorChange(
                                                "accent",
                                                e.target.value
                                            )
                                        }
                                        className="w-full h-8 rounded cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Background Color
                                    </label>
                                    <input
                                        type="color"
                                        value={customColors.background}
                                        onChange={(e) =>
                                            handleCustomColorChange(
                                                "background",
                                                e.target.value
                                            )
                                        }
                                        className="w-full h-8 rounded cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Text Color
                                    </label>
                                    <input
                                        type="color"
                                        value={customColors.foreground}
                                        onChange={(e) =>
                                            handleCustomColorChange(
                                                "foreground",
                                                e.target.value
                                            )
                                        }
                                        className="w-full h-8 rounded cursor-pointer"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Changes are applied immediately. Your custom
                                theme will be saved automatically.
                            </p>
                        </div>
                    </div>
                )}

                {showImageUpload && (
                    <div className="mt-4 p-4 border border-dashed border-primary/50 rounded-md">
                        <div className="flex flex-col gap-3">
                            <h3 className="text-sm font-medium flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" />
                                Background Image
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Upload an image to use as your background. The
                                theme will make content areas semi-transparent.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex items-center gap-2"
                                    onClick={handleImageUploadClick}
                                >
                                    <Upload className="h-4 w-4" />
                                    {userPreferences.backgroundImage
                                        ? "Change Image"
                                        : "Upload Image"}
                                </Button>

                                {userPreferences.backgroundImage && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex items-center gap-2 text-destructive hover:text-destructive"
                                        onClick={handleRemoveBackground}
                                    >
                                        Remove Image
                                    </Button>
                                )}

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>

                            {userPreferences.backgroundImage && (
                                <div className="mt-2 relative">
                                    <p className="text-xs text-muted-foreground mb-1">
                                        Current Background:
                                    </p>
                                    <div className="h-16 w-full relative rounded-md overflow-hidden border border-border">
                                        <div
                                            className="w-full h-full bg-cover bg-center"
                                            style={{
                                                backgroundImage: `url(${userPreferences.backgroundImage})`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 sm:pt-4 border-t">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Theme changes apply immediately and are saved
                        automatically.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectTheme("default")}
                        className="bg-transparent self-end sm:self-auto"
                    >
                        Reset to Default
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
