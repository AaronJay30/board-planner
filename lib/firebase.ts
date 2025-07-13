// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, // Add this for Realtime Database
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// For debugging - remove in production
if (typeof window !== "undefined") {
    console.log("Firebase Config:", {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Set" : "Not Set",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
            ? "Set"
            : "Not Set",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
            ? "Set"
            : "Not Set",
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
            ? "Set"
            : "Not Set",
    });
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const database = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

export { auth, database, googleProvider };
