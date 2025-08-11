// Utility: Get current Date object in Manila timezone
export function getManilaDate(): Date {
    // Get current UTC time
    const now = new Date();
    // Get Manila time as string
    const manilaString = now.toLocaleString("en-US", {
        timeZone: "Asia/Manila",
    });
    // Parse back to Date object (local to Manila)
    return new Date(manilaString);
}

// Utility: Get YYYY-MM-DD string in Manila timezone
export function getManilaDateString(date?: Date): string {
    const d = date || getManilaDate();
    // Use toLocaleDateString with Manila timezone
    const [month, day, year] = d
        .toLocaleDateString("en-US", { timeZone: "Asia/Manila" })
        .split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
// Study time tracking functions
// Returns { study: { seconds }, break: { seconds } } or { seconds } for legacy
export async function getStudyTime(userId: string, date: string): Promise<any> {
    // date: YYYY-MM-DD
    const refPath = ref(
        database,
        `userData/${userId}/lecture-videosTime/${date}`
    );
    const snapshot = await get(refPath);
    if (!snapshot.exists()) {
        return { study: { seconds: 0 }, break: { seconds: 0 } };
    }
    const val = snapshot.val();
    if (typeof val === "number") {
        // legacy: treat as study seconds
        return { study: { seconds: val }, break: { seconds: 0 } };
    }
    // If already object, merge defaults
    return {
        study: { seconds: val.study?.seconds || 0 },
        break: { seconds: val.break?.seconds || 0 },
    };
}

export async function setStudyTime(
    userId: string,
    date: string,
    minutes: number
): Promise<void> {
    const refPath = ref(
        database,
        `userData/${userId}/lecture-videosTime/${date}`
    );
    await set(refPath, minutes);
}

// Accepts: seconds (number, legacy), or { study: { seconds }, break: { seconds } }
export async function incrementStudyTime(
    userId: string,
    date: string,
    value:
        | number
        | { study?: { seconds?: number }; break?: { seconds?: number } }
): Promise<void> {
    const refPath = ref(
        database,
        `userData/${userId}/lecture-videosTime/${date}`
    );
    const snapshot = await get(refPath);
    let current: any = snapshot.exists() ? snapshot.val() : undefined;
    // If legacy number, convert to object
    if (typeof current === "number") {
        current = { study: { seconds: current }, break: { seconds: 0 } };
    }
    if (typeof value === "number") {
        // legacy: add to study
        const prev = current?.study?.seconds || 0;
        await set(refPath, {
            study: { seconds: prev + value },
            break: { seconds: current?.break?.seconds || 0 },
        });
        return;
    }
    // If object, merge study/break
    const newStudy =
        (value.study?.seconds || 0) + (current?.study?.seconds || 0);
    const newBreak =
        (value.break?.seconds || 0) + (current?.break?.seconds || 0);
    await set(refPath, {
        study: { seconds: newStudy },
        break: { seconds: newBreak },
    });
}
import { database } from "./firebase";
import {
    ref,
    set,
    get,
    push,
    update,
    remove,
    query,
    orderByChild,
    equalTo,
    onValue,
    off,
} from "firebase/database";

export type UserData = {
    id: string;
    name: string;
    email: string;
    pin: string;
};

/**
 * Register a new user with PIN authentication
 */
export async function registerWithPIN(
    email: string,
    name: string,
    pin: string
): Promise<UserData> {
    // Validate PIN format (5 digits)
    if (!/^\d{5}$/.test(pin)) {
        throw new Error("PIN must be exactly 5 digits");
    }

    // Check if email already exists (we allow duplicate PINs)
    const usersRef = ref(database, "users");
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
        const users = snapshot.val();

        // Only check if email exists
        const emailExists = Object.values(users).some(
            (user: any) => user.email.toLowerCase() === email.toLowerCase()
        );
        if (emailExists) {
            throw new Error("An account with this email already exists.");
        }

        // Note: We're intentionally allowing duplicate PINs
        // During login, if multiple users have the same PIN,
        // they will be asked to verify their email
    }

    // Create user ID from email
    const userId = email.toLowerCase().replace(/[^a-z0-9]/g, "-");

    // Create user data
    const userData: UserData = {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase(),
        pin: pin,
    };

    // Save user to database
    await set(ref(database, `users/${userId}`), userData);

    // Initialize user data structure
    await set(ref(database, `userData/${userId}`), {
        createdAt: new Date().toISOString(),
        subjects: {},
        tasks: {},
        stats: {
            totalVideos: 0,
            watchedVideos: 0,
            totalSubjects: 0,
            studyStreak: 0,
            lastStudyDate: new Date().toISOString(),
        },
    });

    return userData;
}

