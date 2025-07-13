"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPin, setShowPin] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const { registerUser } = useAuth();

    const validatePin = (pin: string) => {
        return /^\d{5}$/.test(pin);
    };

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validate inputs
        if (!name.trim()) {
            setError("Please enter your name");
            return;
        }

        if (!validateEmail(email)) {
            setError("Please enter a valid email address");
            return;
        }

        if (!validatePin(pin)) {
            setError("PIN must be exactly 5 digits");
            return;
        }

        if (pin !== confirmPin) {
            setError("PINs do not match");
            return;
        }

        try {
            setLoading(true);

            // Register user with our auth context
            await registerUser(name, email, pin);

            setSuccess(true);

            // Redirect to dashboard (auth context will handle this)
        } catch (error: any) {
            console.error("Registration error:", error);
            setError(error.message || "Failed to register. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="flex items-center gap-2 mb-8">
                <GraduationCap className="h-10 w-10 text-primary" />
                <h1 className="text-2xl font-bold">BoardPlanner</h1>
            </div>

            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">
                        Create Account
                    </CardTitle>
                    <CardDescription className="text-center">
                        Register to create your own personalized planner
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <Alert className="bg-green-50 border-green-200 text-green-800 mb-4">
                            <AlertDescription>
                                Registration successful! Redirecting to
                                dashboard...
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-4">
                            {error && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Enter your name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="pin">PIN Code (5 digits)</Label>
                                <div className="relative">
                                    <Input
                                        id="pin"
                                        type={showPin ? "text" : "password"}
                                        placeholder="Enter PIN code"
                                        pattern="[0-9]{5}"
                                        inputMode="numeric"
                                        value={pin}
                                        onChange={(e) =>
                                            setPin(
                                                e.target.value
                                                    .replace(/\D/g, "")
                                                    .slice(0, 5)
                                            )
                                        }
                                        disabled={loading}
                                        required
                                        className="pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2"
                                        onClick={() => setShowPin(!showPin)}
                                    >
                                        {showPin ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPin">
                                    Confirm PIN Code
                                </Label>
                                <Input
                                    id="confirmPin"
                                    type={showPin ? "text" : "password"}
                                    placeholder="Confirm PIN code"
                                    pattern="[0-9]{5}"
                                    inputMode="numeric"
                                    value={confirmPin}
                                    onChange={(e) =>
                                        setConfirmPin(
                                            e.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 5)
                                        )
                                    }
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating Account...
                                    </>
                                ) : (
                                    "Register"
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                    <div className="text-sm text-center text-muted-foreground">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="text-primary font-medium hover:underline"
                        >
                            Sign In
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
