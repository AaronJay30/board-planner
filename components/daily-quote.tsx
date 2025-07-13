"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Quote, RefreshCw } from "lucide-react";

// Interface for the API response
interface QuoteResponse {
    content: string;
    author: string;
    authorSlug?: string;
    length?: number;
}

interface QuoteData {
    content: string;
    author: string;
    timestamp?: number;
}

export function DailyQuote() {
    const [quote, setQuote] = useState<QuoteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchQuote = async (forceRefresh = false) => {
        try {
            if (!forceRefresh) {
                setLoading(true);
            } else {
                setRefreshing(true);
            }

            // Check if we have a cached quote that's still valid (less than 24 hours old)
            if (!forceRefresh) {
                const cachedQuote = localStorage.getItem("daily-quote");
                if (cachedQuote) {
                    const parsedQuote = JSON.parse(cachedQuote) as QuoteData;
                    const now = Date.now();
                    const quoteTtl = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

                    // If the quote is less than 24 hours old, use it
                    if (
                        parsedQuote.timestamp &&
                        now - parsedQuote.timestamp < quoteTtl
                    ) {
                        setQuote(parsedQuote);
                        setLoading(false);
                        return;
                    }
                }
            }

            // Fetch a new quote from the RealInspire API
            const response = await fetch(
                "https://api.realinspire.live/v1/quotes/random"
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch quote: ${response.status}`);
            }

            // The API returns an array with a single quote object
            const data = await response.json();
            // Check if data is an array and get the first item
            const quoteData = Array.isArray(data) ? data[0] : data;

            const newQuote: QuoteData = {
                // Map fields based on the sample response
                content: quoteData.content,
                author: quoteData.author || "Unknown",
                timestamp: Date.now(),
            };

            // Save to localStorage with timestamp
            localStorage.setItem("daily-quote", JSON.stringify(newQuote));

            setQuote(newQuote);
            setLoading(false);
            setRefreshing(false);
        } catch (err) {
            console.error("Error fetching quote:", err);
            setError("Failed to fetch quote. Please try again later.");
            setLoading(false);
            setRefreshing(false);

            // Try to use any cached quote even if it's old
            const cachedQuote = localStorage.getItem("daily-quote");
            if (cachedQuote) {
                setQuote(JSON.parse(cachedQuote));
            }
        }
    };

    // Refresh quote on button click
    const handleRefresh = () => {
        fetchQuote(true);
    };

    useEffect(() => {
        fetchQuote();
    }, []);

    if (loading) {
        return (
            <Card className="w-full bg-muted/20 animate-pulse">
                <CardContent className="p-4 flex flex-col items-center space-y-2">
                    <div className="h-4 w-full bg-muted rounded"></div>
                    <div className="h-4 w-3/4 bg-muted rounded"></div>
                    <div className="h-3 w-1/3 bg-muted rounded mt-2"></div>
                </CardContent>
            </Card>
        );
    }

    if (error && !quote) {
        return (
            <Card className="w-full">
                <CardContent className="p-4 text-sm text-muted-foreground">
                    {error}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full bg-muted/10 border-muted transition-colors hover:bg-muted/20">
            <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-start">
                        <Quote className="h-4 w-4 mr-2 text-primary shrink-0 mt-1" />
                        <p className="text-sm sm:text-base italic">
                            {quote?.content}
                        </p>
                    </div>
                    <div className="flex justify-between items-center">
                        {quote?.author && (
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                — {quote.author}
                            </p>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="h-8 w-8 p-0"
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${
                                    refreshing ? "animate-spin" : ""
                                }`}
                            />
                            <span className="sr-only">Refresh quote</span>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
