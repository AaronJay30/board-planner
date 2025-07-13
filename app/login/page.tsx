"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2, Mail } from "lucide-react";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { UserData } from "@/lib/firebase-utils";

export default function LoginPage() {
    const [passcode, setPasscode] = useState<string[]>(Array(5).fill(""));
    const [focusedIndex, setFocusedIndex] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(5).fill(null));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [emailVerificationOpen, setEmailVerificationOpen] = useState(false);
    const [foundUsers, setFoundUsers] = useState<UserData[]>([]);
    const [verifyEmail, setVerifyEmail] = useState("");
    const router = useRouter();
    const { handlePINLogin, handlePINVerification } = useAuth();

    useEffect(() => {
        // Focus on the first input when the component mounts
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    const handleInputChange = (index: number, value: string) => {
        // Only allow numbers
        if (!/^\d*$/.test(value)) return;

        // Update the passcode array
        const newPasscode = [...passcode];
        newPasscode[index] = value.slice(-1); // Only keep the last character if multiple are somehow entered
        setPasscode(newPasscode);

        // Auto advance to next input if a digit was entered
        if (value && index < 4) {
            setFocusedIndex(index + 1);
            inputRefs.current[index + 1]?.focus();
        }

        // Check if all inputs are filled
        if (
            newPasscode.every((digit) => digit !== "") ||
            (index === 4 && value)
        ) {
            validatePasscode(newPasscode.join(""));
        }
    };

    const handleKeyDown = (
        index: number,
        e: React.KeyboardEvent<HTMLInputElement>
    ) => {
        // Move to previous input on backspace if current input is empty
        if (e.key === "Backspace" && !passcode[index] && index > 0) {
            setFocusedIndex(index - 1);
            inputRefs.current[index - 1]?.focus();
        }
    };

    const validatePasscode = async (code: string) => {
        setError("");

        if (code.length < 5) {
            return;
        }

        try {
            setLoading(true);

            // Use our auth context function
            const result = await handlePINLogin(code);

            if (!result) {
                // No user found with this PIN
                setError("Invalid PIN. Please try again.");

                // Clear passcode after a short delay to indicate error
                setTimeout(() => {
                    setPasscode(Array(5).fill(""));
                    setFocusedIndex(0);
                    inputRefs.current[0]?.focus();
                }, 500);
                return;
            }

            if (Array.isArray(result)) {
                // Multiple users found with this PIN, need email verification
                setFoundUsers(result);
                setEmailVerificationOpen(true);
                return;
            }

            // Single user case is handled in auth context
            // The auth context will update state and redirect
        } catch (error: any) {
            console.error("Login error:", error);
            setError(error.message || "An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleEmailVerification = async () => {
        if (!verifyEmail.trim()) {
            return;
        }

        try {
            setLoading(true);
            const pin = passcode.join("");
            const result = await handlePINVerification(pin, verifyEmail);

            if (!result) {
                setError("Email doesn't match any account with this PIN.");
                setEmailVerificationOpen(false);
                return;
            }

            // Successfully verified, redirect to dashboard
            // (The auth context will handle storing user data and redirecting)
        } catch (error: any) {
            console.error("Email verification error:", error);
            setError(
                error.message || "Email verification failed. Please try again."
            );
            setEmailVerificationOpen(false);
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
                        Enter PIN Code
                    </CardTitle>
                    <CardDescription className="text-center">
                        Enter your 5-digit PIN code to access your planner
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex justify-center space-x-2 my-6">
                        {passcode.map((digit, index) => (
                            <div key={index} className="w-10 text-center">
                                <input
                                    ref={(el) => {
                                        inputRefs.current[index] = el;
                                    }}
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) =>
                                        handleInputChange(index, e.target.value)
                                    }
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="w-full text-center text-2xl border-b-2 border-input focus:border-primary focus:outline-none p-1 bg-transparent"
                                    style={{
                                        caretColor: "transparent", // Hide cursor
                                    }}
                                    disabled={loading}
                                />
                            </div>
                        ))}
                    </div>

                    {loading && (
                        <div className="flex justify-center mt-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                    <div className="text-sm text-center text-muted-foreground">
                        Don't have an account?{" "}
                        <Link
                            href="/register"
                            className="text-primary font-medium hover:underline"
                        >
                            Register
                        </Link>
                    </div>
                </CardFooter>
            </Card>

            {/* Email verification dialog for shared PINs */}
            <Dialog
                open={emailVerificationOpen}
                onOpenChange={setEmailVerificationOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Verify Your Email</DialogTitle>
                        <DialogDescription>
                            Multiple accounts found with this PIN. Please enter
                            your email to verify your identity.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="verify-email">Email Address</Label>
                            <div className="flex items-center space-x-2">
                                <Mail className="w-5 h-5 text-muted-foreground" />
                                <Input
                                    id="verify-email"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={verifyEmail}
                                    onChange={(e) =>
                                        setVerifyEmail(e.target.value)
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEmailVerificationOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEmailVerification}
                            className="hover:bg-accent hover:text-accent-foreground"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Verify & Login
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
