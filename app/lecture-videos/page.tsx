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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import "./drag-drop.css";
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
import {
    Folder,
    Plus,
    Calendar,
    Clock,
    ExternalLink,
    ChevronDown,
    ChevronRight,
    Loader2,
    Pencil,
    Trash2,
    GripVertical,
    Upload,
    Download,
    FileText,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
    createSubject,
    createVideo,
    getSubjects,
    getVideos,
    updateVideo,
    deleteVideo,
    deleteSubject,
    subscribeToSubjects,
    subscribeToVideos,
    Subject as FirebaseSubject,
    Video as FirebaseVideo,
} from "@/lib/firebase-utils";

interface Video {
    id: string;
    title: string;
    url?: string;
    completed: boolean;
    scheduledDate?: string;
    scheduledTime?: string;
    subjectId: string;
}

interface Subject {
    id: string;
    name: string;
    videos: Video[];
    color: string;
}

interface GroupedVideos {
    [month: string]: Video[];
}

export default function Study() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [newSubjectName, setNewSubjectName] = useState("");
    const [newVideoTitle, setNewVideoTitle] = useState("");
    const [newVideoUrl, setNewVideoUrl] = useState("");
    const [newVideoDate, setNewVideoDate] = useState("");
    const [newVideoTime, setNewVideoTime] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [expandedMonths, setExpandedMonths] = useState<{
        [key: string]: boolean;
    }>({});
    const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(
        null
    );
    const [deletingVideo, setDeletingVideo] = useState<Video | null>(null);
    const [editingVideo, setEditingVideo] = useState<Video | null>(null);
    const [editVideoTitle, setEditVideoTitle] = useState("");
    const [editVideoUrl, setEditVideoUrl] = useState("");
    const [editVideoDate, setEditVideoDate] = useState("");
    const [editVideoTime, setEditVideoTime] = useState("");

    const [selectedColor, setSelectedColor] = useState("");
    const [customColor, setCustomColor] = useState("");
    const { toast } = useToast();

    // CSV Upload state
    const [csvUploadOpen, setCsvUploadOpen] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [csvPreview, setCsvPreview] = useState<{
        subjects: Array<{
            name: string;
            color: string;
            isNew?: boolean;
            videos: Array<{
                title: string;
                url?: string;
                scheduledDate?: string;
                scheduledTime?: string;
                isNew?: boolean;
            }>;
        }>;
    }>({ subjects: [] });
    const [csvLoading, setCsvLoading] = useState(false);
    const [csvProgress, setCsvProgress] = useState(0);
    const [csvProgressText, setCsvProgressText] = useState("");
    const [csvTotalItems, setCsvTotalItems] = useState(0);
    const [csvProcessedItems, setCsvProcessedItems] = useState(0);

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

    // CSV Upload Functions
    const convertDateFormat = (dateStr: string): string => {
        if (!dateStr || dateStr.trim() === "") return "";

        const trimmed = dateStr.trim();

        // Check if already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return trimmed;
        }

        // Check for MM/DD/YYYY format
        const mmddyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mmddyyyyMatch) {
            const [, month, day, year] = mmddyyyyMatch;
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }

        // Check for MM-DD-YYYY format
        const mmddyyyyDashMatch = trimmed.match(
            /^(\d{1,2})-(\d{1,2})-(\d{4})$/
        );
        if (mmddyyyyDashMatch) {
            const [, month, day, year] = mmddyyyyDashMatch;
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }

        // Check for DD/MM/YYYY format (only if day > 12 to avoid ambiguity)
        const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (ddmmyyyyMatch) {
            const [, first, second, year] = ddmmyyyyMatch;
            if (parseInt(first) > 12) {
                // Definitely DD/MM/YYYY format
                return `${year}-${second.padStart(2, "0")}-${first.padStart(
                    2,
                    "0"
                )}`;
            }
        }

        // Try to parse with JavaScript Date and convert
        try {
            const date = new Date(trimmed);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, "0");
                const day = date.getDate().toString().padStart(2, "0");
                return `${year}-${month}-${day}`;
            }
        } catch (e) {
            console.warn(`Could not parse date: ${trimmed}`);
        }

        // If all parsing fails, return empty string
        console.warn(
            `Unsupported date format: ${trimmed}. Please use YYYY-MM-DD, MM/DD/YYYY, or MM-DD-YYYY format.`
        );
        return "";
    };

    const downloadCsvTemplate = () => {
        const headers = [
            "Subject Name",
            "Subject Color",
            "Video Title",
            "Video URL",
            "Scheduled Date",
            "Scheduled Time",
        ];
        const sampleData = [
            [
                "Biology",
                "#dcfce7",
                "Cell Structure and Function",
                "https://youtube.com/watch?v=example1",
                "01/15/2024",
                "10:00",
            ],
            [
                "Biology",
                "#dcfce7",
                "Photosynthesis Process",
                "https://youtube.com/watch?v=example2",
                "01-16-2024",
                "14:30",
            ],
            [
                "Chemistry",
                "#dbeafe",
                "Atomic Structure",
                "https://youtube.com/watch?v=example3",
                "2024-01-17",
                "09:00",
            ],
            ["Chemistry", "#dbeafe", "Chemical Bonding", "", "", ""],
        ];

        const csvContent = [headers, ...sampleData]
            .map((row) => row.map((field) => `"${field}"`).join(","))
            .join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "subjects_videos_template.csv";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        toast({
            title: "Template downloaded",
            description: "CSV template has been downloaded successfully",
        });
    };

    const handleCsvFileChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (file && file.type === "text/csv") {
            setCsvFile(file);
            parseCsvFile(file);
        } else {
            toast({
                title: "Invalid file type",
                description: "Please select a CSV file",
                variant: "destructive",
            });
        }
    };

    const parseCsvFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split("\n").filter((line) => line.trim());

            if (lines.length < 2) {
                toast({
                    title: "Invalid CSV",
                    description:
                        "CSV file must have at least a header and one data row",
                    variant: "destructive",
                });
                return;
            }

            let dateConversions = 0;
            let invalidDates = 0;

            // Parse CSV (simple parsing - assumes no commas in quoted fields)
            const data = lines
                .slice(1)
                .map((line, index) => {
                    const values = line
                        .split(",")
                        .map((val) => val.replace(/^"|"$/g, "").trim());

                    // Convert date format to YYYY-MM-DD
                    const originalDate = values[4] || "";
                    const scheduledDate = convertDateFormat(originalDate);

                    // Track date conversions
                    if (originalDate && originalDate !== scheduledDate) {
                        if (scheduledDate) {
                            dateConversions++;
                        } else {
                            invalidDates++;
                            console.warn(
                                `Row ${
                                    index + 2
                                }: Invalid date format "${originalDate}"`
                            );
                        }
                    }

                    return {
                        subjectName: values[0] || "",
                        subjectColor: values[1] || "",
                        videoTitle: values[2] || "",
                        videoUrl: values[3] ? values[3] : "", // Keep empty string for URL to distinguish from undefined
                        scheduledDate: scheduledDate, // Now in YYYY-MM-DD format
                        scheduledTime: values[5] ? values[5] : "", // Keep empty string to convert later
                    };
                })
                .filter((row) => row.subjectName && row.videoTitle);

            // Show feedback about date conversions
            if (dateConversions > 0) {
                toast({
                    title: "Date formats converted",
                    description: `${dateConversions} dates were automatically converted to YYYY-MM-DD format`,
                    duration: 4000,
                });
            }

            if (invalidDates > 0) {
                toast({
                    title: "Invalid dates found",
                    description: `${invalidDates} dates could not be parsed. Please check the console for details.`,
                    variant: "destructive",
                    duration: 6000,
                });
            }

            setCsvData(data);
            await generatePreview(data);
        };

        reader.onerror = () => {
            toast({
                title: "Error reading file",
                description: "There was an error reading the CSV file",
                variant: "destructive",
            });
        };

        reader.readAsText(file);
    };

    const generatePreview = async (data: any[]) => {
        const userId = getUserId();
        if (!userId) return;

        try {
            // Get existing subjects and videos to filter out existing ones from preview
            const existingSubjects = await getSubjects(userId);
            const existingVideos = await getVideos(userId);

            // Create maps for quick lookup
            const subjectNameToId = new Map();
            existingSubjects.forEach((subject) => {
                subjectNameToId.set(subject.name.toLowerCase(), subject);
            });

            const videoTitleToVideo = new Map();
            existingVideos.forEach((video) => {
                const key = `${video.subjectId}_${video.title.toLowerCase()}`;
                videoTitleToVideo.set(key, video);
            });

            const subjectsMap = new Map();

            data.forEach((row) => {
                const subjectNameLower = row.subjectName.toLowerCase();
                let currentSubjectId;
                let isNewSubject = false;

                // Check if subject exists
                if (subjectNameToId.has(subjectNameLower)) {
                    currentSubjectId = subjectNameToId.get(subjectNameLower).id;
                } else {
                    // This will be a new subject
                    currentSubjectId = `new_${row.subjectName}`;
                    isNewSubject = true;
                }

                // Check if video is new
                const videoKey = `${currentSubjectId}_${row.videoTitle.toLowerCase()}`;
                const isNewVideo = !videoTitleToVideo.has(videoKey);

                // Only include in preview if it's a new video or new subject
                if (isNewVideo || isNewSubject) {
                    if (!subjectsMap.has(row.subjectName)) {
                        subjectsMap.set(row.subjectName, {
                            name: row.subjectName,
                            color:
                                row.subjectColor ||
                                pastelColors[
                                    subjectsMap.size % pastelColors.length
                                ].class,
                            videos: [],
                            isNew: isNewSubject,
                        });
                    }

                    // Only add the video if it's new
                    if (isNewVideo) {
                        const subject = subjectsMap.get(row.subjectName);
                        subject.videos.push({
                            title: row.videoTitle,
                            url: row.videoUrl || undefined,
                            scheduledDate: row.scheduledDate || undefined,
                            scheduledTime: row.scheduledTime || undefined,
                            isNew: true,
                        });
                    }
                }
            });

            setCsvPreview({
                subjects: Array.from(subjectsMap.values()),
            });
        } catch (error) {
            console.error("Error generating preview:", error);
            // Fallback to showing all data if there's an error
            const subjectsMap = new Map();

            data.forEach((row) => {
                if (!subjectsMap.has(row.subjectName)) {
                    subjectsMap.set(row.subjectName, {
                        name: row.subjectName,
                        color:
                            row.subjectColor ||
                            pastelColors[subjectsMap.size % pastelColors.length]
                                .class,
                        videos: [],
                    });
                }

                const subject = subjectsMap.get(row.subjectName);
                subject.videos.push({
                    title: row.videoTitle,
                    url: row.videoUrl || undefined,
                    scheduledDate: row.scheduledDate || undefined,
                    scheduledTime: row.scheduledTime || undefined,
                });
            });

            setCsvPreview({
                subjects: Array.from(subjectsMap.values()),
            });
        }
    };

    const saveCsvData = async () => {
        if (csvPreview.subjects.length === 0) {
            toast({
                title: "No data to save",
                description: "Please upload a valid CSV file first",
                variant: "destructive",
            });
            return;
        }

        const userId = getUserId();
        if (!userId) {
            toast({
                title: "Not logged in",
                description: "Please log in to save subjects and videos",
                variant: "destructive",
            });
            return;
        }

        setCsvLoading(true);
        setCsvProgress(0);
        setCsvProcessedItems(0);

        try {
            // Calculate total items to process
            const totalVideos = csvPreview.subjects.reduce(
                (total, subject) => total + subject.videos.length,
                0
            );
            const totalItems = csvPreview.subjects.length + totalVideos;
            setCsvTotalItems(totalItems);
            setCsvProgressText("Initializing...");

            // Get existing subjects and videos first
            setCsvProgressText("Loading existing data...");
            const existingSubjects = await getSubjects(userId);
            const existingVideos = await getVideos(userId);

            // Create maps for quick lookup
            const subjectNameToId = new Map();
            existingSubjects.forEach((subject) => {
                subjectNameToId.set(subject.name.toLowerCase(), subject);
            });

            const videoTitleToVideo = new Map();
            existingVideos.forEach((video) => {
                const key = `${video.subjectId}_${video.title.toLowerCase()}`;
                videoTitleToVideo.set(key, video);
            });

            let newSubjectsCount = 0;
            let updatedVideosCount = 0;
            let newVideosCount = 0;
            let processedItems = 0;

            for (const subjectData of csvPreview.subjects) {
                setCsvProgressText(`Processing subject: ${subjectData.name}`);

                let currentSubject;
                const subjectNameLower = subjectData.name.toLowerCase();

                // Check if subject already exists
                if (subjectNameToId.has(subjectNameLower)) {
                    currentSubject = subjectNameToId.get(subjectNameLower);
                    console.log(
                        `Subject "${subjectData.name}" already exists, using existing one`
                    );
                } else {
                    // Create new subject
                    currentSubject = await createSubject(userId, {
                        name: subjectData.name,
                        color: subjectData.color,
                    });
                    subjectNameToId.set(subjectNameLower, currentSubject);
                    newSubjectsCount++;
                    console.log(`Created new subject: "${subjectData.name}"`);
                }

                // Update progress after processing subject
                processedItems++;
                setCsvProcessedItems(processedItems);
                setCsvProgress((processedItems / totalItems) * 100);

                // Process videos for this subject
                for (let i = 0; i < subjectData.videos.length; i++) {
                    const videoData = subjectData.videos[i];
                    setCsvProgressText(
                        `Processing video ${i + 1}/${
                            subjectData.videos.length
                        } in ${subjectData.name}: ${videoData.title}`
                    );

                    const videoKey = `${
                        currentSubject.id
                    }_${videoData.title.toLowerCase()}`;

                    if (videoTitleToVideo.has(videoKey)) {
                        // Video exists, update it
                        const existingVideo = videoTitleToVideo.get(videoKey);

                        // Convert empty strings to undefined to clear fields
                        const updateData = {
                            title: videoData.title, // Keep original case
                            url: videoData.url || undefined,
                            scheduledDate: videoData.scheduledDate || undefined,
                            scheduledTime: videoData.scheduledTime || undefined,
                        };

                        await updateVideo(userId, existingVideo.id, updateData);
                        updatedVideosCount++;
                        console.log(
                            `Updated existing video: "${videoData.title}" in subject "${subjectData.name}"`
                        );
                    } else {
                        // Create new video
                        const createData = {
                            title: videoData.title,
                            url: videoData.url || undefined,
                            subjectId: currentSubject.id,
                            scheduledDate: videoData.scheduledDate || undefined,
                            scheduledTime: videoData.scheduledTime || undefined,
                        };

                        await createVideo(userId, createData);
                        newVideosCount++;
                        console.log(
                            `Created new video: "${videoData.title}" in subject "${subjectData.name}"`
                        );
                    }

                    // Update progress after processing each video
                    processedItems++;
                    setCsvProcessedItems(processedItems);
                    setCsvProgress((processedItems / totalItems) * 100);
                }
            }

            setCsvProgressText("Completing import...");

            // Show detailed success message
            const messages = [];
            if (newSubjectsCount > 0)
                messages.push(`${newSubjectsCount} new subjects created`);
            if (newVideosCount > 0)
                messages.push(`${newVideosCount} new videos created`);
            if (updatedVideosCount > 0)
                messages.push(`${updatedVideosCount} videos updated`);

            toast({
                title: "Import successful",
                description:
                    messages.length > 0
                        ? messages.join(", ")
                        : "No changes were made - all data already exists",
                duration: 5000, // Show for 5 seconds to give user time to read
            });

            // Reset CSV modal state
            setCsvUploadOpen(false);
            setCsvFile(null);
            setCsvData([]);
            setCsvPreview({ subjects: [] });
            setCsvProgress(0);
            setCsvProgressText("");
            setCsvTotalItems(0);
            setCsvProcessedItems(0);

            // Refresh data
            setTimeout(() => {
                refreshData();
            }, 1000);
        } catch (error) {
            console.error("Error importing CSV data:", error);
            toast({
                title: "Import failed",
                description:
                    "There was an error importing your data. Please try again.",
                variant: "destructive",
            });
        } finally {
            setCsvLoading(false);
            // Reset progress states in case of error
            setCsvProgress(0);
            setCsvProgressText("");
            setCsvTotalItems(0);
            setCsvProcessedItems(0);
        }
    };

    // Update subject order when subjects change
    useEffect(() => {
        if (subjects.length > 0) {
            // Initialize order if needed, or ensure all subjects are included
            setSubjectOrder((prevOrder) => {
                const allIds = subjects.map((subject) => subject.id);
                // Keep existing order, add new ones at the end
                const newOrder = [...prevOrder];

                // Add any new subjects not in the order
                allIds.forEach((id) => {
                    if (!newOrder.includes(id)) {
                        newOrder.push(id);
                    }
                });

                // Remove any subjects that no longer exist
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
                description: "Please log in to view your videos",
                variant: "destructive",
            });
            setLoading(false);
            return;
        }

        // Initial data load
        const loadData = async () => {
            try {
                const firebaseSubjects = await getSubjects(userId);
                const firebaseVideos = await getVideos(userId);

                // Transform to our local state format
                processFirebaseData(firebaseSubjects, firebaseVideos);
            } catch (error) {
                console.error("Error loading data:", error);
                toast({
                    title: "Error loading data",
                    description: "There was a problem loading your videos",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Set up real-time listeners for subjects
        const unsubscribeSubjects = subscribeToSubjects(
            userId,
            (firebaseSubjects) => {
                // When we receive subjects update, get the videos once
                getVideos(userId).then((firebaseVideos) => {
                    if (!loading) {
                        // Only process when not actively loading (adding/editing)
                        processFirebaseData(firebaseSubjects, firebaseVideos);
                    }
                });
            }
        );

        // Clean up listeners on unmount
        return () => {
            unsubscribeSubjects();
        };
    }, [toast, loading]);

    // Function to manually refresh data from Firebase
    const refreshData = async () => {
        const userId = getUserId();
        if (!userId) return;

        try {
            setLoading(true);
            const firebaseSubjects = await getSubjects(userId);
            const firebaseVideos = await getVideos(userId);
            processFirebaseData(firebaseSubjects, firebaseVideos);
        } catch (error) {
            console.error("Error refreshing data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Function to generate badge styles from color
    const getBadgeStyles = (color: string) => {
        // If it's one of our predefined classes, use it directly
        if (color.startsWith("bg-") && color.includes("text-")) {
            return color;
        }

        // Otherwise, it's a custom color, generate styles
        if (
            color.startsWith("#") ||
            color.includes("rgb") ||
            color.match(/^[a-zA-Z]+$/)
        ) {
            return `bg-opacity-20 text-foreground`;
        }

        // Default if color is invalid
        return pastelColors[0].class;
    };

    // Process Firebase data into local state format
    const processFirebaseData = (
        firebaseSubjects: FirebaseSubject[],
        firebaseVideos: FirebaseVideo[]
    ) => {
        // Build a fresh data structure from Firebase data
        const subjectsMap = new Map<string, Subject>();

        // Initialize subjects with colors
        firebaseSubjects.forEach((fbSubject, index) => {
            // Use the color from Firebase if available, otherwise use a default color
            const colorClass =
                fbSubject.color ||
                pastelColors[index % pastelColors.length].class;

            subjectsMap.set(fbSubject.id, {
                id: fbSubject.id,
                name: fbSubject.name,
                videos: [],
                color: colorClass,
            });
        });

        // Add videos to their subjects
        firebaseVideos.forEach((fbVideo) => {
            const subject = subjectsMap.get(fbVideo.subjectId);
            if (subject) {
                subject.videos.push({
                    id: fbVideo.id,
                    title: fbVideo.title,
                    url: fbVideo.url,
                    completed: fbVideo.completed,
                    scheduledDate: fbVideo.scheduledDate,
                    scheduledTime: fbVideo.scheduledTime,
                    subjectId: fbVideo.subjectId,
                });
            }
        });

        setSubjects(Array.from(subjectsMap.values()));
    };

    const addSubject = async () => {
        if (newSubjectName.trim()) {
            const userId = getUserId();
            if (!userId) return;

            try {
                setLoading(true);

                // Get the color to use (either selected from presets or custom)
                const colorToUse =
                    customColor || selectedColor || pastelColors[0].class;

                // Create subject in Firebase
                await createSubject(userId, {
                    name: newSubjectName,
                    color: colorToUse,
                });

                // Clear form fields
                const subjectNameToDisplay = newSubjectName;
                setNewSubjectName("");
                setSelectedColor("");
                setCustomColor("");

                // Show success message
                toast({
                    title: "Subject added",
                    description: `${subjectNameToDisplay} has been added to your subjects`,
                });

                // Keep loading state for 2 seconds, then refresh data
                setTimeout(() => {
                    refreshData();
                }, 2000);
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

    const addVideo = async () => {
        if (newVideoTitle.trim() && selectedSubjectId) {
            const userId = getUserId();
            if (!userId) return;

            try {
                setLoading(true);

                // Create video in Firebase
                await createVideo(userId, {
                    title: newVideoTitle,
                    url: newVideoUrl.trim() || undefined,
                    subjectId: selectedSubjectId,
                    scheduledDate: newVideoDate || undefined,
                    scheduledTime: newVideoTime || undefined,
                });

                // Store values before clearing form
                const videoTitleToDisplay = newVideoTitle;

                // Clear form fields
                setNewVideoTitle("");
                setNewVideoUrl("");
                setNewVideoDate("");
                setNewVideoTime("");
                setSelectedSubjectId("");

                // Show success message
                toast({
                    title: "Video added",
                    description: `${videoTitleToDisplay} has been added to your lecture videos`,
                });

                // Keep loading state for 3 seconds, then refresh data
                setTimeout(() => {
                    refreshData();
                }, 3000);
            } catch (error) {
                console.error("Error adding video:", error);
                toast({
                    title: "Error adding video",
                    description: "There was a problem adding your video",
                    variant: "destructive",
                });
                setLoading(false);
            }
        }
    };

    const toggleVideoCompletion = async (
        subjectId: string,
        videoId: string
    ) => {
        const userId = getUserId();
        if (!userId) return;

        // Find current video state
        const subject = subjects.find((s) => s.id === subjectId);
        if (!subject) return;

        const video = subject.videos.find((v) => v.id === videoId);
        if (!video) return;

        const newCompletionState = !video.completed;

        try {
            // Optimistic UI update
            setSubjects((prevSubjects) =>
                prevSubjects.map((subject) => {
                    if (subject.id === subjectId) {
                        return {
                            ...subject,
                            videos: subject.videos.map((video) => {
                                if (video.id === videoId) {
                                    return {
                                        ...video,
                                        completed: newCompletionState,
                                    };
                                }
                                return video;
                            }),
                        };
                    }
                    return subject;
                })
            );

            // Update video completion status in Firebase
            await updateVideo(userId, videoId, {
                completed: newCompletionState,
            });

            // Show success message
            toast({
                title: newCompletionState
                    ? "Marked as complete"
                    : "Marked as incomplete",
                description: `"${video.title}" has been updated`,
            });
        } catch (error) {
            console.error("Error updating video:", error);
            toast({
                title: "Error updating video",
                description: "There was a problem updating the video status",
                variant: "destructive",
            });

            // Revert optimistic update on error
            const firebaseSubjects = await getSubjects(userId);
            const firebaseVideos = await getVideos(userId);
            processFirebaseData(firebaseSubjects, firebaseVideos);
        }
    };

    const updateExistingVideo = async () => {
        if (!editingVideo || !editVideoTitle.trim()) {
            return;
        }

        const userId = getUserId();
        if (!userId) return;

        try {
            setLoading(true);

            // Update video in Firebase
            await updateVideo(userId, editingVideo.id, {
                title: editVideoTitle,
                url: editVideoUrl.trim() || undefined,
                scheduledDate: editVideoDate || undefined,
                scheduledTime: editVideoTime || undefined,
            });

            setEditingVideo(null);
            toast({
                title: "Video updated",
                description: `"${editVideoTitle}" has been updated`,
            });

            // Refresh data after a delay
            setTimeout(() => {
                refreshData();
            }, 2000);
        } catch (error) {
            console.error("Error updating video:", error);
            toast({
                title: "Error updating video",
                description: "There was a problem updating the video",
                variant: "destructive",
            });
            setLoading(false);
        }
    };

    const getCompletionStats = (subject: Subject) => {
        const completed = subject.videos.filter((v) => v.completed).length;
        const total = subject.videos.length;
        return {
            completed,
            total,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
    };

    const groupVideosByMonth = (videos: Video[]): GroupedVideos => {
        const grouped: GroupedVideos = {};

        videos.forEach((video) => {
            if (video.scheduledDate) {
                const date = new Date(video.scheduledDate);
                const monthKey = date.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                });

                if (!grouped[monthKey]) {
                    grouped[monthKey] = [];
                }
                grouped[monthKey].push(video);
            } else {
                // Videos without dates go to "Unscheduled"
                if (!grouped["Unscheduled"]) {
                    grouped["Unscheduled"] = [];
                }
                grouped["Unscheduled"].push(video);
            }
        });

        // Sort videos within each month by date
        Object.keys(grouped).forEach((month) => {
            if (month !== "Unscheduled") {
                grouped[month].sort((a, b) => {
                    if (!a.scheduledDate || !b.scheduledDate) return 0;
                    return (
                        new Date(a.scheduledDate).getTime() -
                        new Date(b.scheduledDate).getTime()
                    );
                });
            }
        });

        return grouped;
    };

    const toggleMonthExpansion = (subjectId: string, month: string) => {
        const key = `${subjectId}-${month}`;
        setExpandedMonths((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const isMonthExpanded = (subjectId: string, month: string) => {
        const key = `${subjectId}-${month}`;
        return expandedMonths[key] || false;
    };

    const deleteSubjectItem = async () => {
        if (!deletingSubjectId) return;

        const userId = getUserId();
        if (!userId) return;

        try {
            setLoading(true);

            // Delete subject in Firebase
            await deleteSubject(userId, deletingSubjectId);

            // Close dialog
            setDeletingSubjectId(null);

            // Show success message
            toast({
                title: "Subject deleted",
                description: "The subject and all its videos have been deleted",
            });

            // Refresh data after a delay
            setTimeout(() => {
                refreshData();
            }, 2000);
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

    const deleteVideoItem = async () => {
        if (!deletingVideo) return;

        const userId = getUserId();
        if (!userId) return;

        try {
            setLoading(true);

            // Delete video in Firebase
            await deleteVideo(userId, deletingVideo.id);

            // Close dialog
            setDeletingVideo(null);

            // Show success message
            toast({
                title: "Video deleted",
                description: `"${deletingVideo.title}" has been deleted`,
            });

            // Refresh data after a delay
            setTimeout(() => {
                refreshData();
            }, 2000);
        } catch (error) {
            console.error("Error deleting video:", error);
            toast({
                title: "Error deleting video",
                description: "There was a problem deleting the video",
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

        // Add visual feedback by updating the class
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

        // Remove all drag-over classes
        const cards = document.querySelectorAll(".draggable-card");
        cards.forEach((card) => card.classList.remove("drag-over"));

        // Make a copy of the order array
        const newOrder = [...subjectOrder];

        // Get the item being dragged
        const draggedItemContent = newOrder[dragItem.current];

        // Remove it from the original position
        newOrder.splice(dragItem.current, 1);

        // Insert at the new position
        newOrder.splice(dragOverItem.current, 0, draggedItemContent);

        // Update the state
        setSubjectOrder(newOrder);

        // Reset the references
        dragItem.current = null;
        dragOverItem.current = null;
    };

    if (loading) {
        return (
            <div className="p-6 flex flex-col items-center justify-center h-[80vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-lg">Loading your lecture videos...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                        Study Videos 📹
                    </h1>
                    <p className="text-muted-foreground">
                        Organize your study videos by subject
                    </p>
                </div>

                <div className="flex space-x-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="hover:bg-accent hover:text-accent-foreground">
                                <Plus className="w-4 h-4 mr-2" />
                                <span>Add Subject</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Subject</DialogTitle>
                                <DialogDescription>
                                    Create a new subject folder to organize your
                                    lecture videos.
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
                                <Button
                                    className="hover:bg-accent hover:text-accent-foreground"
                                    onClick={addSubject}
                                >
                                    {loading && (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    )}
                                    Add Subject
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog
                        open={csvUploadOpen}
                        onOpenChange={setCsvUploadOpen}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                className="hover:bg-accent hover:text-accent-foreground"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                <span>Bulk Upload</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    Bulk Upload Subjects & Videos
                                </DialogTitle>
                                <DialogDescription>
                                    Upload a CSV file to create multiple
                                    subjects and videos at once.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6">
                                {/* Download Template Section */}
                                <div className="border rounded-lg p-4 bg-muted/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium flex items-center">
                                                <FileText className="w-4 h-4 mr-2" />
                                                Download Template
                                            </h3>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Get the CSV template with the
                                                correct format
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={downloadCsvTemplate}
                                            className="shrink-0"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download Template
                                        </Button>
                                    </div>
                                </div>

                                {/* Upload Section */}
                                <div className="border rounded-lg p-4">
                                    <h3 className="font-medium mb-2">
                                        Upload CSV File
                                    </h3>
                                    <div className="space-y-2">
                                        <Input
                                            type="file"
                                            accept=".csv"
                                            onChange={handleCsvFileChange}
                                            className="cursor-pointer"
                                        />
                                        {csvFile && (
                                            <p className="text-sm text-muted-foreground">
                                                Selected file: {csvFile.name}
                                            </p>
                                        )}
                                        <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                                            📅{" "}
                                            <strong>
                                                Date formats supported:
                                            </strong>{" "}
                                            YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY
                                            <br />
                                            Dates will be automatically
                                            converted to the correct format.
                                        </div>
                                    </div>
                                </div>

                                {/* Preview Section */}
                                {csvPreview.subjects.length > 0 && (
                                    <div className="border rounded-lg p-4">
                                        <h3 className="font-medium mb-4">
                                            Preview - New Items Only
                                        </h3>
                                        <div className="space-y-4 max-h-64 overflow-y-auto">
                                            {csvPreview.subjects.map(
                                                (subject, index) => (
                                                    <div
                                                        key={index}
                                                        className="border rounded p-3 bg-muted/30"
                                                    >
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div
                                                                className="w-4 h-4 rounded"
                                                                style={{
                                                                    backgroundColor:
                                                                        subject.color.startsWith(
                                                                            "#"
                                                                        )
                                                                            ? subject.color
                                                                            : undefined,
                                                                }}
                                                            />
                                                            <span className="font-medium">
                                                                {subject.name}
                                                            </span>
                                                            {(subject as any)
                                                                .isNew && (
                                                                <Badge
                                                                    variant="default"
                                                                    className="bg-green-500 text-white"
                                                                >
                                                                    New Subject
                                                                </Badge>
                                                            )}
                                                            <Badge variant="secondary">
                                                                {
                                                                    subject
                                                                        .videos
                                                                        .length
                                                                }{" "}
                                                                new videos
                                                            </Badge>
                                                        </div>
                                                        <div className="ml-6 space-y-1">
                                                            {subject.videos.map(
                                                                (
                                                                    video,
                                                                    videoIndex
                                                                ) => (
                                                                    <div
                                                                        key={
                                                                            videoIndex
                                                                        }
                                                                        className="text-sm text-muted-foreground flex items-center gap-2"
                                                                    >
                                                                        <span>
                                                                            •{" "}
                                                                            {
                                                                                video.title
                                                                            }
                                                                        </span>
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="text-xs bg-blue-50 text-blue-700"
                                                                        >
                                                                            New
                                                                        </Badge>
                                                                        {video.scheduledDate && (
                                                                            <span className="ml-2 text-xs">
                                                                                (
                                                                                {
                                                                                    video.scheduledDate
                                                                                }{" "}
                                                                                {
                                                                                    video.scheduledTime
                                                                                }

                                                                                )
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                        <div className="mt-2 text-xs text-muted-foreground">
                                            💡 Only new subjects and videos are
                                            shown. Existing items will be
                                            updated in place.
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Progress Bar Section */}
                            {csvLoading && (
                                <div className="space-y-4 border-t pt-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-medium">
                                                Upload Progress
                                            </span>
                                            <span className="text-muted-foreground">
                                                {csvProcessedItems} /{" "}
                                                {csvTotalItems} items (
                                                {Math.round(csvProgress)}%)
                                            </span>
                                        </div>
                                        <Progress
                                            value={csvProgress}
                                            className="h-2"
                                        />
                                        {csvProgressText && (
                                            <div className="text-sm text-muted-foreground truncate">
                                                {csvProgressText}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setCsvUploadOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={saveCsvData}
                                    disabled={
                                        csvPreview.subjects.length === 0 ||
                                        csvLoading
                                    }
                                >
                                    {csvLoading && (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    )}
                                    Save {csvPreview.subjects.length} Subjects
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
                        const groupedVideos = groupVideosByMonth(
                            subject.videos
                        );
                        const monthKeys = Object.keys(groupedVideos).sort(
                            (a, b) => {
                                if (a === "Unscheduled") return 1;
                                if (b === "Unscheduled") return -1;
                                return (
                                    new Date(a).getTime() -
                                    new Date(b).getTime()
                                );
                            }
                        );

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
                                                )} hover:bg-accent hover:text-accent-foreground text-xs sm:text-sm whitespace-nowrap ${
                                                    subject.color.startsWith(
                                                        "#"
                                                    ) ||
                                                    subject.color.includes(
                                                        "rgb"
                                                    ) ||
                                                    subject.color.match(
                                                        /^[a-zA-Z]+$/
                                                    )
                                                        ? "custom-color-badge"
                                                        : ""
                                                }`}
                                                style={
                                                    subject.color.startsWith(
                                                        "#"
                                                    ) ||
                                                    subject.color.includes(
                                                        "rgb"
                                                    ) ||
                                                    subject.color.match(
                                                        /^[a-zA-Z]+$/
                                                    )
                                                        ? {
                                                              backgroundColor: `${subject.color}20`,
                                                              borderColor:
                                                                  subject.color,
                                                          }
                                                        : {}
                                                }
                                            >
                                                {stats.percentage}% Complete
                                            </Badge>
                                        </div>
                                    </div>
                                    <CardDescription>
                                        {stats.completed} of {stats.total}{" "}
                                        videos completed
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    <div className="space-y-3">
                                        {monthKeys.length > 0 ? (
                                            monthKeys.map((month) => (
                                                <div
                                                    key={month}
                                                    className="border rounded-lg"
                                                >
                                                    <Collapsible
                                                        open={isMonthExpanded(
                                                            subject.id,
                                                            month
                                                        )}
                                                        onOpenChange={() =>
                                                            toggleMonthExpansion(
                                                                subject.id,
                                                                month
                                                            )
                                                        }
                                                    >
                                                        <CollapsibleTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                className="w-full justify-between p-2 md:p-3 h-auto font-medium text-sm md:text-base"
                                                            >
                                                                <div className="flex items-center space-x-2 overflow-hidden">
                                                                    <Calendar className="w-4 h-4 flex-shrink-0" />
                                                                    <span className="truncate">
                                                                        {month}
                                                                    </span>
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-xs flex-shrink-0"
                                                                    >
                                                                        {
                                                                            groupedVideos[
                                                                                month
                                                                            ]
                                                                                .length
                                                                        }
                                                                    </Badge>
                                                                </div>
                                                                {isMonthExpanded(
                                                                    subject.id,
                                                                    month
                                                                ) ? (
                                                                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                                                                ) : (
                                                                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                                                                )}
                                                            </Button>
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent className="px-3 pb-3">
                                                            <div className="space-y-2">
                                                                {groupedVideos[
                                                                    month
                                                                ].map(
                                                                    (video) => (
                                                                        <div
                                                                            key={
                                                                                video.id
                                                                            }
                                                                            className="flex items-start space-x-2 p-2 hover:bg-muted/50 rounded-md"
                                                                        >
                                                                            <Checkbox
                                                                                id={`video-${video.id}`}
                                                                                checked={
                                                                                    video.completed
                                                                                }
                                                                                onCheckedChange={() =>
                                                                                    toggleVideoCompletion(
                                                                                        subject.id,
                                                                                        video.id
                                                                                    )
                                                                                }
                                                                                className="mt-1 flex-shrink-0"
                                                                            />
                                                                            <div className="flex-1 space-y-1 min-w-0">
                                                                                <div className="flex items-center justify-between">
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <button
                                                                                            className={`font-medium text-sm truncate max-w-full text-left transition-colors block ${
                                                                                                video.completed
                                                                                                    ? "line-through text-muted-foreground"
                                                                                                    : ""
                                                                                            } ${
                                                                                                video.url
                                                                                                    ? "hover:text-blue-600 cursor-pointer"
                                                                                                    : "cursor-default"
                                                                                            }`}
                                                                                            onClick={(
                                                                                                e
                                                                                            ) => {
                                                                                                e.stopPropagation();
                                                                                                if (
                                                                                                    video.url
                                                                                                ) {
                                                                                                    window.open(
                                                                                                        video.url,
                                                                                                        "_blank"
                                                                                                    );
                                                                                                }
                                                                                            }}
                                                                                        >
                                                                                            {
                                                                                                video.title
                                                                                            }
                                                                                        </button>
                                                                                    </div>
                                                                                    <div className="flex flex-wrap items-center gap-1">
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            className="h-6 w-6 p-0 text-blue-500"
                                                                                            onClick={() => {
                                                                                                setEditingVideo(
                                                                                                    video
                                                                                                );
                                                                                                setEditVideoTitle(
                                                                                                    video.title
                                                                                                );
                                                                                                setEditVideoUrl(
                                                                                                    video.url ||
                                                                                                        ""
                                                                                                );
                                                                                                setEditVideoDate(
                                                                                                    video.scheduledDate ||
                                                                                                        ""
                                                                                                );
                                                                                                setEditVideoTime(
                                                                                                    video.scheduledTime ||
                                                                                                        ""
                                                                                                );
                                                                                            }}
                                                                                        >
                                                                                            <Pencil className="h-3 w-3" />
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            className="h-6 w-6 p-0 text-red-500"
                                                                                            onClick={() =>
                                                                                                setDeletingVideo(
                                                                                                    video
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <Trash2 className="h-3 w-3" />
                                                                                        </Button>
                                                                                        {video.url && (
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                className="h-6 w-6 p-0"
                                                                                                asChild
                                                                                            >
                                                                                                <a
                                                                                                    href={
                                                                                                        video.url
                                                                                                    }
                                                                                                    target="_blank"
                                                                                                    rel="noopener noreferrer"
                                                                                                >
                                                                                                    <ExternalLink className="h-3 w-3" />
                                                                                                </a>
                                                                                            </Button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                {(video.scheduledDate ||
                                                                                    video.scheduledTime) && (
                                                                                    <div className="flex flex-wrap items-center text-xs text-muted-foreground gap-2">
                                                                                        {video.scheduledDate && (
                                                                                            <div className="flex items-center">
                                                                                                <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                                                                                                {
                                                                                                    video.scheduledDate
                                                                                                }
                                                                                            </div>
                                                                                        )}
                                                                                        {video.scheduledTime && (
                                                                                            <div className="flex items-center">
                                                                                                <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                                                                                                {
                                                                                                    video.scheduledTime
                                                                                                }
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic p-2">
                                                No videos in this subject yet.
                                            </p>
                                        )}
                                    </div>

                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full"
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Video
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>
                                                    Add New Video
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Add a new video to{" "}
                                                    {subject.name}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="video-title">
                                                        Video Title
                                                    </Label>
                                                    <Input
                                                        id="video-title"
                                                        value={newVideoTitle}
                                                        onChange={(e) =>
                                                            setNewVideoTitle(
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="Enter title"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="video-url">
                                                        Video URL (Optional)
                                                    </Label>
                                                    <Input
                                                        id="video-url"
                                                        value={newVideoUrl}
                                                        onChange={(e) =>
                                                            setNewVideoUrl(
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="https://... (optional)"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="video-date">
                                                        Scheduled Date
                                                    </Label>
                                                    <Input
                                                        id="video-date"
                                                        type="date"
                                                        value={newVideoDate}
                                                        onChange={(e) =>
                                                            setNewVideoDate(
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="video-time">
                                                        Scheduled Time
                                                    </Label>
                                                    <Input
                                                        id="video-time"
                                                        type="time"
                                                        value={newVideoTime}
                                                        onChange={(e) =>
                                                            setNewVideoTime(
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <input
                                                    type="hidden"
                                                    value={subject.id}
                                                    onChange={() =>
                                                        setSelectedSubjectId(
                                                            subject.id
                                                        )
                                                    }
                                                />
                                            </div>
                                            <DialogFooter>
                                                <Button
                                                    onClick={() => {
                                                        setSelectedSubjectId(
                                                            subject.id
                                                        );
                                                        addVideo();
                                                    }}
                                                    className="hover:bg-accent hover:text-accent-foreground"
                                                    disabled={loading}
                                                >
                                                    {loading && (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    )}
                                                    Add Video
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

            {/* Video Edit Dialog */}
            <Dialog
                open={!!editingVideo}
                onOpenChange={(open) => !open && setEditingVideo(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Video</DialogTitle>
                        <DialogDescription>
                            Make changes to your video details
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-video-title">
                                Video Title
                            </Label>
                            <Input
                                id="edit-video-title"
                                value={editVideoTitle}
                                onChange={(e) =>
                                    setEditVideoTitle(e.target.value)
                                }
                                placeholder="Enter title"
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-video-url">
                                Video URL (Optional)
                            </Label>
                            <Input
                                id="edit-video-url"
                                value={editVideoUrl}
                                onChange={(e) =>
                                    setEditVideoUrl(e.target.value)
                                }
                                placeholder="https://... (optional)"
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-video-date">
                                Scheduled Date
                            </Label>
                            <Input
                                id="edit-video-date"
                                type="date"
                                value={editVideoDate}
                                onChange={(e) =>
                                    setEditVideoDate(e.target.value)
                                }
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-video-time">
                                Scheduled Time
                            </Label>
                            <Input
                                id="edit-video-time"
                                type="time"
                                value={editVideoTime}
                                onChange={(e) =>
                                    setEditVideoTime(e.target.value)
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditingVideo(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={updateExistingVideo}
                            disabled={loading}
                        >
                            {loading && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                            will also delete all videos in this subject.
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

            {/* Delete Video Confirmation Dialog */}
            <Dialog
                open={!!deletingVideo}
                onOpenChange={(open) => !open && setDeletingVideo(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Video</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "
                            {deletingVideo?.title}"?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeletingVideo(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={deleteVideoItem}
                            disabled={loading}
                        >
                            {loading && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Delete Video
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
