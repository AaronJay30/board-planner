"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import {
    User,
    signOut as firebaseSignOut,
    onAuthStateChanged,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import {
    UserData,
    UserPreferences,
    loginWithPIN,
    verifyUserEmailWithPIN,
    registerWithPIN,
    getUserPreferences,
    uploadBackgroundImage,
    deleteBackgroundImage,
    updateUserPreferences as updateFirebasePreferences,
    getUserById,
} from "@/lib/firebase-utils";

type AuthContextType = {
    user: User | null;
    userData: UserData | null;
    loading: boolean;
    signOut: () => Promise<void>;
    isLoggedIn: boolean;
    userName: string | null;
    handlePINLogin: (pin: string) => Promise<UserData | UserData[] | null>;
    handlePINVerification: (
        pin: string,
        email: string
    ) => Promise<UserData | null>;
    registerUser: (
        name: string,
        email: string,
        pin: string
    ) => Promise<UserData>;
    userPreferences: UserPreferences;
    setBackgroundImage: (imageDataUrl: string) => Promise<void>;
    removeBackgroundImage: () => Promise<void>;
    updateUserPreferences: (newPreferences: UserPreferences) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    const [userPreferences, setUserPreferences] = useState<UserPreferences>({});
    const router = useRouter();

    // Check for Firebase auth and local storage auth
    useEffect(() => {
        const checkLocalAuth = () => {
            const userId = localStorage.getItem("userId");
            const userName = localStorage.getItem("userName");

            if (userId) {
                setIsLoggedIn(true);
                setUserName(userName);

                // Set user data from local storage
                const email = localStorage.getItem("userEmail") || "";
                const pin = localStorage.getItem("userPIN") || "";

                setUserData({
                    id: userId,
                    name: userName || "User",
                    email,
                    pin,
                });
            }
        };

        // First check Firebase auth
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            setLoading(false);

            if (user) {
                // User is signed in with Firebase, get the ID token
                const token = await user.getIdToken();
                setIsLoggedIn(true);
                setUserName(user.displayName);

                // Set a cookie for server-side auth (middleware will use this)
                document.cookie = `firebaseAuthSession=${token}; path=/; max-age=3600; SameSite=Strict`;

                // Get user data
                const userDoc = await getUserById(user.uid);
                if (userDoc) {
                    setUserData(userDoc);
                    setIsLoggedIn(true);
                    setUserName(userDoc.name);

                    // Get user preferences
                    const prefs = await getUserPreferences(user.uid);
                    setUserPreferences(prefs);
                }
            } else {
                // User is signed out of Firebase, clear the cookie
                document.cookie =
                    "firebaseAuthSession=; path=/; max-age=0; SameSite=Strict";

                // Check local storage auth as fallback
                checkLocalAuth();
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const handlePINLogin = async (pin: string) => {
        try {
            console.log("Attempting login with PIN:", pin);
            const result = await loginWithPIN(pin);
            console.log("Login result:", result);

            // If result is a single user (not null and not an array), store user data and set login state
            if (result && !Array.isArray(result)) {
                console.log(
                    "Single user found, setting auth state and redirecting"
                );
                // Store user info in local storage
                localStorage.setItem("userId", result.id);
                localStorage.setItem("userName", result.name);
                localStorage.setItem("userEmail", result.email);
                localStorage.setItem("userPIN", result.pin);

                // Set a cookie for server-side auth (middleware will use this)
                const authToken = `${result.id}:${result.pin}`;
                document.cookie = `pinAuthSession=${authToken}; path=/; max-age=86400; SameSite=Strict`;

                setIsLoggedIn(true);
                setUserName(result.name);
                setUserData(result);

                // After successful login with single user, redirect to dashboard
                router.push("/dashboard");
            } else if (Array.isArray(result)) {
                console.log(
                    "Multiple users found with same PIN:",
                    result.length
                );
            } else {
                console.log("No user found with this PIN");
            }

            return result;
        } catch (error) {
            console.error("Error logging in with PIN", error);
            throw error;
        }
    };

    const handlePINVerification = async (pin: string, email: string) => {
        try {
            const result = await verifyUserEmailWithPIN(pin, email);

            if (result) {
                // Store user info in local storage
                localStorage.setItem("userId", result.id);
                localStorage.setItem("userName", result.name);
                localStorage.setItem("userEmail", result.email);
                localStorage.setItem("userPIN", result.pin);

                // Set a cookie for server-side auth (middleware will use this)
                const authToken = `${result.id}:${result.pin}`;
                document.cookie = `pinAuthSession=${authToken}; path=/; max-age=86400; SameSite=Strict`;

                setIsLoggedIn(true);
                setUserName(result.name);
                setUserData(result);

                // After successful login, redirect to dashboard
                router.push("/dashboard");
            }

            return result;
        } catch (error) {
            console.error("Error verifying PIN with email", error);
            throw error;
        }
    };

    const handleRegistration = async (
        name: string,
        email: string,
        pin: string
    ) => {
        try {
            const userData = await registerWithPIN(email, name, pin);

            // Store user info in local storage
            localStorage.setItem("userId", userData.id);
            localStorage.setItem("userName", userData.name);
            localStorage.setItem("userEmail", userData.email);
            localStorage.setItem("userPIN", userData.pin);

            // Set a cookie for server-side auth (middleware will use this)
            const authToken = `${userData.id}:${userData.pin}`;
            document.cookie = `pinAuthSession=${authToken}; path=/; max-age=86400; SameSite=Strict`;

            setIsLoggedIn(true);
            setUserName(userData.name);
            setUserData(userData);

            // After successful registration, redirect to dashboard
            router.push("/dashboard");

            return userData;
        } catch (error) {
            console.error("Error registering user", error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            // Clear Firebase auth if exists
            await firebaseSignOut(auth);

            // Clear local storage auth
            localStorage.removeItem("userId");
            localStorage.removeItem("userName");
            localStorage.removeItem("userEmail");
            localStorage.removeItem("userPIN");

            // Clear auth cookies
            document.cookie =
                "firebaseAuthSession=; path=/; max-age=0; SameSite=Strict";
            document.cookie =
                "pinAuthSession=; path=/; max-age=0; SameSite=Strict";

            setIsLoggedIn(false);
            setUserName(null);
            setUserData(null);

            // After sign out, redirect to login page
            router.push("/login");
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    // Function to set background image
    const handleSetBackgroundImage = async (imageDataUrl: string) => {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        try {
            await uploadBackgroundImage(userId, imageDataUrl);
            setUserPreferences((prev) => ({
                ...prev,
                backgroundImage: imageDataUrl,
            }));
        } catch (error) {
            console.error("Error setting background image:", error);
            throw error;
        }
    };

    // Function to remove background image
    const handleRemoveBackgroundImage = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        try {
            await deleteBackgroundImage(userId);
            setUserPreferences((prev) => ({
                ...prev,
                backgroundImage: undefined,
            }));
        } catch (error) {
            console.error("Error removing background image:", error);
            throw error;
        }
    };

    const updateUserPreferences = async (newPreferences: UserPreferences) => {
        if (!userData?.id) return;
        await updateFirebasePreferences(userData.id, newPreferences);
        setUserPreferences(newPreferences);
    };

    const registerUser = async (name: string, email: string, pin: string) => {
        try {
            const newUserData = await registerWithPIN(email, name, pin);
            setUserData(newUserData);
            setIsLoggedIn(true);
            return newUserData;
        } catch (error) {
            console.error("Registration error:", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                userData,
                loading,
                signOut,
                isLoggedIn,
                userName: userData?.name || null,
                handlePINLogin,
                handlePINVerification,
                registerUser,
                userPreferences,
                setBackgroundImage: handleSetBackgroundImage,
                removeBackgroundImage: handleRemoveBackgroundImage,
                updateUserPreferences,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}