/**
 * Login with PIN
 * Returns:
 * - null if no user found
 * - UserData if single user found
 * - Array of users if multiple users found with the same PIN
 */
export async function loginWithPIN(
    pin: string
): Promise<UserData | null | UserData[]> {
    try {
        // Query users with this PIN
        const usersRef = ref(database, "users");
        const snapshot = await get(usersRef);

        if (!snapshot.exists()) {
            return null;
        }

        const users = snapshot.val();
        const matchingUsers: UserData[] = [];

        // Find users with matching PIN
        Object.values(users).forEach((user: any) => {
            if (user.pin === pin) {
                matchingUsers.push(user as UserData);
            }
        });

        if (matchingUsers.length === 0) {
            return null;
        }

        if (matchingUsers.length === 1) {
            return matchingUsers[0];
        }

        // Multiple users found with same PIN
        return matchingUsers;
    } catch (error) {
        console.error("Login error:", error);
        throw error;
    }
}

/**
 * Verify user email when multiple users have the same PIN
 */
export async function verifyUserEmailWithPIN(
    pin: string,
    email: string
): Promise<UserData | null> {
    try {
        // Query users with this PIN and email
        const usersRef = ref(database, "users");
        const snapshot = await get(usersRef);

        if (!snapshot.exists()) {
            return null;
        }

        const users = snapshot.val();
        let matchingUser: UserData | null = null;

        // Find user with matching PIN and email
        Object.entries(users).forEach(([userId, userData]: [string, any]) => {
            if (
                userData.pin === pin &&
                userData.email.toLowerCase() === email.toLowerCase()
            ) {
                matchingUser = {
                    id: userId,
                    name: userData.name,
                    email: userData.email,
                    pin: userData.pin,
                };
            }
        });

        return matchingUser;
    } catch (error) {
        console.error("Email verification error:", error);
        throw error;
    }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserData | null> {
    try {
        const userRef = ref(database, `users/${userId}`);
        const snapshot = await get(userRef);

        if (!snapshot.exists()) {
            return null;
        }

        const userData = snapshot.val();
        return {
            id: userId,
            name: userData.name,
            email: userData.email,
            pin: userData.pin,
        };
    } catch (error) {
        console.error("Error fetching user:", error);
        return null;
    }
}

// Types for data model
export interface Subject {
    id: string;
    name: string;
    description?: string;
    color?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Chapter {
    id: string;
    subjectId: string;
    title: string;
    description?: string;
    order: number;
    createdAt: string;
    updatedAt: string;
}

export interface Video {
    id: string;
    subjectId: string;
    chapterId?: string;
    title: string;
    url?: string;
    description?: string;
    scheduledDate?: string; // ISO date string
    scheduledTime?: string; // HH:MM format
    completed: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Lecture {
    id: string;
    subjectId: string;
    chapterId?: string;
    title: string;
    url: string;
    description?: string;
    scheduledDate?: string; // ISO date string
    completed: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    dueDate?: string; // ISO date string
    dueTime?: string; // HH:MM format
    completed: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UserStats {
    totalVideos: number;
    watchedVideos: number;
    totalLectures: number;
    watchedLectures: number;
    totalSubjects: number;
    studyStreak: number;
    lastStudyDate: string;
}

// Subject management functions
export async function createSubject(
    userId: string,
    subjectData: Omit<Subject, "id" | "createdAt" | "updatedAt">
): Promise<Subject> {
    const timestamp = new Date().toISOString();
    const subjectRef = push(ref(database, `userData/${userId}/subjects`));

    const newSubject: Subject = {
        id: subjectRef.key!,
        name: subjectData.name,
        description: subjectData.description || "",
        color: subjectData.color || "",
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    await set(subjectRef, newSubject);

    // Update user stats
    const statsRef = ref(database, `userData/${userId}/stats`);
    const statsSnapshot = await get(statsRef);
    if (statsSnapshot.exists()) {
        const stats = statsSnapshot.val();
        await update(statsRef, {
            totalSubjects: (stats.totalSubjects || 0) + 1,
        });
    }

    return newSubject;
}

export async function getSubjects(userId: string): Promise<Subject[]> {
    const subjectsRef = ref(database, `userData/${userId}/subjects`);
    const snapshot = await get(subjectsRef);

    if (!snapshot.exists()) {
        return [];
    }

    const subjectsData = snapshot.val();
    return Object.values(subjectsData);
}

export async function getSubject(
    userId: string,
    subjectId: string
): Promise<Subject | null> {
    const subjectRef = ref(
        database,
        `userData/${userId}/subjects/${subjectId}`
    );
    const snapshot = await get(subjectRef);

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.val();
}

export async function updateSubject(
    userId: string,
    subjectId: string,
    subjectData: Partial<Subject>
): Promise<Subject> {
    const subjectRef = ref(
        database,
        `userData/${userId}/subjects/${subjectId}`
    );
    const snapshot = await get(subjectRef);

    if (!snapshot.exists()) {
        throw new Error("Subject not found");
    }

    const currentSubject = snapshot.val();
    const updatedSubject = {
        ...currentSubject,
        ...subjectData,
        updatedAt: new Date().toISOString(),
    };

    await update(subjectRef, updatedSubject);
    return updatedSubject;
}

export async function deleteSubject(
    userId: string,
    subjectId: string
): Promise<void> {
    // Get videos for this subject first to update stats
    const videosRef = ref(database, `userData/${userId}/videos`);
    const videosSnapshot = await get(videosRef);

    let videoCount = 0;
    let watchedCount = 0;

    if (videosSnapshot.exists()) {
        const videos = videosSnapshot.val();
        Object.values(videos).forEach((video: any) => {
            if (video.subjectId === subjectId) {
                videoCount++;
                if (video.completed) {
                    watchedCount++;
                }
            }
        });
    }

    // Delete the subject
    await remove(ref(database, `userData/${userId}/subjects/${subjectId}`));

    // Delete all videos for this subject
    if (videosSnapshot.exists()) {
        const videos = videosSnapshot.val();
        const promises = Object.entries(videos).map(
            ([videoId, video]: [string, any]) => {
                if (video.subjectId === subjectId) {
                    return remove(
                        ref(database, `userData/${userId}/videos/${videoId}`)
                    );
                }
                return Promise.resolve();
            }
        );

        await Promise.all(promises);
    }

    // Update user stats
    const statsRef = ref(database, `userData/${userId}/stats`);
    const statsSnapshot = await get(statsRef);

    if (statsSnapshot.exists()) {
        const stats = statsSnapshot.val();
        await update(statsRef, {
            totalSubjects: Math.max(0, (stats.totalSubjects || 0) - 1),
            totalVideos: Math.max(0, (stats.totalVideos || 0) - videoCount),
            watchedVideos: Math.max(
                0,
                (stats.watchedVideos || 0) - watchedCount
            ),
        });
    }
}

// Chapter management functions
export async function createChapter(
    userId: string,
    chapterData: Omit<Chapter, "id" | "createdAt" | "updatedAt">
): Promise<Chapter> {
    // Verify subject exists
    const subjectRef = ref(
        database,
        `userData/${userId}/subjects/${chapterData.subjectId}`
    );
    const subjectSnapshot = await get(subjectRef);

    if (!subjectSnapshot.exists()) {
        throw new Error("Subject not found");
    }

    const timestamp = new Date().toISOString();
    const chapterRef = push(ref(database, `userData/${userId}/chapters`));

    const newChapter: Chapter = {
        id: chapterRef.key!,
        subjectId: chapterData.subjectId,
        title: chapterData.title,
        description: chapterData.description || "",
        order: chapterData.order,
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    await set(chapterRef, newChapter);
    return newChapter;
}

export async function getChapters(
    userId: string,
    subjectId?: string
): Promise<Chapter[]> {
    const chaptersRef = ref(database, `userData/${userId}/chapters`);
    const snapshot = await get(chaptersRef);

    if (!snapshot.exists()) {
        return [];
    }

    const chaptersData = snapshot.val();
    const chapters: Chapter[] = Object.values(chaptersData);

    if (subjectId) {
        return chapters
            .filter((chapter) => chapter.subjectId === subjectId)
            .sort((a, b) => a.order - b.order);
    }

    return chapters.sort((a, b) => a.order - b.order);
}

export async function updateChapter(
    userId: string,
    chapterId: string,
    updates: Partial<Omit<Chapter, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
    const timestamp = new Date().toISOString();
    const chapterRef = ref(
        database,
        `userData/${userId}/chapters/${chapterId}`
    );

    await update(chapterRef, {
        ...updates,
        updatedAt: timestamp,
    });
}

export async function deleteChapter(
    userId: string,
    chapterId: string
): Promise<void> {
    // Get videos in this chapter first to update stats
    const videosRef = ref(database, `userData/${userId}/videos`);
    const videosSnapshot = await get(videosRef);

    let videoCount = 0;
    let watchedCount = 0;

    if (videosSnapshot.exists()) {
        const videos = videosSnapshot.val();
        Object.values(videos).forEach((video: any) => {
            if (video.chapterId === chapterId) {
                videoCount++;
                if (video.completed) {
                    watchedCount++;
                }
            }
        });
    }

    // Delete the chapter
    await remove(ref(database, `userData/${userId}/chapters/${chapterId}`));

    // Update videos to remove chapter reference
    if (videosSnapshot.exists()) {
        const videos = videosSnapshot.val();
        const promises = Object.entries(videos).map(
            ([videoId, video]: [string, any]) => {
                if (video.chapterId === chapterId) {
                    return update(
                        ref(database, `userData/${userId}/videos/${videoId}`),
                        { chapterId: null }
                    );
                }
                return Promise.resolve();
            }
        );

        await Promise.all(promises);
    }
}

export async function subscribeToChapters(
    userId: string,
    callback: (chapters: Chapter[]) => void
): Promise<() => void> {
    const chaptersRef = ref(database, `userData/${userId}/chapters`);

    const unsubscribe = onValue(chaptersRef, (snapshot) => {
        if (snapshot.exists()) {
            const chaptersData = snapshot.val();
            const chapters: Chapter[] = Object.values(chaptersData);
            callback(chapters.sort((a, b) => a.order - b.order));
        } else {
            callback([]);
        }
    });

    return unsubscribe;
}

// Video management functions
export async function createVideo(
    userId: string,
    videoData: Omit<Video, "id" | "completed" | "createdAt" | "updatedAt">
): Promise<Video> {
    // Verify subject exists
    const subjectRef = ref(
        database,
        `userData/${userId}/subjects/${videoData.subjectId}`
    );
    const subjectSnapshot = await get(subjectRef);

    if (!subjectSnapshot.exists()) {
        throw new Error("Subject not found");
    }

    const timestamp = new Date().toISOString();
    const videoRef = push(ref(database, `userData/${userId}/videos`));

    const newVideo: any = {
        id: videoRef.key!,
        subjectId: videoData.subjectId,
        title: videoData.title,
        description: videoData.description || "",
        completed: false,
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    // Only add optional fields if they have values
    if (videoData.chapterId) {
        newVideo.chapterId = videoData.chapterId;
    }
    if (videoData.url) {
        newVideo.url = videoData.url;
    }
    if (videoData.scheduledDate) {
        newVideo.scheduledDate = videoData.scheduledDate;
    }
    if (videoData.scheduledTime) {
        newVideo.scheduledTime = videoData.scheduledTime;
    }

    await set(videoRef, newVideo);

    // Update user stats
    const statsRef = ref(database, `userData/${userId}/stats`);
    const statsSnapshot = await get(statsRef);

    if (statsSnapshot.exists()) {
        const stats = statsSnapshot.val();
        await update(statsRef, {
            totalVideos: (stats.totalVideos || 0) + 1,
        });
    }

    return newVideo;
}

export async function getVideos(
    userId: string,
    subjectId?: string
): Promise<Video[]> {
    const videosRef = ref(database, `userData/${userId}/videos`);
    const snapshot = await get(videosRef);

    if (!snapshot.exists()) {
        return [];
    }

    const videosData = snapshot.val();
    const videos = Object.values(videosData) as Video[];

    if (subjectId) {
        return videos.filter((video) => video.subjectId === subjectId);
    }

    return videos;
}

export async function getVideo(
    userId: string,
    videoId: string
): Promise<Video | null> {
    const videoRef = ref(database, `userData/${userId}/videos/${videoId}`);
    const snapshot = await get(videoRef);

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.val();
}

export async function updateVideo(
    userId: string,
    videoId: string,
    videoData: Partial<Video>
): Promise<Video> {
    const videoRef = ref(database, `userData/${userId}/videos/${videoId}`);
    const snapshot = await get(videoRef);

    if (!snapshot.exists()) {
        throw new Error("Video not found");
    }

    const currentVideo = snapshot.val();
    const wasCompleted = currentVideo.completed;
    const willBeCompleted =
        videoData.completed !== undefined ? videoData.completed : wasCompleted;

    // Create update object
    const updateData: any = {
        updatedAt: new Date().toISOString(),
    };

    // Handle defined values (including null for clearing fields)
    Object.keys(videoData).forEach((key) => {
        const value = (videoData as any)[key];
        if (value !== undefined) {
            // If value is explicitly undefined, we want to remove the field
            updateData[key] = value;
        }
    });

    // For fields that are undefined, we need to explicitly remove them
    // This handles the case where scheduledDate or scheduledTime should be cleared
    const fieldsToCheck = [
        "scheduledDate",
        "scheduledTime",
        "url",
        "description",
    ];
    fieldsToCheck.forEach((field) => {
        if (
            videoData.hasOwnProperty(field) &&
            (videoData as any)[field] === undefined
        ) {
            // Set to null to remove the field in Firebase
            updateData[field] = null;
        }
    });

    await update(videoRef, updateData);

    // Update user stats if completion status changed
    if (wasCompleted !== willBeCompleted) {
        const statsRef = ref(database, `userData/${userId}/stats`);
        const statsSnapshot = await get(statsRef);

        if (statsSnapshot.exists()) {
            const stats = statsSnapshot.val();
            const watchedVideos =
                (stats.watchedVideos || 0) + (willBeCompleted ? 1 : -1);

            const updates: any = {
                watchedVideos: Math.max(0, watchedVideos),
            };

            // Update last study date and streak if marking as completed
            if (willBeCompleted) {
                const today = new Date().toISOString().split("T")[0];
                const lastStudyDate = stats.lastStudyDate
                    ? stats.lastStudyDate.split("T")[0]
                    : null;

                updates.lastStudyDate = new Date().toISOString();

                // Update streak
                if (lastStudyDate) {
                    const lastDate = new Date(lastStudyDate);
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayString = yesterday
                        .toISOString()
                        .split("T")[0];

                    if (lastStudyDate === today) {
                        // Already studied today, no streak update
                    } else if (lastStudyDate === yesterdayString) {
                        // Streak continues
                        updates.studyStreak = (stats.studyStreak || 0) + 1;
                    } else {
                        // Streak reset
                        updates.studyStreak = 1;
                    }
                } else {
                    // First study day
                    updates.studyStreak = 1;
                }
            }

            await update(statsRef, updates);
        }
    }

    // Return the updated video by getting it from the database
    const updatedSnapshot = await get(videoRef);
    return updatedSnapshot.val();
}

export interface UserPreferences {
    theme?: string;
    notifications?: boolean;
    customThemeColors?: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        foreground: string;
    };
}

// Get user preferences
export async function getUserPreferences(
    userId: string
): Promise<UserPreferences> {
    const prefsRef = ref(database, `userData/${userId}/preferences`);
    const snapshot = await get(prefsRef);

    if (!snapshot.exists()) {
        return {};
    }

    return snapshot.val();
}

// Update user preferences
export async function updateUserPreferences(
    userId: string,
    preferences: UserPreferences
): Promise<UserPreferences> {
    const prefsRef = ref(database, `userData/${userId}/preferences`);
    await set(prefsRef, preferences);
    return preferences;
}

// Upload background image (base64 string)
export async function uploadBackgroundImage(
    userId: string,
    imageDataUrl: string
): Promise<string> {
    // Deprecated: No longer used. Only localStorage is used for background images.
    if (typeof window !== "undefined") {
        localStorage.setItem("color-theme", "image-theme");
        localStorage.setItem(`backgroundImage-${userId}`, imageDataUrl || "");
    }
    return imageDataUrl;
}

// Delete background image
export async function deleteBackgroundImage(userId: string): Promise<void> {
    // Deprecated: No longer used. Only localStorage is used for background images.
    if (typeof window !== "undefined") {
        localStorage.removeItem(`backgroundImage-${userId}`);
    }
}

export async function deleteVideo(
    userId: string,
    videoId: string
): Promise<void> {
    const videoRef = ref(database, `userData/${userId}/videos/${videoId}`);
    const snapshot = await get(videoRef);

    if (!snapshot.exists()) {
        throw new Error("Video not found");
    }

    const video = snapshot.val();
    await remove(videoRef);

    // Update user stats
    const statsRef = ref(database, `userData/${userId}/stats`);
    const statsSnapshot = await get(statsRef);

    if (statsSnapshot.exists()) {
        const stats = statsSnapshot.val();
        const updates: any = {
            totalVideos: Math.max(0, (stats.totalVideos || 0) - 1),
        };

        if (video.completed) {
            updates.watchedVideos = Math.max(0, (stats.watchedVideos || 0) - 1);
        }

        await update(statsRef, updates);
    }
}

// Lecture management functions
export async function createLecture(
    userId: string,
    lectureData: Omit<Lecture, "id" | "completed" | "createdAt" | "updatedAt">
): Promise<Lecture> {
    // Verify subject exists
    const subjectRef = ref(
        database,
        `userData/${userId}/subjects/${lectureData.subjectId}`
    );
    const subjectSnapshot = await get(subjectRef);

    if (!subjectSnapshot.exists()) {
        throw new Error("Subject not found");
    }

    const timestamp = new Date().toISOString();
    const lectureRef = push(ref(database, `userData/${userId}/lectures`));

    const newLecture: Lecture = {
        id: lectureRef.key!,
        subjectId: lectureData.subjectId,
        chapterId: lectureData.chapterId,
        title: lectureData.title,
        url: lectureData.url,
        description: lectureData.description || "",
        scheduledDate: lectureData.scheduledDate,
        completed: false,
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    await set(lectureRef, newLecture);

    // Update user stats
    const statsRef = ref(database, `userData/${userId}/stats`);
    const statsSnapshot = await get(statsRef);

    if (statsSnapshot.exists()) {
        const stats = statsSnapshot.val();
        await update(statsRef, {
            totalLectures: (stats.totalLectures || 0) + 1,
        });
    }

    return newLecture;
}

export async function getLectures(
    userId: string,
    subjectId?: string
): Promise<Lecture[]> {
    const lecturesRef = ref(database, `userData/${userId}/lectures`);
    const snapshot = await get(lecturesRef);

    if (!snapshot.exists()) {
        return [];
    }

    const lecturesData = snapshot.val();
    const lectures = Object.values(lecturesData) as Lecture[];

    if (subjectId) {
        return lectures.filter((lecture) => lecture.subjectId === subjectId);
    }

    return lectures;
}

export async function getLecture(
    userId: string,
    lectureId: string
): Promise<Lecture | null> {
    const lectureRef = ref(
        database,
        `userData/${userId}/lectures/${lectureId}`
    );
    const snapshot = await get(lectureRef);

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.val();
}

export async function updateLecture(
    userId: string,
    lectureId: string,
    lectureData: Partial<Lecture>
): Promise<Lecture> {
    const lectureRef = ref(
        database,
        `userData/${userId}/lectures/${lectureId}`
    );
    const snapshot = await get(lectureRef);

    if (!snapshot.exists()) {
        throw new Error("Lecture not found");
    }

    const currentLecture = snapshot.val();
    const wasCompleted = currentLecture.completed;
    const willBeCompleted =
        lectureData.completed !== undefined
            ? lectureData.completed
            : wasCompleted;

    const updatedLecture = {
        ...currentLecture,
        ...lectureData,
        updatedAt: new Date().toISOString(),
    };

    await update(lectureRef, updatedLecture);

    // Update user stats if completion status changed
    if (wasCompleted !== willBeCompleted) {
        const statsRef = ref(database, `userData/${userId}/stats`);
        const statsSnapshot = await get(statsRef);

        if (statsSnapshot.exists()) {
            const stats = statsSnapshot.val();
            const watchedLectures =
                (stats.watchedLectures || 0) + (willBeCompleted ? 1 : -1);

            const updates: any = {
                watchedLectures: Math.max(0, watchedLectures),
            };

            // Update last study date and streak if marking as completed
            if (willBeCompleted) {
                const today = new Date().toISOString().split("T")[0];
                const lastStudyDate = stats.lastStudyDate
                    ? stats.lastStudyDate.split("T")[0]
                    : null;

                updates.lastStudyDate = new Date().toISOString();

                // Update streak
                if (lastStudyDate) {
                    const lastDate = new Date(lastStudyDate);
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayString = yesterday
                        .toISOString()
                        .split("T")[0];

                    if (lastStudyDate === today) {
                        // Already studied today, no streak update
                    } else if (lastStudyDate === yesterdayString) {
                        // Streak continues
                        updates.studyStreak = (stats.studyStreak || 0) + 1;
                    } else {
                        // Streak reset
                        updates.studyStreak = 1;
                    }
                } else {
                    // First study day
                    updates.studyStreak = 1;
                }
            }

            await update(statsRef, updates);
        }
    }

    return updatedLecture;
}

export async function deleteLecture(
    userId: string,
    lectureId: string
): Promise<void> {
    const lectureRef = ref(
        database,
        `userData/${userId}/lectures/${lectureId}`
    );
    const snapshot = await get(lectureRef);

    if (!snapshot.exists()) {
        throw new Error("Lecture not found");
    }

    const lecture = snapshot.val();
    await remove(lectureRef);

    // Update user stats
    const statsRef = ref(database, `userData/${userId}/stats`);
    const statsSnapshot = await get(statsRef);

    if (statsSnapshot.exists()) {
        const stats = statsSnapshot.val();
        const updates: any = {
            totalLectures: Math.max(0, (stats.totalLectures || 0) - 1),
        };

        if (lecture.completed) {
            updates.watchedLectures = Math.max(
                0,
                (stats.watchedLectures || 0) - 1
            );
        }

        await update(statsRef, updates);
    }
}

export function subscribeToLectures(
    userId: string,
    subjectId: string | null,
    callback: (lectures: Lecture[]) => void
): () => void {
    const lecturesRef = ref(database, `userData/${userId}/lectures`);

    onValue(lecturesRef, (snapshot) => {
        if (snapshot.exists()) {
            let lectures = Object.values(snapshot.val()) as Lecture[];

            if (subjectId) {
                lectures = lectures.filter(
                    (lecture) => lecture.subjectId === subjectId
                );
            }

            callback(lectures);
        } else {
            callback([]);
        }
    });

    return () => off(lecturesRef);
}

// Task management functions
export async function createTask(
    userId: string,
    taskData: { title: string; dueDate: string }
): Promise<Task> {
    const timestamp = new Date().toISOString();
    const taskRef = push(ref(database, `userData/${userId}/tasks`));

    const newTask: Task = {
        id: taskRef.key!,
        title: taskData.title,
        dueDate: taskData.dueDate,
        completed: false,
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    await set(taskRef, newTask);
    return newTask;
}

export async function getTasks(
    userId: string,
    dueDate?: string
): Promise<Task[]> {
    const tasksRef = ref(database, `userData/${userId}/tasks`);
    const snapshot = await get(tasksRef);

    if (!snapshot.exists()) {
        return [];
    }

    const tasksData = snapshot.val();
    const tasks = Object.values(tasksData) as Task[];

    if (dueDate) {
        return tasks.filter((task) => task.dueDate === dueDate);
    }

    return tasks;
}

export async function getTask(
    userId: string,
    taskId: string
): Promise<Task | null> {
    const taskRef = ref(database, `userData/${userId}/tasks/${taskId}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.val();
}

export async function updateTask(
    userId: string,
    taskId: string,
    taskData: Partial<Task>
): Promise<Task> {
    const taskRef = ref(database, `userData/${userId}/tasks/${taskId}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) {
        throw new Error("Task not found");
    }

    const currentTask = snapshot.val();
    const updatedTask = {
        ...currentTask,
        ...taskData,
        updatedAt: new Date().toISOString(),
    };

    await update(taskRef, updatedTask);
    return updatedTask;
}

export async function deleteTask(
    userId: string,
    taskId: string
): Promise<void> {
    const taskRef = ref(database, `userData/${userId}/tasks/${taskId}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) {
        throw new Error("Task not found");
    }

    await remove(taskRef);
}

// Stats and analytics functions
export async function getUserStats(userId: string): Promise<UserStats> {
    const statsRef = ref(database, `userData/${userId}/stats`);
    const snapshot = await get(statsRef);

    if (!snapshot.exists()) {
        const defaultStats: UserStats = {
            totalVideos: 0,
            watchedVideos: 0,
            totalLectures: 0,
            watchedLectures: 0,
            totalSubjects: 0,
            studyStreak: 0,
            lastStudyDate: new Date().toISOString(),
        };

        await set(statsRef, defaultStats);
        return defaultStats;
    }

    return snapshot.val();
}

// Setup subscription for real-time updates
export function subscribeToUserData(
    userId: string,
    callback: (data: any) => void
): () => void {
    const userDataRef = ref(database, `userData/${userId}`);

    onValue(userDataRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        } else {
            callback(null);
        }
    });

    // Return unsubscribe function
    return () => off(userDataRef);
}

export function subscribeToSubjects(
    userId: string,
    callback: (subjects: Subject[]) => void
): () => void {
    const subjectsRef = ref(database, `userData/${userId}/subjects`);

    onValue(subjectsRef, (snapshot) => {
        if (snapshot.exists()) {
            const subjects = Object.values(snapshot.val()) as Subject[];
            callback(subjects);
        } else {
            callback([]);
        }
    });

    return () => off(subjectsRef);
}

export function subscribeToVideos(
    userId: string,
    subjectId: string | null,
    callback: (videos: Video[]) => void
): () => void {
    const videosRef = ref(database, `userData/${userId}/videos`);

    onValue(videosRef, (snapshot) => {
        if (snapshot.exists()) {
            let videos = Object.values(snapshot.val()) as Video[];

            if (subjectId) {
                videos = videos.filter(
                    (video) => video.subjectId === subjectId
                );
            }

            callback(videos);
        } else {
            callback([]);
        }
    });

    return () => off(videosRef);
}

export function subscribeToTasks(
    userId: string,
    callback: (tasks: Task[]) => void
): () => void {
    const tasksRef = ref(database, `userData/${userId}/tasks`);

    onValue(tasksRef, (snapshot) => {
        if (snapshot.exists()) {
            const tasks = Object.values(snapshot.val()) as Task[];
            callback(tasks);
        } else {
            callback([]);
        }
    });

    return () => off(tasksRef);
}
