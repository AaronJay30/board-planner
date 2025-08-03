"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Music } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export function FloatingMusicButton() {
    const { user } = useAuth();
    const router = useRouter();

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <Dialog>
                <DialogTrigger asChild>
                    <Button
                        size="lg"
                        className="rounded-full h-14 w-14 shadow-lg"
                    >
                        <Music className="h-6 w-6" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <Music className="h-5 w-5" />
                            <span>Study Music</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {user ? (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Enjoy your study music.
                                </p>

                                {/* Apple Music Embed Placeholder */}
                                <div className="aspect-video bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center text-white">
                                    <div className="text-center">
                                        <Music className="h-12 w-12 mx-auto mb-2" />
                                        <p className="font-semibold">
                                            Apple Music
                                        </p>
                                        <p className="text-sm opacity-90">
                                            Study Playlist
                                        </p>
                                    </div>
                                </div>

                                {/* Embedded Apple Music iframe would go here */}
                                <iframe
                                    allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
                                    frameBorder="0"
                                    height="175"
                                    style={{
                                        width: "100%",
                                        maxWidth: "660px",
                                        overflow: "hidden",
                                        borderRadius: "10px",
                                    }}
                                    sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
                                    src="https://embed.music.apple.com/us/playlist/lecture-videos-music/pl.u-8aAVZANFWqjEy0"
                                />
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="h-12 w-12 mx-auto mb-4 text-muted-foreground flex items-center justify-center">
                                    <Music className="h-10 w-10" />
                                </div>
                                <p className="text-muted-foreground">
                                    Please log in to access study music
                                </p>
                                <Button
                                    onClick={() => router.push("/login")}
                                    variant="outline"
                                    className="mt-4"
                                >
                                    Go to Login
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
