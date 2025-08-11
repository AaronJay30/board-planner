"use client";
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";

interface BackgroundImageContextType {
    backgroundImage: string | null;
    setBackgroundImage: (img: string | null) => void;
}

const BackgroundImageContext = createContext<
    BackgroundImageContextType | undefined
>(undefined);

export function BackgroundImageProvider({ children }: { children: ReactNode }) {
    const [backgroundImage, setBackgroundImageState] = useState<string | null>(
        null
    );

    // Load from localStorage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const userId = localStorage.getItem("userId");
            if (userId) {
                const savedImage = localStorage.getItem(
                    `backgroundImage-${userId}`
                );
                if (savedImage) {
                    setBackgroundImageState(savedImage);
                }
            }
        }
    }, []);

    const setBackgroundImage = (img: string | null) => {
        setBackgroundImageState(img);

        // Persist to localStorage with userId-specific key
        if (typeof window !== "undefined") {
            const userId = localStorage.getItem("userId");
            if (userId) {
                if (img) {
                    localStorage.setItem(`backgroundImage-${userId}`, img);
                } else {
                    localStorage.removeItem(`backgroundImage-${userId}`);
                }
            }
        }
    };

    return (
        <BackgroundImageContext.Provider
            value={{ backgroundImage, setBackgroundImage }}
        >
            {children}
        </BackgroundImageContext.Provider>
    );
}

export function useBackgroundImage() {
    const ctx = useContext(BackgroundImageContext);
    if (!ctx)
        throw new Error(
            "useBackgroundImage must be used within BackgroundImageProvider"
        );
    return ctx;
}
