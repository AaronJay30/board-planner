"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
    getSubjects,
    getVideos,
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    getStudyTime,
    setStudyTime,
    incrementStudyTime,
    updateVideo,
} from "@/lib/firebase-utils";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Play,
    Pause,
    RotateCcw,
    Plus,
    Quote,
    Clock,
    CalendarIcon,
    ExternalLink,
    Pencil,
    Trash2,
    Check,
    X,
} from "lucide-react";
import { DailyQuote } from "@/components/daily-quote";

interface ScheduledVideo {
    id: string;
    title: string;
    subject: string;
    scheduledTime: string;
    url: string;
    date: string;
    time: string;
    completed: boolean;
}

export default function Calendar() {
    // Real subject progress state
    const { userData } = useAuth();
    const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
    const [currentTime, setCurrentTime] = useState(25 * 60); // 25 minutes in seconds
    const [isRunning, setIsRunning] = useState(false);
    const [isBreak, setIsBreak] = useState(false);

    // Modal state for per-date view
    const [modalOpen, setModalOpen] = useState(false);
    const [modalDate, setModalDate] = useState<{
        day: number;
        month: number;
        year: number;
    } | null>(null);

    // Restore Pomodoro state from localStorage on mount
    // --- Pomodoro: Stop auto-start on refresh ---
    useEffect(() => {
        if (typeof window === "undefined") return;
        const saved = localStorage.getItem("pomodoroSimpleState");
        if (saved) {
            try {
                const state = JSON.parse(saved);
                if (typeof state.pomodoroMinutes === "number") {
                    setPomodoroMinutes(state.pomodoroMinutes);
                }
                if (typeof state.currentTime === "number") {
                    setCurrentTime(state.currentTime);
                }
                setIsRunning(false); // always stop on load
                setIsBreak(false);
            } catch {}
        } else {
            setIsRunning(false);
            setIsBreak(false);
        }
    }, []);

    // Save Pomodoro state to localStorage on every change
    useEffect(() => {
        if (typeof window === "undefined") return;
        const state = {
            pomodoroMinutes,
            currentTime,
        };
        localStorage.setItem("pomodoroSimpleState", JSON.stringify(state));
    }, [pomodoroMinutes, currentTime]);

    // Store study and break time in seconds for today
    const [todayTimes, setTodayTimes] = useState<{
        study: number;
        break: number;
    }>({ study: 0, break: 0 });
    useEffect(() => {
        if (!userData?.id) return;
        const today = new Date();
        const dateStr = today.toISOString().split("T")[0];
        getStudyTime(userData.id, dateStr).then((data) => {
            if (data && typeof data === "object") {
                setTodayTimes({
                    study: data.study?.seconds || 0,
                    break: data.break?.seconds || 0,
                });
            } else {
                setTodayTimes({ study: 0, break: 0 });
            }
        });
    }, [userData]);
    const [selectedDate, setSelectedDate] = useState(new Date().getDate());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [todos, setTodos] = useState<any[]>([]);
    // Dedicated state for today's tasks and videos
    const [todaysTodos, setTodaysTodos] = useState<any[]>([]);
    const [todaysVideos, setTodaysVideos] = useState<ScheduledVideo[]>([]);

    // Helper to fetch today's todos
    const fetchTodaysTodos = async () => {
        if (!userData?.id) return;
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
        const dayTodos = await getTasks(userData.id, dateStr);
        setTodaysTodos(dayTodos.map((t: any) => ({ ...t, dueDate: dateStr })));
    };
    useEffect(() => {
        fetchTodaysTodos();
    }, [userData]);

    // Helper to fetch today's videos
    const fetchTodaysVideos = async () => {
        if (!userData?.id) return;
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
        // Fetch all subjects for the user
        const subjects = await getSubjects(userData.id);
        let allVideos: ScheduledVideo[] = [];
        for (const subject of subjects) {
            const videos = await getVideos(userData.id, subject.id);
            const filtered = videos.filter((v: any) => {
                const dStr = v.scheduledDate || v.date;
                return dStr === dateStr;
            });
            allVideos = allVideos.concat(
                filtered.map((v: any) => ({
                    ...v,
                    subject: subject.name,
                    date: v.scheduledDate || v.date,
                }))
            );
        }
        setTodaysVideos(allVideos);
    };
    useEffect(() => {
        fetchTodaysVideos();
    }, [userData]);
    const [newTodo, setNewTodo] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState("");
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [subjectProgress, setSubjectProgress] = useState<
        Record<string, number>
    >({});

    useEffect(() => {
        const fetchSubjectsAndProgress = async () => {
            if (!userData?.id) return;
            setLoadingSubjects(true);
            try {
                const fetchedSubjects = await getSubjects(userData.id);
                setSubjects(fetchedSubjects);
                // For each subject, calculate progress
                const progressMap: Record<string, number> = {};
                for (const subject of fetchedSubjects) {
                    const videos = await getVideos(userData.id, subject.id);
                    if (videos.length === 0) {
                        progressMap[subject.id] = 0;
                    } else {
                        const completed = videos.filter(
                            (v: any) => v.completed
                        ).length;
                        progressMap[subject.id] = Math.round(
                            (completed / videos.length) * 100
                        );
                    }
                }
                setSubjectProgress(progressMap);
            } catch (e) {
                setSubjects([]);
            }
            setLoadingSubjects(false);
        };
        fetchSubjectsAndProgress();
    }, [userData]);

    // Fetch todos for the selected month
    useEffect(() => {
        const fetchTodos = async () => {
            if (!userData?.id) return;
            // Get all tasks for the month
            const daysInMonth = new Date(
                selectedYear,
                selectedMonth + 1,
                0
            ).getDate();
            let allTodos: any[] = [];
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${selectedYear}-${(selectedMonth + 1)
                    .toString()
                    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
                const dayTodos = await getTasks(userData.id, dateStr);
                allTodos = allTodos.concat(
                    dayTodos.map((t: any) => ({ ...t, dueDate: dateStr }))
                );
            }
            setTodos(allTodos);
        };
        fetchTodos();
    }, [userData, selectedMonth, selectedYear]);

    // Scheduled videos fetched from Firebase
    const [scheduledVideos, setScheduledVideos] = useState<ScheduledVideo[]>(
        []
    );

    useEffect(() => {
        const fetchVideos = async () => {
            if (!userData?.id) return;
            // Fetch all subjects for the user
            const subjects = await getSubjects(userData.id);
            let allVideos: ScheduledVideo[] = [];
            for (const subject of subjects) {
                const videos = await getVideos(userData.id, subject.id);
                // Only include videos scheduled in the selected month, supporting both 'date' and 'scheduledDate'
                const filtered = videos.filter((v: any) => {
                    const dateStr = v.scheduledDate || v.date;
                    if (!dateStr) return false;
                    const d = new Date(dateStr);
                    return (
                        d.getFullYear() === selectedYear &&
                        d.getMonth() === selectedMonth
                    );
                });
                // Add subject name and normalized date to each video
                allVideos = allVideos.concat(
                    filtered.map((v: any) => ({
                        ...v,
                        subject: subject.name,
                        date: v.scheduledDate || v.date,
                    }))
                );
            }

            setScheduledVideos(allVideos);
        };
        fetchVideos();
    }, [userData, selectedMonth, selectedYear]);

    // --- Pomodoro Timer Logic ---
    const [breakStart, setBreakStart] = useState<Date | null>(null);
    const [breakDuration, setBreakDuration] = useState<number>(0); // seconds
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isRunning && currentTime > 0 && !isBreak) {
            interval = setInterval(() => {
                setCurrentTime((prev) => prev - 1);
            }, 1000);
        }
        if (isBreak && breakStart) {
            interval = setInterval(() => {
                setBreakDuration(
                    Math.floor((Date.now() - breakStart.getTime()) / 1000)
                );
            }, 1000);
        }
        if (currentTime === 0 && isRunning && !isBreak) {
            setIsRunning(false);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning, currentTime, isBreak, pomodoroMinutes, breakStart]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
    };

    // --- Pomodoro: Remove study time update from reset ---
    const resetTimer = () => {
        setCurrentTime(pomodoroMinutes * 60);
        setIsRunning(false);
        setIsBreak(false);
        setBreakStart(null);
        setBreakDuration(0);
    };

    // Save study and break time as nested seconds fields
    const finishPomodoro = async () => {
        if (!isBreak && userData?.id) {
            const elapsedSeconds = pomodoroMinutes * 60 - currentTime;
            if (elapsedSeconds > 0) {
                const today = new Date();
                const dateStr = today.toISOString().split("T")[0];
                // Save study seconds as nested object
                await incrementStudyTime(userData.id, dateStr, {
                    study: { seconds: elapsedSeconds },
                });
                const updated = await getStudyTime(userData.id, dateStr);
                setTodayTimes({
                    study: updated.study?.seconds || 0,
                    break: updated.break?.seconds || 0,
                });
            }
        }
        // Save break time if any
        if (breakDuration > 0 && userData?.id) {
            const today = new Date();
            const dateStr = today.toISOString().split("T")[0];
            await incrementStudyTime(userData.id, dateStr, {
                break: { seconds: breakDuration },
            });
            const updated = await getStudyTime(userData.id, dateStr);
            setTodayTimes({
                study: updated.study?.seconds || 0,
                break: updated.break?.seconds || 0,
            });
        }
        setCurrentTime(pomodoroMinutes * 60);
        setIsRunning(false);
        setIsBreak(false);
        setBreakStart(null);
        setBreakDuration(0);
    };

    // --- Pomodoro: Break/Resume logic ---
    const startBreak = () => {
        setIsBreak(true);
        setIsRunning(false);
        setBreakStart(new Date());
        setBreakDuration(0);
    };

    // --- Pomodoro: Resume from break (save break time) ---
    const resumeFromBreak = async () => {
        if (breakDuration > 0 && userData?.id) {
            const today = new Date();
            const dateStr = today.toISOString().split("T")[0];
            await incrementStudyTime(userData.id, dateStr, {
                break: { seconds: breakDuration },
            });
            const updated = await getStudyTime(userData.id, dateStr);
            setTodayTimes({
                study: updated.study?.seconds || 0,
                break: updated.break?.seconds || 0,
            });
        }
        setIsBreak(false);
        setIsRunning(true);
        setBreakStart(null);
        setBreakDuration(0);
    };

    const handlePomodoroMinutesChange = (delta: number) => {
        setPomodoroMinutes((prev) => {
            const next = Math.max(1, prev + delta);
            setCurrentTime(next * 60);
            return next;
        });
    };

    // Add a task for the selected day (sidebar or calendar)
    const addTodo = async () => {
        if (!userData?.id || !newTodo.trim()) return;
        const dateStr = `${selectedYear}-${(selectedMonth + 1)
            .toString()
            .padStart(2, "0")}-${selectedDate.toString().padStart(2, "0")}`;
        try {
            await createTask(userData.id, {
                title: newTodo,
                dueDate: dateStr,
            });
            setNewTodo("");
            // Refresh todos for the month
            const daysInMonth = new Date(
                selectedYear,
                selectedMonth + 1,
                0
            ).getDate();
            let allTodos: any[] = [];
            for (let day = 1; day <= daysInMonth; day++) {
                const dStr = `${selectedYear}-${(selectedMonth + 1)
                    .toString()
                    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
                const dayTodos = await getTasks(userData.id, dStr);
                allTodos = allTodos.concat(
                    dayTodos.map((t: any) => ({ ...t, dueDate: dStr }))
                );
            }
            setTodos(allTodos);
            // Also refresh today's todos
            await fetchTodaysTodos();
        } catch (e) {
            // handle error
        }
    };

    const toggleTodo = async (id: string, completed: boolean) => {
        if (!userData?.id) return;
        try {
            await updateTask(userData.id, id, { completed: !completed });
            // Refresh todos for the month
            const daysInMonth = new Date(
                selectedYear,
                selectedMonth + 1,
                0
            ).getDate();
            let allTodos: any[] = [];
            for (let day = 1; day <= daysInMonth; day++) {
                const dStr = `${selectedYear}-${(selectedMonth + 1)
                    .toString()
                    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
                const dayTodos = await getTasks(userData.id, dStr);
                allTodos = allTodos.concat(
                    dayTodos.map((t: any) => ({ ...t, dueDate: dStr }))
                );
            }
            setTodos(allTodos);
            // Also refresh today's todos
            await fetchTodaysTodos();
        } catch (e) {
            // handle error
        }
    };

    // Edit task handlers
    const startEdit = (todo: any) => {
        setEditingId(todo.id);
        setEditingValue(todo.title);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingValue("");
    };

    const saveEdit = async (todo: any) => {
        if (!userData?.id || !editingValue.trim()) return;
        try {
            await updateTask(userData.id, todo.id, { title: editingValue });
            // Refresh todos for the month
            const daysInMonth = new Date(
                selectedYear,
                selectedMonth + 1,
                0
            ).getDate();
            let allTodos: any[] = [];
            for (let day = 1; day <= daysInMonth; day++) {
                const dStr = `${selectedYear}-${(selectedMonth + 1)
                    .toString()
                    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
                const dayTodos = await getTasks(userData.id, dStr);
                allTodos = allTodos.concat(
                    dayTodos.map((t: any) => ({ ...t, dueDate: dStr }))
                );
            }
            setTodos(allTodos);
            setEditingId(null);
            setEditingValue("");
            // Also refresh today's todos
            await fetchTodaysTodos();
        } catch (e) {
            // handle error
        }
    };

    // Delete task handler
    const handleDelete = async (todo: any) => {
        if (!userData?.id) return;
        try {
            await deleteTask(userData.id, todo.id);
            // Refresh todos for the month
            const daysInMonth = new Date(
                selectedYear,
                selectedMonth + 1,
                0
            ).getDate();
            let allTodos: any[] = [];
            for (let day = 1; day <= daysInMonth; day++) {
                const dStr = `${selectedYear}-${(selectedMonth + 1)
                    .toString()
                    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
                const dayTodos = await getTasks(userData.id, dStr);
                allTodos = allTodos.concat(
                    dayTodos.map((t: any) => ({ ...t, dueDate: dStr }))
                );
            }
            setTodos(allTodos);
            // Also refresh today's todos
            await fetchTodaysTodos();
        } catch (e) {
            // handle error
        }
    };

    const getDaysInMonth = () => {
        const firstDay = new Date(selectedYear, selectedMonth, 1);
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        const days = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }
        return days;
    };

    const getVideosForDay = (
        day: number,
        month = selectedMonth,
        year = selectedYear
    ) => {
        const dateStr = `${year}-${(month + 1)
            .toString()
            .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
        return scheduledVideos.filter((video) => video.date === dateStr);
    };

    const getTodosForDay = (
        day: number,
        month = selectedMonth,
        year = selectedYear
    ) => {
        const dateStr = `${year}-${(month + 1)
            .toString()
            .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
        return todos.filter((todo) => todo.dueDate === dateStr);
    };

    const getSelectedDateVideos = () => {
        const dateStr = `${selectedYear}-${(selectedMonth + 1)
            .toString()
            .padStart(2, "0")}-${selectedDate.toString().padStart(2, "0")}`;
        return scheduledVideos.filter((video) => video.date === dateStr);
    };

    const toggleVideoCompletion = async (videoId: string) => {
        if (!userData?.id) return;
        // Find the video in scheduledVideos
        const video = scheduledVideos.find((v) => v.id === videoId);
        if (!video) return;
        try {
            await updateVideo(userData.id, videoId, {
                completed: !video.completed,
            });
            // Refresh scheduledVideos for the current month
            const subjects = await getSubjects(userData.id);
            let allVideos: ScheduledVideo[] = [];
            for (const subject of subjects) {
                const videos = await getVideos(userData.id, subject.id);
                const filtered = videos.filter((v: any) => {
                    const dateStr = v.scheduledDate || v.date;
                    if (!dateStr) return false;
                    const d = new Date(dateStr);
                    return (
                        d.getFullYear() === selectedYear &&
                        d.getMonth() === selectedMonth
                    );
                });
                allVideos = allVideos.concat(
                    filtered.map((v: any) => ({
                        ...v,
                        subject: subject.name,
                        date: v.scheduledDate || v.date,
                    }))
                );
            }
            setScheduledVideos(allVideos);
            // Also refresh today's videos
            await fetchTodaysVideos();
        } catch (e) {
            // handle error
        }
    };

    return (
        <div className="p-6">
            {/* Modal for per-date tasks/videos */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-lg w-full">
                    <DialogHeader>
                        <DialogTitle>
                            {modalDate
                                ? (() => {
                                      const d = new Date(
                                          modalDate.year,
                                          modalDate.month,
                                          modalDate.day
                                      );
                                      return d.toLocaleDateString("en-US", {
                                          weekday: "long",
                                          month: "long",
                                          day: "numeric",
                                          year: "numeric",
                                      });
                                  })()
                                : "Tasks & Videos"}
                        </DialogTitle>
                        <DialogDescription>
                            View and manage tasks and scheduled videos for this
                            date.
                        </DialogDescription>
                    </DialogHeader>
                    {modalDate && (
                        <>
                            {/* Add Task Input for modal date */}
                            <ModalAddTaskSection
                                modalDate={modalDate}
                                onTaskAdded={async () => {
                                    // Refresh todos for the month after adding a task
                                    if (!userData?.id) return;
                                    const daysInMonth = new Date(
                                        modalDate.year,
                                        modalDate.month + 1,
                                        0
                                    ).getDate();
                                    let allTodos: any[] = [];
                                    for (
                                        let day = 1;
                                        day <= daysInMonth;
                                        day++
                                    ) {
                                        const dStr = `${modalDate.year}-${(
                                            modalDate.month + 1
                                        )
                                            .toString()
                                            .padStart(2, "0")}-${day
                                            .toString()
                                            .padStart(2, "0")}`;
                                        const dayTodos = await getTasks(
                                            userData.id,
                                            dStr
                                        );
                                        allTodos = allTodos.concat(
                                            dayTodos.map((t: any) => ({
                                                ...t,
                                                dueDate: dStr,
                                            }))
                                        );
                                    }
                                    setTodos(allTodos);
                                }}
                            />
                            {/* Tasks for modal date */}
                            <div className="mt-4">
                                <div className="font-semibold mb-2">Tasks</div>
                                <div className="space-y-2">
                                    {getTodosForDay(
                                        modalDate.day,
                                        modalDate.month,
                                        modalDate.year
                                    ).length === 0 ? (
                                        <div className="text-muted-foreground text-sm">
                                            No tasks for this day.
                                        </div>
                                    ) : (
                                        getTodosForDay(
                                            modalDate.day,
                                            modalDate.month,
                                            modalDate.year
                                        ).map((todo) => (
                                            <div
                                                key={todo.id}
                                                className="p-2 border rounded flex items-center justify-between"
                                            >
                                                <div className="flex items-center space-x-2 flex-1">
                                                    <Checkbox
                                                        checked={todo.completed}
                                                        onCheckedChange={() =>
                                                            toggleTodo(
                                                                todo.id,
                                                                todo.completed
                                                            )
                                                        }
                                                    />
                                                    {editingId === todo.id ? (
                                                        <>
                                                            <input
                                                                className="text-sm border rounded px-1 py-0.5"
                                                                value={
                                                                    editingValue
                                                                }
                                                                onChange={(e) =>
                                                                    setEditingValue(
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                                onKeyDown={(
                                                                    e
                                                                ) => {
                                                                    if (
                                                                        e.key ===
                                                                        "Enter"
                                                                    )
                                                                        saveEdit(
                                                                            todo
                                                                        );
                                                                    if (
                                                                        e.key ===
                                                                        "Escape"
                                                                    )
                                                                        cancelEdit();
                                                                }}
                                                                autoFocus
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    saveEdit(
                                                                        todo
                                                                    )
                                                                }
                                                                aria-label="Save"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={
                                                                    cancelEdit
                                                                }
                                                                aria-label="Cancel"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span
                                                                className={`text-sm ${
                                                                    todo.completed
                                                                        ? "line-through text-muted-foreground"
                                                                        : ""
                                                                }`}
                                                            >
                                                                {todo.title}
                                                            </span>
                                                            <span
                                                                className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                                                                    todo.completed
                                                                        ? "bg-green-100 text-green-700"
                                                                        : "bg-yellow-100 text-yellow-700"
                                                                }`}
                                                            >
                                                                {todo.completed
                                                                    ? "Completed"
                                                                    : "Pending"}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center space-x-1 ml-2">
                                                    {editingId !== todo.id && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    startEdit(
                                                                        todo
                                                                    )
                                                                }
                                                                aria-label="Edit"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        todo
                                                                    )
                                                                }
                                                                aria-label="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            {/* Scheduled Videos for modal date */}
                            <div className="mt-6">
                                <div className="font-semibold mb-2">
                                    Scheduled Videos
                                </div>
                                {getVideosForDay(
                                    modalDate.day,
                                    modalDate.month,
                                    modalDate.year
                                ).length === 0 ? (
                                    <div className="text-muted-foreground text-sm">
                                        No videos scheduled for this day.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {getVideosForDay(
                                            modalDate.day,
                                            modalDate.month,
                                            modalDate.year
                                        ).map((video) => (
                                            <div
                                                key={video.id}
                                                className="flex items-start space-x-3 p-4 rounded-lg border"
                                            >
                                                <Checkbox
                                                    checked={video.completed}
                                                    onCheckedChange={() =>
                                                        toggleVideoCompletion(
                                                            video.id
                                                        )
                                                    }
                                                    className="mt-1"
                                                />
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <h4
                                                            className={`font-medium ${
                                                                video.completed
                                                                    ? "line-through text-muted-foreground"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {video.title}
                                                        </h4>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <a
                                                                href={video.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                        <Badge variant="secondary">
                                                            {video.subject}
                                                        </Badge>
                                                        <div className="flex items-center space-x-1">
                                                            <Clock className="w-3 h-3" />
                                                            <span>
                                                                {(() => {
                                                                    const timeStr =
                                                                        video.scheduledTime ||
                                                                        "";
                                                                    const [
                                                                        h,
                                                                        m,
                                                                    ] =
                                                                        timeStr.split(
                                                                            ":"
                                                                        );
                                                                    if (
                                                                        !h ||
                                                                        !m
                                                                    )
                                                                        return timeStr;
                                                                    let hour =
                                                                        parseInt(
                                                                            h,
                                                                            10
                                                                        );
                                                                    const minute =
                                                                        m.padStart(
                                                                            2,
                                                                            "0"
                                                                        );
                                                                    const ampm =
                                                                        hour >=
                                                                        12
                                                                            ? "PM"
                                                                            : "AM";
                                                                    hour =
                                                                        hour %
                                                                        12;
                                                                    if (
                                                                        hour ===
                                                                        0
                                                                    )
                                                                        hour = 12;
                                                                    return `${hour}:${minute} ${ampm}`;
                                                                })()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    <DialogClose asChild>
                        <Button className="hover:bg-accent hover:text-accent-foreground">
                            Close
                        </Button>
                    </DialogClose>
                </DialogContent>
            </Dialog>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Study Calendar
                    </h1>
                    <p className="text-muted-foreground">
                        Plan your study schedule and track daily progress
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Sidebar - Tasks Only */}
                <div className="space-y-6">
                    {/* Progress Tracking */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Subject Progress
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loadingSubjects ? (
                                <div className="text-sm text-muted-foreground">
                                    Loading...
                                </div>
                            ) : subjects.length === 0 ? (
                                <div className="text-sm text-muted-foreground">
                                    No subjects found.
                                </div>
                            ) : (
                                subjects.map((subject) => (
                                    <div key={subject.id} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>{subject.name}</span>
                                            <span>
                                                {subjectProgress[subject.id] ??
                                                    0}
                                                %
                                            </span>
                                        </div>
                                        <Progress
                                            value={
                                                subjectProgress[subject.id] ?? 0
                                            }
                                            className="h-2"
                                        />
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Motivational Quote */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center">
                                <Quote className="w-4 h-4 mr-2" />
                                Daily Motivation
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DailyQuote />
                        </CardContent>
                    </Card>

                    {/* Pomodoro Timer */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Pomodoro Timer
                            </CardTitle>
                            <CardDescription>
                                {isBreak
                                    ? `Break Time${
                                          breakDuration > 0
                                              ? ` (${Math.floor(
                                                    breakDuration / 60
                                                )}m ${breakDuration % 60}s)`
                                              : ""
                                      }`
                                    : "Focus Time"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col items-center w-full">
                                <div className="flex justify-center gap-2 mb-2 w-full">
                                    <Badge variant="secondary">
                                        Study:{" "}
                                        {Math.floor(todayTimes.study / 3600)}h{" "}
                                        {Math.floor(
                                            (todayTimes.study % 3600) / 60
                                        )}
                                        m {todayTimes.study % 60}s
                                    </Badge>
                                    <Badge variant="destructive">
                                        Break:{" "}
                                        {Math.floor(todayTimes.break / 3600)}h{" "}
                                        {Math.floor(
                                            (todayTimes.break % 3600) / 60
                                        )}
                                        m {todayTimes.break % 60}s
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-center space-x-2 w-full">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            handlePomodoroMinutesChange(-5)
                                        }
                                    >
                                        -5
                                    </Button>
                                    <span className="font-mono">
                                        {pomodoroMinutes} min
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            handlePomodoroMinutesChange(5)
                                        }
                                    >
                                        +5
                                    </Button>
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-mono font-bold">
                                    {formatTime(currentTime)}
                                </div>
                            </div>
                            <div className="w-full grid grid-cols-2 gap-2 xl:flex xl:flex-row xl:gap-2 xl:justify-center">
                                {/* Pause/Play */}
                                {isBreak ? (
                                    <Button
                                        className="hover:bg-accent hover:text-accent-foreground w-full xl:w-auto"
                                        onClick={resumeFromBreak}
                                        variant="default"
                                    >
                                        <Play className="w-4 h-4" /> Resume
                                    </Button>
                                ) : (
                                    <Button
                                        className="hover:bg-accent hover:text-accent-foreground w-full xl:w-auto"
                                        onClick={() => setIsRunning(!isRunning)}
                                        variant={
                                            isRunning ? "secondary" : "default"
                                        }
                                    >
                                        {isRunning ? (
                                            <Pause className="w-4 h-4" />
                                        ) : (
                                            <Play className="w-4 h-4" />
                                        )}
                                    </Button>
                                )}
                                {/* Reset */}
                                <Button
                                    onClick={resetTimer}
                                    variant="outline"
                                    className="w-full xl:w-auto"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                                {/* Finish */}
                                <Button
                                    onClick={finishPomodoro}
                                    variant="default"
                                    className="w-full xl:w-auto hover:bg-accent hover:text-accent-foreground "
                                >
                                    <Check className="w-4 h-4" /> Finish
                                </Button>
                                {/* Break */}
                                {!isBreak && (
                                    <Button
                                        onClick={startBreak}
                                        variant="destructive"
                                        className="w-full xl:w-auto"
                                    >
                                        <Pause className="w-4 h-4" /> Break
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* To-Do List (Today's Tasks) */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Tasks for Today
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex space-x-2">
                                <Input
                                    placeholder="Add new task..."
                                    value={newTodo}
                                    onChange={(e) => setNewTodo(e.target.value)}
                                    onKeyPress={(e) =>
                                        e.key === "Enter" && addTodo()
                                    }
                                />
                                <Button
                                    className="hover:bg-accent hover:text-accent-foreground"
                                    onClick={addTodo}
                                    size="sm"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {todaysTodos.length === 0 ? (
                                    <div className="text-muted-foreground text-sm">
                                        No tasks for today.
                                    </div>
                                ) : (
                                    todaysTodos.map((todo) => (
                                        <div
                                            key={todo.id}
                                            className="p-2 border rounded flex items-center justify-between"
                                        >
                                            <div className="flex items-center space-x-2 flex-1">
                                                <Checkbox
                                                    checked={todo.completed}
                                                    onCheckedChange={() =>
                                                        toggleTodo(
                                                            todo.id,
                                                            todo.completed
                                                        )
                                                    }
                                                />
                                                {editingId === todo.id ? (
                                                    <>
                                                        <input
                                                            className="text-sm border rounded px-1 py-0.5"
                                                            value={editingValue}
                                                            onChange={(e) =>
                                                                setEditingValue(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            onKeyDown={(e) => {
                                                                if (
                                                                    e.key ===
                                                                    "Enter"
                                                                )
                                                                    saveEdit(
                                                                        todo
                                                                    );
                                                                if (
                                                                    e.key ===
                                                                    "Escape"
                                                                )
                                                                    cancelEdit();
                                                            }}
                                                            autoFocus
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() =>
                                                                saveEdit(todo)
                                                            }
                                                            aria-label="Save"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={cancelEdit}
                                                            aria-label="Cancel"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span
                                                            className={`text-sm ${
                                                                todo.completed
                                                                    ? "line-through text-muted-foreground"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {todo.title}
                                                        </span>
                                                        <span
                                                            className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                                                                todo.completed
                                                                    ? "bg-green-100 text-green-700"
                                                                    : "bg-yellow-100 text-yellow-700"
                                                            }`}
                                                        >
                                                            {todo.completed
                                                                ? "Completed"
                                                                : "Pending"}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-1 ml-2">
                                                {editingId !== todo.id && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() =>
                                                                startEdit(todo)
                                                            }
                                                            aria-label="Edit"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    todo
                                                                )
                                                            }
                                                            aria-label="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Calendar Area */}
                <div className="lg:col-span-3 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center justify-between">
                                <span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            if (selectedMonth === 0) {
                                                setSelectedMonth(11);
                                                setSelectedYear(
                                                    selectedYear - 1
                                                );
                                            } else {
                                                setSelectedMonth(
                                                    selectedMonth - 1
                                                );
                                            }
                                        }}
                                    >
                                        &lt;
                                    </Button>
                                    {new Date(
                                        selectedYear,
                                        selectedMonth
                                    ).toLocaleDateString("en-US", {
                                        month: "long",
                                        year: "numeric",
                                    })}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            if (selectedMonth === 11) {
                                                setSelectedMonth(0);
                                                setSelectedYear(
                                                    selectedYear + 1
                                                );
                                            } else {
                                                setSelectedMonth(
                                                    selectedMonth + 1
                                                );
                                            }
                                        }}
                                    >
                                        &gt;
                                    </Button>
                                </span>
                                <Badge variant="secondary">
                                    Selected: {selectedDate}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-7 gap-2 mb-4">
                                {[
                                    "Sun",
                                    "Mon",
                                    "Tue",
                                    "Wed",
                                    "Thu",
                                    "Fri",
                                    "Sat",
                                ].map((day) => (
                                    <div
                                        key={day}
                                        className="text-center font-medium text-sm text-muted-foreground p-2"
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {getDaysInMonth().map((day, index) => {
                                    const videosForDay = day
                                        ? getVideosForDay(day)
                                        : [];
                                    const todosForDay = day
                                        ? getTodosForDay(day)
                                        : [];
                                    const isToday =
                                        day === new Date().getDate() &&
                                        selectedMonth ===
                                            new Date().getMonth() &&
                                        selectedYear ===
                                            new Date().getFullYear();
                                    const isSelected = day === selectedDate;
                                    const pendingVideos = videosForDay.filter(
                                        (v) => !v.completed
                                    ).length;
                                    return (
                                        <div
                                            key={index}
                                            className={`min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors ${
                                                isSelected
                                                    ? "bg-primary/20 border-primary"
                                                    : isToday
                                                    ? "bg-secondary border-secondary-foreground"
                                                    : "border-border hover:bg-muted/50"
                                            }`}
                                            onClick={() => {
                                                if (!day) return;
                                                const today = new Date();
                                                const isToday =
                                                    day === today.getDate() &&
                                                    selectedMonth ===
                                                        today.getMonth() &&
                                                    selectedYear ===
                                                        today.getFullYear();
                                                if (isToday) {
                                                    setSelectedDate(day);
                                                } else {
                                                    setModalDate({
                                                        day,
                                                        month: selectedMonth,
                                                        year: selectedYear,
                                                    });
                                                    setModalOpen(true);
                                                }
                                            }}
                                        >
                                            {day && (
                                                <>
                                                    <div className="font-medium text-sm mb-1">
                                                        {day}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {videosForDay.length >
                                                            0 && (
                                                            <Badge
                                                                variant="destructive"
                                                                className="text-xs"
                                                            >
                                                                {pendingVideos}{" "}
                                                                pending video
                                                                {videosForDay.length !==
                                                                1
                                                                    ? "s"
                                                                    : ""}
                                                            </Badge>
                                                        )}
                                                        {todosForDay.length >
                                                            0 && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                {
                                                                    todosForDay.filter(
                                                                        (t) =>
                                                                            !t.completed
                                                                    ).length
                                                                }{" "}
                                                                task
                                                                {todosForDay.filter(
                                                                    (t) =>
                                                                        !t.completed
                                                                ).length !== 1
                                                                    ? "s"
                                                                    : ""}{" "}
                                                                pending
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Scheduled Videos for Today */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <CalendarIcon className="w-5 h-5" />
                                <span>
                                    {`Scheduled Videos - Today (${new Date().toLocaleDateString(
                                        "en-US",
                                        {
                                            weekday: "long",
                                            month: "long",
                                            day: "numeric",
                                        }
                                    )})`}
                                </span>
                            </CardTitle>
                            <CardDescription>
                                {todaysVideos.length} video
                                {todaysVideos.length !== 1 ? "s" : ""} scheduled
                                for today
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {todaysVideos.length > 0 ? (
                                <div className="space-y-4">
                                    {todaysVideos.map((video) => (
                                        <div
                                            key={video.id}
                                            className="flex items-start space-x-3 p-4 rounded-lg border"
                                        >
                                            <Checkbox
                                                checked={video.completed}
                                                onCheckedChange={() =>
                                                    toggleVideoCompletion(
                                                        video.id
                                                    )
                                                }
                                                className="mt-1"
                                            />
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <h4
                                                        className={`font-medium ${
                                                            video.completed
                                                                ? "line-through text-muted-foreground"
                                                                : ""
                                                        }`}
                                                    >
                                                        {video.title}
                                                    </h4>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <a
                                                            href={video.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    </Button>
                                                </div>
                                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                    <Badge variant="secondary">
                                                        {video.subject}
                                                    </Badge>
                                                    <div className="flex items-center space-x-1">
                                                        <Clock className="w-3 h-3" />
                                                        <span>
                                                            {(() => {
                                                                const timeStr =
                                                                    video.scheduledTime ||
                                                                    "";
                                                                const [h, m] =
                                                                    timeStr.split(
                                                                        ":"
                                                                    );
                                                                if (!h || !m)
                                                                    return timeStr;
                                                                let hour =
                                                                    parseInt(
                                                                        h,
                                                                        10
                                                                    );
                                                                const minute =
                                                                    m.padStart(
                                                                        2,
                                                                        "0"
                                                                    );
                                                                const ampm =
                                                                    hour >= 12
                                                                        ? "PM"
                                                                        : "AM";
                                                                hour =
                                                                    hour % 12;
                                                                if (hour === 0)
                                                                    hour = 12;
                                                                return `${hour}:${minute} ${ampm}`;
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No videos scheduled for today</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

const ModalAddTaskSection = ({
    modalDate,
    onTaskAdded,
}: {
    modalDate: { day: number; month: number; year: number };
    onTaskAdded?: () => void;
}) => {
    const [modalTodo, setModalTodo] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const { userData } = useAuth();

    const handleAdd = async () => {
        if (!userData?.id || !modalTodo.trim() || loading) return;
        setLoading(true);
        const dateStr = `${modalDate.year}-${(modalDate.month + 1)
            .toString()
            .padStart(2, "0")}-${modalDate.day.toString().padStart(2, "0")}`;
        try {
            await createTask(userData.id, {
                title: modalTodo,
                dueDate: dateStr,
            });
            setModalTodo("");
            if (onTaskAdded) onTaskAdded();
        } catch (e) {
            // handle error
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="flex space-x-2 mt-2">
            <Input
                placeholder="Add new task..."
                value={modalTodo}
                onChange={(e) => setModalTodo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                disabled={loading}
            />
            <Button
                className="hover:bg-accent hover:text-accent-foreground"
                onClick={handleAdd}
                size="sm"
                disabled={loading}
            >
                {loading ? (
                    <svg
                        className="animate-spin h-4 w-4 mr-1 text-muted-foreground"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        ></path>
                    </svg>
                ) : (
                    <Plus className="w-4 h-4" />
                )}
            </Button>
        </div>
    );
};
