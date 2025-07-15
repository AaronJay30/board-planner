"use client";

import React, {
    createContext,
    useContext,
    ReactNode,
    useEffect,
    useState,
} from "react";
import { useBackgroundImage } from "./background-image-context";
import { useColorTheme } from "./theme-provider";

interface BackgroundProviderProps {
    children: ReactNode;
}

export function BackgroundProvider({ children }: BackgroundProviderProps) {
    const { colorTheme } = useColorTheme();
    const isImageTheme = colorTheme === "image-theme";
    const { backgroundImage } = useBackgroundImage();

    // Apply transparent background for content areas when image theme is active
    useEffect(() => {
        if (typeof document !== "undefined") {
            const root = document.documentElement;

            // Apply or remove the special background class
            if (isImageTheme && backgroundImage) {
                root.classList.add("image-theme-active");
            } else {
                root.classList.remove("image-theme-active");
            }

            // Add global styles for transparent elements when using image theme
            if (!document.getElementById("image-theme-styles")) {
                const styleEl = document.createElement("style");
                styleEl.id = "image-theme-styles";
                styleEl.textContent = `
          .image-theme-active .card,
          .image-theme-active .dropdown-menu-content,
          .image-theme-active .dialog-content,
          .image-theme-active .popover-content,
          .image-theme-active .sheet-content,
          .image-theme-active [data-radix-popper-content-wrapper] {
            background-color: rgba(255, 255, 255, 0.85) !important;
            backdrop-filter: blur(8px);
          }
          
          .dark .image-theme-active .card,
          .dark .image-theme-active .dropdown-menu-content,
          .dark .image-theme-active .dialog-content,
          .dark .image-theme-active .popover-content,
          .dark .image-theme-active .sheet-content,
          .dark .image-theme-active [data-radix-popper-content-wrapper] {
            background-color: rgba(30, 30, 30, 0.85) !important;
            backdrop-filter: blur(8px);
          }
        `;
                document.head.appendChild(styleEl);
            }
        }
    }, [isImageTheme, backgroundImage]);

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
            }}
        >
            {backgroundImage && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        opacity: isImageTheme ? 0.35 : 0.2, // More visible when image theme is active
                        zIndex: -1,
                    }}
                />
            )}
            {children}
        </div>
    );
}
