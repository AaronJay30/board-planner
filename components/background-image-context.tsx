"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

interface BackgroundImageContextType {
    backgroundImage: string | null;
    setBackgroundImage: (img: string | null) => void;
}

const BackgroundImageContext = createContext<
    BackgroundImageContextType | undefined
>(undefined);

export function BackgroundImageProvider({ children }: { children: ReactNode }) {
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
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
