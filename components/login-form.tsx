"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { FcGoogle } from "react-icons/fc";

export function LoginForm() {
    const { signInWithGoogle } = useAuth();

    return (
        <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
                Sign in to access all features of the Licensure Review App.
            </div>

            <Button
                onClick={signInWithGoogle}
                variant="default"
                className="w-full flex items-center justify-center gap-2"
            >
                <FcGoogle className="h-5 w-5" />
                Sign in with Google
            </Button>
        </div>
    );
}
