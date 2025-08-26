"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Play,
    Pause,
    RotateCcw,
    Check,
    X,
    Maximize2,
    Minimize2,
} from "lucide-react";

interface FullscreenPomodoroProps {
    isOpen: boolean;
    onClose: () => void;
    currentTime: number;
    currentBreakTime: number;
    isRunning: boolean;
    isBreak: boolean;
    pomodoroMinutes: number;
    breakMinutes: number;
    breakDuration: number;
    todayTimes: { study: number; break: number };
    formatTime: (seconds: number) => string;
    handlePomodoroMinutesChange: (delta: number) => void;
    handleBreakMinutesChange: (delta: number) => void;
    setIsRunning: (running: boolean) => void;
    resumeFromBreak: () => void;
    resetTimer: () => void;
    finishPomodoro: () => void;
    startBreak: () => void;
    playAlarm: () => void;
}

export function FullscreenPomodoro({
    isOpen,
    onClose,
    currentTime,
    currentBreakTime,
    isRunning,
    isBreak,
    pomodoroMinutes,
    breakMinutes,
    breakDuration,
    todayTimes,
    formatTime,
    handlePomodoroMinutesChange,
    handleBreakMinutesChange,
    setIsRunning,
    resumeFromBreak,
    resetTimer,
    finishPomodoro,
    startBreak,
    playAlarm,
}: FullscreenPomodoroProps) {
    // Handle browser fullscreen
    const enterBrowserFullscreen = async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (error) {
            console.warn("Could not enter browser fullscreen:", error);
        }
    };

    const exitBrowserFullscreen = async () => {
        try {
            if (document.fullscreenElement && document.exitFullscreen) {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.warn("Could not exit browser fullscreen:", error);
        }
    };

    // Handle fullscreen toggle
    const toggleBrowserFullscreen = async () => {
        if (document.fullscreenElement) {
            await exitBrowserFullscreen();
        } else {
            await enterBrowserFullscreen();
        }
    };

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isOpen) return;

            switch (event.key) {
                case "Escape":
                    onClose();
                    break;
                case " ":
                    event.preventDefault();
                    if (isBreak) {
                        resumeFromBreak();
                    } else {
                        setIsRunning(!isRunning);
                    }
                    break;
                case "r":
                    event.preventDefault();
                    resetTimer();
                    break;
                case "f":
                    event.preventDefault();
                    toggleBrowserFullscreen();
                    break;
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            // Enter browser fullscreen when opening
            enterBrowserFullscreen();
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            // Exit browser fullscreen when closing
            if (!isOpen) {
                exitBrowserFullscreen();
            }
        };
    }, [isOpen, isRunning, isBreak]);

    // Handle browser fullscreen exit with ESC
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && isOpen) {
                // If user exits browser fullscreen with ESC, close the component
                onClose();
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => {
            document.removeEventListener(
                "fullscreenchange",
                handleFullscreenChange
            );
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#000016] z-50 flex flex-col items-center justify-center">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />

            {/* Close button */}
            <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-10"
                onClick={onClose}
            >
                <X className="w-5 h-5" />
            </Button>

            {/* Browser fullscreen toggle */}
            <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 left-4 z-10"
                onClick={toggleBrowserFullscreen}
            >
                {document.fullscreenElement ? (
                    <Minimize2 className="w-5 h-5" />
                ) : (
                    <Maximize2 className="w-5 h-5" />
                )}
            </Button>

            <div className="relative z-10 flex flex-col items-center space-y-8">
                {/* Status badges */}
                <div className="flex gap-4">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                        Study: {Math.floor(todayTimes.study / 3600)}h{" "}
                        {Math.floor((todayTimes.study % 3600) / 60)}m{" "}
                        {todayTimes.study % 60}s
                    </Badge>
                    <Badge variant="destructive" className="text-sm px-3 py-1">
                        Break: {Math.floor(todayTimes.break / 3600)}h{" "}
                        {Math.floor((todayTimes.break % 3600) / 60)}m{" "}
                        {todayTimes.break % 60}s
                    </Badge>
                </div>

                {/* Timer display */}
                <div className="text-center">
                    <h1 className="text-2xl font-semibold mb-4 text-muted-foreground">
                        {isBreak
                            ? `Break Time (${formatTime(
                                  currentBreakTime
                              )} remaining)`
                            : "Focus Time"}
                    </h1>
                    <div className="text-9xl font-mono font-bold tracking-wider">
                        {formatTime(isBreak ? currentBreakTime : currentTime)}
                    </div>
                </div>

                {/* Timer controls */}
                <div className="flex items-center space-x-4">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                            isBreak
                                ? handleBreakMinutesChange(-1)
                                : handlePomodoroMinutesChange(-5)
                        }
                        className="px-4"
                    >
                        {isBreak ? "-1" : "-5"}
                    </Button>
                    <span className="font-mono text-xl px-4">
                        {isBreak
                            ? `${breakMinutes} min`
                            : `${pomodoroMinutes} min`}
                    </span>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                            isBreak
                                ? handleBreakMinutesChange(1)
                                : handlePomodoroMinutesChange(5)
                        }
                        className="px-4"
                    >
                        {isBreak ? "+1" : "+5"}
                    </Button>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-4 justify-center">
                    {/* Pause/Play */}
                    {isBreak ? (
                        <Button
                            onClick={() => setIsRunning(!isRunning)}
                            variant={isRunning ? "secondary" : "default"}
                            size="lg"
                            className="px-8"
                        >
                            {isRunning ? (
                                <>
                                    <Pause className="w-5 h-5 mr-2" /> Pause Break
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5 mr-2" /> Start Break
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={() => setIsRunning(!isRunning)}
                            variant={isRunning ? "secondary" : "default"}
                            size="lg"
                            className="px-8 hover:bg-accent hover:text-accent-foreground"
                        >
                            {isRunning ? (
                                <>
                                    <Pause className="w-5 h-5 mr-2" /> Pause
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5 mr-2" /> Start
                                </>
                            )}
                        </Button>
                    )}

                    {/* Reset */}
                    <Button
                        onClick={resetTimer}
                        variant="outline"
                        size="lg"
                        className="px-8"
                    >
                        <RotateCcw className="w-5 h-5 mr-2" /> Reset
                    </Button>

                    {/* Finish */}
                    <Button
                        onClick={finishPomodoro}
                        variant="default"
                        size="lg"
                        className="px-8 hover:bg-accent hover:text-accent-foreground "
                    >
                        <Check className="w-5 h-5 mr-2" /> Finish
                    </Button>

                    {/* Break */}
                    {!isBreak && (
                        <Button
                            onClick={startBreak}
                            variant="destructive"
                            size="lg"
                            className="px-8"
                        >
                            <Pause className="w-5 h-5 mr-2" /> Break
                        </Button>
                    )}

                    {/* End Break - only show when in break mode */}
                    {isBreak && (
                        <Button
                            onClick={resumeFromBreak}
                            variant="outline"
                            size="lg"
                            className="px-8"
                        >
                            <Check className="w-5 h-5 mr-2" /> End Break
                        </Button>
                    )}
                </div>

                {/* Keyboard shortcuts help */}
                <div className="text-center text-sm text-muted-foreground space-y-1 max-w-md">
                    <p className="font-medium">Keyboard Shortcuts:</p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <span>Space: Play/Pause</span>
                        <span>R: Reset</span>
                        <span>F: Fullscreen</span>
                        <span>ESC: Exit</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
