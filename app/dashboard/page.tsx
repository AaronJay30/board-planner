"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    BookOpen,
    Clock,
    CheckCircle,
    Target,
    TrendingUp,
    Calendar,
} from "lucide-react";
import { DailyQuote } from "@/components/daily-quote";

import { useEffect, useState } from "react";
import {
    getSubjects,
    getVideos,
    getUserStats,
    getStudyTime,
    getTasks,
} from "@/lib/firebase-utils";
import { ChartContainer } from "@/components/ui/chart";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
} from "recharts";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
    const { userData } = useAuth();
    const [subjects, setSubjects] = useState<any[]>([]);
    const [subjectProgress, setSubjectProgress] = useState<
        Record<string, number>
    >({});
    const [loadingSubjects, setLoadingSubjects] = useState(true);

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

    const [userStats, setUserStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [studyHoursThisWeek, setStudyHoursThisWeek] = useState<number | null>(
        null
    );
    const [lastWeekStudyHours, setLastWeekStudyHours] = useState<number | null>(
        null
    );
    const [loadingStudyHours, setLoadingStudyHours] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!userData?.id) return;
            setLoadingStats(true);
            try {
                const stats = await getUserStats(userData.id);
                setUserStats(stats);
            } catch (e) {
                setUserStats(null);
            }
            setLoadingStats(false);
        };
        fetchStats();
    }, [userData]);

    useEffect(() => {
        const fetchStudyHours = async () => {
            if (!userData?.id) return;
            setLoadingStudyHours(true);
            try {
                const today = new Date();
                // This week
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                let totalSeconds = 0;
                for (let i = 0; i <= today.getDay(); i++) {
                    const d = new Date(startOfWeek);
                    d.setDate(startOfWeek.getDate() + i);
                    const dateStr = d.toISOString().split("T")[0];
                    const data = await getStudyTime(userData.id, dateStr);
                    totalSeconds += data?.study?.seconds || 0;
                }
                setStudyHoursThisWeek(Number((totalSeconds / 3600).toFixed(2)));

                // Last week
                const lastWeekStart = new Date(startOfWeek);
                lastWeekStart.setDate(startOfWeek.getDate() - 7);
                let lastWeekSeconds = 0;
                for (let i = 0; i < 7; i++) {
                    const d = new Date(lastWeekStart);
                    d.setDate(lastWeekStart.getDate() + i);
                    const dateStr = d.toISOString().split("T")[0];
                    const data = await getStudyTime(userData.id, dateStr);
                    lastWeekSeconds += data?.study?.seconds || 0;
                }
                setLastWeekStudyHours(
                    Number((lastWeekSeconds / 3600).toFixed(2))
                );
            } catch {
                setStudyHoursThisWeek(null);
                setLastWeekStudyHours(null);
            }
            setLoadingStudyHours(false);
        };
        fetchStudyHours();
    }, [userData]);

    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [loadingActivity, setLoadingActivity] = useState(true);

    // Study/Break line chart state
    const [weekChartData, setWeekChartData] = useState<any[]>([]);
    const [loadingChart, setLoadingChart] = useState(true);

    useEffect(() => {
        const fetchWeekChartData = async () => {
            if (!userData?.id) return;
            setLoadingChart(true);
            try {
                const today = new Date();
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                const dataArr = [];
                for (let i = 0; i <= today.getDay(); i++) {
                    const d = new Date(startOfWeek);
                    d.setDate(startOfWeek.getDate() + i);
                    const dateStr = d.toISOString().split("T")[0];
                    const data = await getStudyTime(userData.id, dateStr);
                    dataArr.push({
                        day: d.toLocaleDateString("en-US", {
                            weekday: "short",
                        }),
                        study: Math.round((data?.study?.seconds || 0) / 60),
                        break: Math.round((data?.break?.seconds || 0) / 60),
                    });
                }
                setWeekChartData(dataArr);
            } catch {
                setWeekChartData([]);
            }
            setLoadingChart(false);
        };
        fetchWeekChartData();
    }, [userData]);

    useEffect(() => {
        const fetchRecentActivity = async () => {
            if (!userData?.id) return;
            setLoadingActivity(true);
            try {
                // Fetch all subjects
                const subjects = await getSubjects(userData.id);
                // Fetch all completed videos for each subject
                let allVideos: any[] = [];
                for (const subject of subjects) {
                    const videos = await getVideos(userData.id, subject.id);
                    const completedVideos = videos
                        .filter((v: any) => v.completed)
                        .map((v: any) => ({
                            type: "video",
                            title: v.title,
                            subject: subject.name,
                            completedAt:
                                v.updatedAt || v.completedAt || v.createdAt,
                        }));
                    allVideos = allVideos.concat(completedVideos);
                }
                // Fetch all completed tasks
                const allTasks = await getTasks(userData.id);
                const completedTasks = allTasks
                    .filter((t: any) => t.completed)
                    .map((t: any) => ({
                        type: "task",
                        title: t.title,
                        subject: t.subject || "Task",
                        completedAt:
                            t.updatedAt || t.completedAt || t.createdAt,
                    }));
                // Combine and sort by completedAt desc
                const combined = [...allVideos, ...completedTasks].sort(
                    (a, b) => {
                        return (
                            new Date(b.completedAt).getTime() -
                            new Date(a.completedAt).getTime()
                        );
                    }
                );
                setRecentActivity(combined.slice(0, 10));
            } catch {
                setRecentActivity([]);
            }
            setLoadingActivity(false);
        };
        fetchRecentActivity();
    }, [userData]);

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base">
                        Track your progress and stay motivated
                    </p>
                </div>
                <Badge
                    variant="secondary"
                    className="text-xs sm:text-sm self-start sm:self-auto py-1.5 px-2.5"
                >
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                    })}
                </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Videos Watched */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Videos Watched
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loadingStats || !userStats
                                ? "--"
                                : userStats.watchedVideos}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {loadingStats || !userStats
                                ? "Out of -- total videos"
                                : `Out of ${userStats.totalVideos} total videos`}
                        </p>
                    </CardContent>
                </Card>
                {/* Other stats remain mock for now */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Study Hours This Week
                        </CardTitle>
                        <Clock className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loadingStudyHours || studyHoursThisWeek === null
                                ? "--"
                                : studyHoursThisWeek}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {loadingStudyHours ||
                            studyHoursThisWeek === null ||
                            lastWeekStudyHours === null
                                ? ""
                                : (() => {
                                      if (lastWeekStudyHours === 0) {
                                          return studyHoursThisWeek > 0
                                              ? "+100% from last week"
                                              : "0% from last week";
                                      }
                                      const percent =
                                          ((studyHoursThisWeek -
                                              lastWeekStudyHours) /
                                              lastWeekStudyHours) *
                                          100;
                                      const sign = percent > 0 ? "+" : "";
                                      return `${sign}${percent.toFixed(
                                          0
                                      )}% from last week`;
                                  })()}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Current Streak
                        </CardTitle>
                        <Target className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loadingStats || !userStats
                                ? "--"
                                : `${userStats.studyStreak} days`}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Keep it up!
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Overall Progress
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loadingSubjects || subjects.length === 0
                                ? "--"
                                : (() => {
                                      const values =
                                          Object.values(subjectProgress);
                                      if (values.length === 0) return "0%";
                                      const avg =
                                          values.reduce((a, b) => a + b, 0) /
                                          values.length;
                                      return `${Math.round(avg)}%`;
                                  })()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            On track for exam
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Study/Break Line Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Study & Break Time This Week</CardTitle>
                    <CardDescription>Minutes per day</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingChart ? (
                        <div className="text-muted-foreground text-sm">
                            Loading chart...
                        </div>
                    ) : weekChartData.length === 0 ? (
                        <div className="text-muted-foreground text-sm">
                            No data for this week.
                        </div>
                    ) : (
                        <ChartContainer
                            config={{
                                study: { label: "Study", color: "#4f46e5" },
                                break: { label: "Break", color: "#f59e42" },
                            }}
                            style={{ width: "100%", height: 260 }}
                        >
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart
                                    data={weekChartData}
                                    margin={{
                                        top: 10,
                                        right: 20,
                                        left: 0,
                                        bottom: 0,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="study"
                                        stroke="#4f46e5"
                                        strokeWidth={2}
                                        dot={true}
                                        name="Study"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="break"
                                        stroke="#f59e42"
                                        strokeWidth={2}
                                        dot={true}
                                        name="Break"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Subject Progress (real data) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Subject Progress</CardTitle>
                        <CardDescription>
                            Your completion rate across all subjects
                        </CardDescription>
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
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">
                                                {subject.name}
                                            </span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {subjectProgress[subject.id] ?? 0}%
                                        </span>
                                    </div>
                                    <Progress
                                        value={subjectProgress[subject.id] ?? 0}
                                        className="h-2"
                                    />
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>
                            Your latest study sessions
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {loadingActivity ? (
                                <div className="text-muted-foreground text-sm">
                                    Loading...
                                </div>
                            ) : recentActivity.length === 0 ? (
                                <div className="text-muted-foreground text-sm">
                                    No recent activity found.
                                </div>
                            ) : (
                                recentActivity.map((activity, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center space-x-4"
                                    >
                                        <div
                                            className={`w-2 h-2 rounded-full ${
                                                activity.type === "video"
                                                    ? "bg-green-500"
                                                    : "bg-blue-500"
                                            }`}
                                        />
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {activity.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {activity.subject}
                                            </p>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {activity.completedAt
                                                ? new Date(
                                                      activity.completedAt
                                                  ).toLocaleString("en-US", {
                                                      month: "short",
                                                      day: "numeric",
                                                      hour: "2-digit",
                                                      minute: "2-digit",
                                                  })
                                                : ""}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Motivational Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Daily Motivation</CardTitle>
                </CardHeader>
                <CardContent>
                    <DailyQuote />
                </CardContent>
            </Card>
        </div>
    );
}
