"use client";

import { useState, useEffect, useRef } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    getSubjects,
    getLectures,
    getChapters,
    createLecture,
    createChapter,
    createSubject,
    updateLecture,
    updateChapter,
    deleteLecture,
    deleteChapter,
    deleteSubject,
    subscribeToSubjects,
    subscribeToChapters,
    Subject as FirebaseSubject,
    Lecture as FirebaseLecture,
    Chapter as FirebaseChapter,
} from "@/lib/firebase-utils";
import {
    Plus,
    Folder,
    Calendar,
    ChevronRight,
    ChevronDown,
    Edit2,
    Trash2,
    GripVertical,
    ExternalLink,
    Loader2,
    FileText,
    BookOpen,
} from "lucide-react";

interface Chapter {
    id: string;
    subjectId: string;
    title: string;
    description?: string;
    order: number;
    lectures: Lecture[];
}

interface Lecture {
    id: string;
    title: string;
    url: string;
    completed: boolean;
    scheduledDate?: string;
    subjectId: string;
    chapterId?: string;
}

interface Subject {
    id: string;
    name: string;
    chapters: Chapter[];
    color: string;
}

export default function LectureNotes() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [newSubjectName, setNewSubjectName] = useState("");
    const [newChapterTitle, setNewChapterTitle] = useState("");
    const [newLectureTitle, setNewLectureTitle] = useState("");
    const [newLectureUrl, setNewLectureUrl] = useState("");
    const [newLectureDate, setNewLectureDate] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [selectedChapterId, setSelectedChapterId] = useState("");
    const [expandedChapters, setExpandedChapters] = useState<{
        [key: string]: boolean;
    }>({});
    const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(
        null
    );
    const [deletingChapter, setDeletingChapter] = useState<Chapter | null>(
        null
    );
    const [deletingLecture, setDeletingLecture] = useState<Lecture | null>(
        null
    );
    const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
    const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
    const [editLectureTitle, setEditLectureTitle] = useState("");
    const [editLectureUrl, setEditLectureUrl] = useState("");
    const [editLectureDate, setEditLectureDate] = useState("");
    const [editChapterTitle, setEditChapterTitle] = useState("");
    const [selectedColor, setSelectedColor] = useState("");
    const [customColor, setCustomColor] = useState("");
    const { toast } = useToast();

    // For tracking subject order
    const [subjectOrder, setSubjectOrder] = useState<string[]>([]);

    // Drag and drop refs
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    // Pastel colors for subjects
    const pastelColors = [
        {
            name: "Pastel Green",
            class: "bg-green-100 text-green-800",
            hex: "#dcfce7",
        },
        {
            name: "Pastel Blue",
            class: "bg-blue-100 text-blue-800",
            hex: "#dbeafe",
        },
        {
            name: "Pastel Purple",
            class: "bg-purple-100 text-purple-800",
            hex: "#f3e8ff",
        },
        {
            name: "Pastel Orange",
            class: "bg-orange-100 text-orange-800",
            hex: "#ffedd5",
        },
        {
            name: "Pastel Pink",
            class: "bg-pink-100 text-pink-800",
            hex: "#fce7f3",
        },
        {
            name: "Pastel Indigo",
            class: "bg-indigo-100 text-indigo-800",
            hex: "#e0e7ff",
        },
        {
            name: "Pastel Yellow",
            class: "bg-yellow-100 text-yellow-800",
            hex: "#fef9c3",
        },
        {
            name: "Pastel Teal",
            class: "bg-teal-100 text-teal-800",
            hex: "#ccfbf1",
        },
    ];

    // Get user ID from local storage
    const getUserId = () => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("userId");
        }
        return null;
    };

    // Update subject order when subjects change
    useEffect(() => {
        if (subjects.length > 0) {
            setSubjectOrder((prevOrder) => {
                const allIds = subjects.map((subject) => subject.id);
                const newOrder = [...prevOrder];
                allIds.forEach((id) => {
                    if (!newOrder.includes(id)) {
                        newOrder.push(id);
                    }
                });
                return newOrder.filter((id) => allIds.includes(id));
            });
        } else {
            setSubjectOrder([]);
        }
    }, [subjects]);

    // Load data from Firebase on component mount
    useEffect(() => {
        const userId = getUserId();
        if (!userId) {
            toast({
                title: "Not logged in",
                description: "Please log in to view your lecture notes",
                variant: "destructive",
            });
            setLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                const firebaseSubjects = await getSubjects(userId);
                const firebaseChapters = await getChapters(userId);
                const firebaseLectures = await getLectures(userId);
                processFirebaseData(
                    firebaseSubjects,
                    firebaseChapters,
                    firebaseLectures
                );
            } catch (error) {
                console.error("Error loading data:", error);
                toast({
                    title: "Error loading data",
                    description:
                        "There was a problem loading your lecture notes",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Set up real-time listeners
        const unsubscribeSubjects = subscribeToSubjects(
            userId,
            (firebaseSubjects) => {
                Promise.all([getChapters(userId), getLectures(userId)]).then(
                    ([firebaseChapters, firebaseLectures]) => {
                        if (!loading) {
                            processFirebaseData(
                                firebaseSubjects,
                                firebaseChapters,
                                firebaseLectures
                            );
                        }
                    }
                );
            }
        );

        const unsubscribeChaptersPromise = subscribeToChapters(
            userId,
            (firebaseChapters) => {
                Promise.all([getSubjects(userId), getLectures(userId)]).then(
                    ([firebaseSubjects, firebaseLectures]) => {
                        if (!loading) {
                            processFirebaseData(
                                firebaseSubjects,
                                firebaseChapters,
                                firebaseLectures
                            );
                        }
                    }
                );
            }
        );

        return () => {
            unsubscribeSubjects();
            unsubscribeChaptersPromise.then((unsubscribe) => unsubscribe());
        };
    }, [toast, loading]);

    // Function to manually refresh data from Firebase
    const refreshData = async () => {
        const userId = getUserId();
        if (!userId) return;
        try {
            setLoading(true);
            const firebaseSubjects = await getSubjects(userId);
            const firebaseChapters = await getChapters(userId);
            const firebaseLectures = await getLectures(userId);
            processFirebaseData(
                firebaseSubjects,
                firebaseChapters,
                firebaseLectures
            );
        } catch (error) {
            console.error("Error refreshing data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Function to generate badge styles from color
    const getBadgeStyles = (color: string) => {
        if (color.startsWith("bg-") && color.includes("text-")) {
            return color;
        }
        if (
            color.startsWith("#") ||
            color.includes("rgb") ||
            color.match(/^[a-zA-Z]+$/)
        ) {
            return `bg-opacity-20 text-foreground`;
        }
        return pastelColors[0].class;
    };

    // Process Firebase data into local state format
    const processFirebaseData = (
        firebaseSubjects: FirebaseSubject[],
        firebaseChapters: FirebaseChapter[],
        firebaseLectures: FirebaseLecture[] = []
    ) => {
        const subjectsMap = new Map<string, Subject>();
        const chaptersMap = new Map<string, Chapter>();

        // Initialize subjects with colors
        firebaseSubjects.forEach((fbSubject, index) => {
            const colorClass =
                fbSubject.color ||
                pastelColors[index % pastelColors.length].class;
            subjectsMap.set(fbSubject.id, {
                id: fbSubject.id,
                name: fbSubject.name,
                chapters: [],
                color: colorClass,
            });
        });

        // Initialize chapters
        firebaseChapters.forEach((fbChapter) => {
            chaptersMap.set(fbChapter.id, {
                id: fbChapter.id,
                subjectId: fbChapter.subjectId,
                title: fbChapter.title,
                description: fbChapter.description,
                order: fbChapter.order,
                lectures: [],
            });
        });

        // Add lectures to their chapters
        firebaseLectures.forEach((fbLecture) => {
            if (fbLecture.chapterId) {
                const chapter = chaptersMap.get(fbLecture.chapterId);
                if (chapter) {
                    chapter.lectures.push({
                        id: fbLecture.id,
                        title: fbLecture.title,
                        url: fbLecture.url,
                        completed: fbLecture.completed,
                        scheduledDate: fbLecture.scheduledDate,
                        subjectId: fbLecture.subjectId,
                        chapterId: fbLecture.chapterId,
                    });
                }
            }
        });

        // Add chapters to their subjects
        chaptersMap.forEach((chapter) => {
            const subject = subjectsMap.get(chapter.subjectId);
            if (subject) {
                subject.chapters.push(chapter);
            }
        });

        // Sort chapters by order within each subject
        subjectsMap.forEach((subject) => {
            subject.chapters.sort((a, b) => a.order - b.order);
        });

        setSubjects(Array.from(subjectsMap.values()));
        setChapters(Array.from(chaptersMap.values()));
    };

    const addSubject = async () => {
        if (newSubjectName.trim()) {
            const userId = getUserId();
            if (!userId) return;
            try {
                setLoading(true);
                const colorToUse =
                    customColor || selectedColor || pastelColors[0].class;
                await createSubject(userId, {
                    name: newSubjectName,
                    color: colorToUse,
                });
                setNewSubjectName("");
                setSelectedColor("");
                setCustomColor("");
                toast({
                    title: "Subject added",
                    description: `${newSubjectName} has been added to your subjects`,
                });
                setTimeout(refreshData, 2000);
            } catch (error) {
                console.error("Error adding subject:", error);
                toast({
                    title: "Error adding subject",
                    description: "There was a problem adding your subject",
                    variant: "destructive",
                });
                setLoading(false);
            }
        }
    };

    const addChapter = async () => {
        if (newChapterTitle.trim() && selectedSubjectId) {
            const userId = getUserId();
            if (!userId) return;
            try {
                setLoading(true);
                const existingChapters = await getChapters(
                    userId,
                    selectedSubjectId
                );
                const nextOrder = existingChapters.length + 1;
                await createChapter(userId, {
                    subjectId: selectedSubjectId,
                    title: newChapterTitle,
                    order: nextOrder,
                });
                setNewChapterTitle("");
                setSelectedSubjectId("");
                toast({
                    title: "Chapter added",
                    description: `"${newChapterTitle}" has been added`,
                });
                setTimeout(refreshData, 2000);
            } catch (error) {
                console.error("Error creating chapter:", error);
                toast({
                    title: "Error creating chapter",
                    description: "There was a problem creating the chapter",
                    variant: "destructive",
                });
                setLoading(false);
            }
        }
    };

    const addLecture = async () => {
        if (
            newLectureTitle.trim() &&
            newLectureUrl.trim() &&
            selectedSubjectId &&
            selectedChapterId
        ) {
            const userId = getUserId();
            if (!userId) return;
            try {
                setLoading(true);
                await createLecture(userId, {
                    subjectId: selectedSubjectId,
                    chapterId: selectedChapterId,
                    title: newLectureTitle,
                    url: newLectureUrl,
                    scheduledDate: newLectureDate || undefined,
                });
                setNewLectureTitle("");
                setNewLectureUrl("");
                setNewLectureDate("");
                setSelectedSubjectId("");
                setSelectedChapterId("");
                toast({
                    title: "Lecture added",
                    description: `"${newLectureTitle}" has been added`,
                });
                setTimeout(refreshData, 2000);
            } catch (error) {
                console.error("Error creating lecture:", error);
                toast({
                    title: "Error creating lecture",
                    description: "There was a problem creating the lecture",
                    variant: "destructive",
                });
                setLoading(false);
            }
        }
    };

    const getCompletionStats = (subject: Subject) => {
        let completed = 0;
        let total = 0;
        subject.chapters.forEach((chapter) => {
            chapter.lectures.forEach((lecture) => {
                total++;
                if (lecture.completed) completed++;
            });
        });
        return {
            completed,
            total,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
    };

    const toggleChapterExpansion = (subjectId: string, chapterId: string) => {
        const key = `${subjectId}-${chapterId}`;
        setExpandedChapters((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const isChapterExpanded = (subjectId: string, chapterId: string) => {
        const key = `${subjectId}-${chapterId}`;
        return expandedChapters[key] || false;
    };

    const deleteSubjectItem = async () => {
        if (!deletingSubjectId) return;
        const userId = getUserId();
        if (!userId) return;
        try {
            setLoading(true);
            await deleteSubject(userId, deletingSubjectId);
            setDeletingSubjectId(null);
            toast({
                title: "Subject deleted",
                description:
                    "The subject and all its chapters have been deleted",
            });
            setTimeout(refreshData, 2000);
        } catch (error) {
            console.error("Error deleting subject:", error);
            toast({
                title: "Error deleting subject",
                description: "There was a problem deleting the subject",
                variant: "destructive",
            });
            setLoading(false);
        }
    };

    const deleteChapterItem = async () => {
        if (!deletingChapter) return;
        const userId = getUserId();
        if (!userId) return;
        try {
            setLoading(true);
            await deleteChapter(userId, deletingChapter.id);
            setDeletingChapter(null);
            toast({
                title: "Chapter deleted",
                description: `"${deletingChapter.title}" has been deleted`,
            });
            setTimeout(refreshData, 2000);
        } catch (error) {
            console.error("Error deleting chapter:", error);
            toast({
                title: "Error deleting chapter",
                description: "There was a problem deleting the chapter",
                variant: "destructive",
            });
            setLoading(false);
        }
    };

    // Handle drag start
    const handleDragStart = (position: number) => {
        dragItem.current = position;
    };

    // Handle drag over
    const handleDragOver = (position: number) => {
        dragOverItem.current = position;
        const cards = document.querySelectorAll(".draggable-card");
        cards.forEach((card) => card.classList.remove("drag-over"));
        if (
            dragOverItem.current !== null &&
            dragOverItem.current !== dragItem.current
        ) {
            cards[dragOverItem.current]?.classList.add("drag-over");
        }
    };

    // Handle drag end
    const handleDragEnd = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        const cards = document.querySelectorAll(".draggable-card");
        cards.forEach((card) => card.classList.remove("drag-over"));
        const newOrder = [...subjectOrder];
        const draggedItemContent = newOrder[dragItem.current];
        newOrder.splice(dragItem.current, 1);
        newOrder.splice(dragOverItem.current, 0, draggedItemContent);
        setSubjectOrder(newOrder);
        dragItem.current = null;
        dragOverItem.current = null;
    };

    if (loading) {
        return (
            <div className="p-6 flex flex-col items-center justify-center h-[80vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-lg">Loading your lecture notes...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                        Lecture Notes 📚
                    </h1>
                    <p className="text-muted-foreground">
                        Organize your lecture notes by subject and chapter
                    </p>
                </div>
                <div className="flex space-x-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90">
                                <Plus className="w-4 h-4 mr-2" />
                                <span>Add Subject</span>
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Subject</DialogTitle>
                                <DialogDescription>
                                    Create a new subject folder to organize your
                                    lecture notes.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="subject-name">
                                        Subject Name
                                    </Label>
                                    <Input
                                        id="subject-name"
                                        value={newSubjectName}
                                        onChange={(e) =>
                                            setNewSubjectName(e.target.value)
                                        }
                                        placeholder="e.g., Biology, Chemistry, Physics"
                                    />
                                </div>
                                <div>
                                    <Label className="block mb-2">
                                        Subject Color
                                    </Label>
                                    <div className="grid grid-cols-4 gap-2 mb-3">
                                        {pastelColors.map((color) => (
                                            <div
                                                key={color.name}
                                                className={`h-10 rounded-md cursor-pointer transition-all border-2 ${
                                                    selectedColor ===
                                                    color.class
                                                        ? "border-primary scale-105"
                                                        : "border-transparent hover:scale-105"
                                                }`}
                                                style={{
                                                    backgroundColor: color.hex,
                                                }}
                                                onClick={() => {
                                                    setSelectedColor(
                                                        color.class
                                                    );
                                                    setCustomColor("");
                                                }}
                                                title={color.name}
                                            ></div>
                                        ))}
                                    </div>
                                    <div>
                                        <Label htmlFor="custom-color">
                                            Custom Color (optional)
                                        </Label>
                                        <div className="flex space-x-2">
                                            <Input
                                                id="custom-color"
                                                type="color"
                                                value={customColor || "#ffffff"}
                                                onChange={(e) => {
                                                    setCustomColor(
                                                        e.target.value
                                                    );
                                                    setSelectedColor("");
                                                }}
                                                className="w-12 h-10 p-1"
                                            />
                                            <Input
                                                type="text"
                                                value={customColor}
                                                onChange={(e) => {
                                                    setCustomColor(
                                                        e.target.value
                                                    );
                                                    setSelectedColor("");
                                                }}
                                                placeholder="#hex or color name"
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={addSubject}>
                                    {loading && (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    )}
                                    Add Subject
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {subjects.length === 0 ? (
                <div className="text-center p-10 border rounded-lg bg-muted/10">
                    <Folder className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">
                        No subjects yet
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Add your first subject to start organizing your study
                        materials
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 custom-lg:grid-cols-3">
                    {subjectOrder.map((subjectId, index) => {
                        const subject = subjects.find(
                            (s) => s.id === subjectId
                        );
                        if (!subject) return null;

                        const stats = getCompletionStats(subject);

                        return (
                            <Card
                                key={subject.id}
                                className="h-fit draggable-card"
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    handleDragOver(index);
                                }}
                                onDragEnd={handleDragEnd}
                            >
                                <CardHeader>
                                    <div className="card-header-wrapper flex flex-col space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <GripVertical className="w-5 h-5 text-muted-foreground drag-handle" />
                                                <Folder className="w-5 h-5 text-muted-foreground" />
                                                <CardTitle className="text-base md:text-lg truncate max-w-[150px] sm:max-w-[200px]">
                                                    {subject.name}
                                                </CardTitle>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setDeletingSubjectId(
                                                        subject.id
                                                    )
                                                }
                                                className="text-red-500 p-1 h-7 w-7"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div className="badge-wrapper">
                                            <Badge
                                                className={`${getBadgeStyles(
                                                    subject.color
                                                )} hover:bg-accent hover:text-accent-foreground text-xs sm:text-sm whitespace-nowrap`}
                                            >
                                                {stats.percentage}% Complete
                                            </Badge>
                                        </div>
                                    </div>
                                    <CardDescription>
                                        {stats.completed} of {stats.total}{" "}
                                        lecture notes completed
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    <div className="space-y-3">
                                        {subject.chapters.length > 0 ? (
                                            subject.chapters.map((chapter) => (
                                                <div
                                                    key={chapter.id}
                                                    className="border rounded-lg"
                                                >
                                                    <Collapsible
                                                        open={isChapterExpanded(
                                                            subject.id,
                                                            chapter.id
                                                        )}
                                                        onOpenChange={() =>
                                                            toggleChapterExpansion(
                                                                subject.id,
                                                                chapter.id
                                                            )
                                                        }
                                                    >
                                                        <CollapsibleTrigger
                                                            asChild
                                                        >
                                                            <button className="w-full justify-between p-2 md:p-3 h-auto font-medium text-sm md:text-base inline-flex items-center whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground">
                                                                <div className="flex items-center space-x-2 overflow-hidden">
                                                                    <BookOpen className="w-4 h-4 flex-shrink-0" />
                                                                    <span className="truncate">
                                                                        Chapter{" "}
                                                                        {
                                                                            chapter.order
                                                                        }
                                                                        :{" "}
                                                                        {
                                                                            chapter.title
                                                                        }
                                                                    </span>
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-xs flex-shrink-0"
                                                                    >
                                                                        {
                                                                            chapter
                                                                                .lectures
                                                                                .length
                                                                        }
                                                                    </Badge>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <span
                                                                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-6 w-6 p-0 text-red-500 cursor-pointer"
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            setDeletingChapter(
                                                                                chapter
                                                                            );
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </span>
                                                                    {isChapterExpanded(
                                                                        subject.id,
                                                                        chapter.id
                                                                    ) ? (
                                                                        <ChevronDown className="w-4 h-4 flex-shrink-0" />
                                                                    ) : (
                                                                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                                                                    )}
                                                                </div>
                                                            </button>
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent className="px-3 pb-3">
                                                            <div className="space-y-2">
                                                                {chapter.lectures.map(
                                                                    (
                                                                        lecture
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                lecture.id
                                                                            }
                                                                            className="flex items-start space-x-2 p-2 hover:bg-muted/50 rounded-md"
                                                                        >
                                                                            <div className="flex-1 space-y-1 min-w-0">
                                                                                <div className="flex items-center justify-between">
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <button
                                                                                            className={`font-medium text-sm truncate max-w-full text-left hover:text-blue-600 transition-colors block ${
                                                                                                lecture.completed
                                                                                                    ? "line-through text-muted-foreground"
                                                                                                    : ""
                                                                                            }`}
                                                                                            onClick={(
                                                                                                e
                                                                                            ) => {
                                                                                                e.stopPropagation();
                                                                                                window.open(
                                                                                                    lecture.url,
                                                                                                    "_blank"
                                                                                                );
                                                                                            }}
                                                                                        >
                                                                                            {
                                                                                                lecture.title
                                                                                            }
                                                                                        </button>
                                                                                    </div>
                                                                                    <div className="flex flex-wrap items-center gap-1">
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            className="h-6 w-6 p-0 text-red-500"
                                                                                            onClick={() =>
                                                                                                setDeletingLecture(
                                                                                                    lecture
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <Trash2 className="h-3 w-3" />
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            className="h-6 w-6 p-0"
                                                                                            asChild
                                                                                        >
                                                                                            <a
                                                                                                href={
                                                                                                    lecture.url
                                                                                                }
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                            >
                                                                                                <ExternalLink className="h-3 w-3" />
                                                                                            </a>
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                                {lecture.scheduledDate && (
                                                                                    <div className="flex items-center text-xs text-muted-foreground">
                                                                                        <Calendar className="w-3 h-3 mr-1" />
                                                                                        {
                                                                                            lecture.scheduledDate
                                                                                        }
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                )}
                                                                <Dialog>
                                                                    <DialogTrigger
                                                                        asChild
                                                                    >
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="w-full mt-2"
                                                                            onClick={() => {
                                                                                setSelectedSubjectId(
                                                                                    subject.id
                                                                                );
                                                                                setSelectedChapterId(
                                                                                    chapter.id
                                                                                );
                                                                            }}
                                                                        >
                                                                            <Plus className="w-3 h-3 mr-2" />
                                                                            Add
                                                                            Lecture
                                                                            Note
                                                                        </Button>
                                                                    </DialogTrigger>
                                                                    <DialogContent>
                                                                        <DialogHeader>
                                                                            <DialogTitle>
                                                                                Add
                                                                                New
                                                                                Lecture
                                                                                Note
                                                                            </DialogTitle>
                                                                            <DialogDescription>
                                                                                Add
                                                                                a
                                                                                new
                                                                                lecture
                                                                                note
                                                                                to{" "}
                                                                                {
                                                                                    chapter.title
                                                                                }
                                                                            </DialogDescription>
                                                                        </DialogHeader>
                                                                        <div className="space-y-4">
                                                                            <div>
                                                                                <Label htmlFor="lecture-title">
                                                                                    Lecture
                                                                                    Title
                                                                                </Label>
                                                                                <Input
                                                                                    id="lecture-title"
                                                                                    value={
                                                                                        newLectureTitle
                                                                                    }
                                                                                    onChange={(
                                                                                        e
                                                                                    ) =>
                                                                                        setNewLectureTitle(
                                                                                            e
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                    placeholder="Enter title"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <Label htmlFor="lecture-url">
                                                                                    Lecture
                                                                                    URL
                                                                                </Label>
                                                                                <Input
                                                                                    id="lecture-url"
                                                                                    value={
                                                                                        newLectureUrl
                                                                                    }
                                                                                    onChange={(
                                                                                        e
                                                                                    ) =>
                                                                                        setNewLectureUrl(
                                                                                            e
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                    placeholder="https://..."
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <Label htmlFor="lecture-date">
                                                                                    Scheduled
                                                                                    Date
                                                                                </Label>
                                                                                <Input
                                                                                    id="lecture-date"
                                                                                    type="date"
                                                                                    value={
                                                                                        newLectureDate
                                                                                    }
                                                                                    onChange={(
                                                                                        e
                                                                                    ) =>
                                                                                        setNewLectureDate(
                                                                                            e
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <DialogFooter>
                                                                            <Button
                                                                                onClick={
                                                                                    addLecture
                                                                                }
                                                                                disabled={
                                                                                    loading
                                                                                }
                                                                            >
                                                                                {loading && (
                                                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                                )}
                                                                                Add
                                                                                Lecture
                                                                            </Button>
                                                                        </DialogFooter>
                                                                    </DialogContent>
                                                                </Dialog>
                                                            </div>
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic p-2">
                                                No chapters in this subject yet.
                                            </p>
                                        )}
                                    </div>

                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <button
                                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                                                onClick={() =>
                                                    setSelectedSubjectId(
                                                        subject.id
                                                    )
                                                }
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Chapter
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>
                                                    Add New Chapter
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Add a new chapter to{" "}
                                                    {subject.name}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="chapter-title">
                                                        Chapter Title
                                                    </Label>
                                                    <Input
                                                        id="chapter-title"
                                                        value={newChapterTitle}
                                                        onChange={(e) =>
                                                            setNewChapterTitle(
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="e.g., Introduction to Biology"
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button
                                                    onClick={addChapter}
                                                    disabled={loading}
                                                >
                                                    {loading && (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    )}
                                                    Add Chapter
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Delete Subject Confirmation Dialog */}
            <Dialog
                open={!!deletingSubjectId}
                onOpenChange={(open) => !open && setDeletingSubjectId(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Subject</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this subject? This
                            will also delete all chapters and lecture notes in
                            this subject.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeletingSubjectId(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={deleteSubjectItem}
                            disabled={loading}
                        >
                            {loading && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Delete Subject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Chapter Confirmation Dialog */}
            <Dialog
                open={!!deletingChapter}
                onOpenChange={(open) => !open && setDeletingChapter(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Chapter</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "
                            {deletingChapter?.title}"? This will also delete all
                            lecture notes in this chapter.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeletingChapter(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={deleteChapterItem}
                            disabled={loading}
                        >
                            {loading && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Delete Chapter
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Lecture Confirmation Dialog */}
            <Dialog
                open={!!deletingLecture}
                onOpenChange={(open) => !open && setDeletingLecture(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Lecture Note</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "
                            {deletingLecture?.title}"?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeletingLecture(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (!deletingLecture) return;
                                const userId = getUserId();
                                if (!userId) return;
                                try {
                                    setLoading(true);
                                    await deleteLecture(
                                        userId,
                                        deletingLecture.id
                                    );
                                    setDeletingLecture(null);
                                    toast({
                                        title: "Lecture deleted",
                                        description: `"${deletingLecture.title}" has been deleted`,
                                    });
                                    setTimeout(refreshData, 2000);
                                } catch (error) {
                                    console.error(
                                        "Error deleting lecture:",
                                        error
                                    );
                                    toast({
                                        title: "Error deleting lecture",
                                        description:
                                            "There was a problem deleting the lecture",
                                        variant: "destructive",
                                    });
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                        >
                            {loading && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Delete Lecture
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
