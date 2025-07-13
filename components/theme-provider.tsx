"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

// Create a context to track our custom color theme
type ColorThemeContextType = {
    colorTheme: string;
    setColorTheme: (theme: string) => void;
};

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(
    undefined
);

export function useColorTheme() {
    const context = useContext(ColorThemeContext);
    if (context === undefined) {
        throw new Error("useColorTheme must be used within a ThemeProvider");
    }
    return context;
}

export function ThemeProvider({
    children,
    attribute = "class",
    defaultTheme = "system",
    enableSystem = true,
    disableTransitionOnChange = false,
    ...props
}: ThemeProviderProps) {
    const [colorTheme, setColorTheme] = useState("default");
    const [mounted, setMounted] = useState(false);

    // Function to apply theme directly
    const applyThemeDirectly = (themeName: string) => {
        if (typeof window === "undefined") return;

        const root = document.documentElement;

        // Remove all theme classes first
        root.classList.forEach((className) => {
            if (className.startsWith("theme-")) {
                root.classList.remove(className);
            }
        });

        // Add the new theme class if not default
        if (themeName !== "default") {
            root.classList.add(`theme-${themeName}`);
        }
    };

    // Handle mounting (to avoid hydration mismatch)
    useEffect(() => {
        setMounted(true);
    }, []);

    // Set the initial color theme and add dark mode listener
    useEffect(() => {
        if (mounted) {
            // Initialize from localStorage if available
            const savedTheme = localStorage.getItem("color-theme");
            if (savedTheme) {
                setColorTheme(savedTheme);
                applyThemeDirectly(savedTheme);
            }

            // Add a transition class temporarily when the theme is first loaded
            document.body.classList.add("theme-transition");
            setTimeout(() => {
                document.body.classList.remove("theme-transition");
            }, 1000);

            // Add a listener for system dark mode changes
            const darkModeMediaQuery = window.matchMedia(
                "(prefers-color-scheme: dark)"
            );
            const handleDarkModeChange = (e: MediaQueryListEvent) => {
                // Reapply the current theme with the new dark mode setting
                const savedTheme = localStorage.getItem("color-theme");
                if (savedTheme) {
                    applyThemeDirectly(savedTheme);
                }

                // Add transition for smooth color changes
                document.body.classList.add("theme-transition");
                setTimeout(() => {
                    document.body.classList.remove("theme-transition");
                }, 1000);

                console.log(
                    `Dark mode changed to: ${e.matches ? "dark" : "light"}`
                );
                console.log(`Current theme: ${savedTheme || "default"}`);
            };

            darkModeMediaQuery.addEventListener("change", handleDarkModeChange);

            return () => {
                darkModeMediaQuery.removeEventListener(
                    "change",
                    handleDarkModeChange
                );
            };
        }
    }, [mounted]);

    // Update colorTheme when it changes
    const handleSetColorTheme = (theme: string) => {
        setColorTheme(theme);
        localStorage.setItem("color-theme", theme);
        applyThemeDirectly(theme);
    };

    return (
        <ColorThemeContext.Provider
            value={{ colorTheme, setColorTheme: handleSetColorTheme }}
        >
            <NextThemesProvider
                attribute={attribute}
                defaultTheme={defaultTheme}
                enableSystem={enableSystem}
                disableTransitionOnChange={disableTransitionOnChange}
                {...props}
            >
                {children}
            </NextThemesProvider>
        </ColorThemeContext.Provider>
    );
}
