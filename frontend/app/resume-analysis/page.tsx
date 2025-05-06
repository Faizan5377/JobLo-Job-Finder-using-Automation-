// frontend/app/(dashboard)/resume-analysis/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle, FileText, XCircle, Loader2, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/dashboard-layout"; // Adjust path if needed
import { ResumeScoreChart } from "@/components/resume-score-chart"; // Adjust path if needed
import { useAuth } from "@/components/auth-provider"; // Adjust path if needed
import { useToast } from "@/components/ui/use-toast";

// --- Types (Ensure these match your AuthProvider definitions) ---
interface ResumeAnalysisResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: {
    format: string[];
    skills: string[];
    experience: string[];
    education: string[];
  };
  sectionFeedback: {
    format: { score: number; feedback: string };
    skills: { score: number; feedback: string };
    experience: { score: number; feedback: string };
    education: { score: number; feedback: string };
  };
}

interface ResumeSuggestion {
    id: string; // UUID
    resume_id: string;
    user_id: string;
    created_at: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    suggestion_data: ResumeAnalysisResult | { error?: string; message?: string };
}

type AnalysisStatus = 'idle' | 'checking_resume' | 'no_resume' | 'ready_to_analyze' | 'starting_analysis' | 'processing' | 'completed' | 'error';

// --- ResumeAnalysisPage Component ---
export default function ResumeAnalysisPage() {
  const { getResume, requestResumeAnalysis, getResumeAnalysis, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  // Component State
  const [resumeExists, setResumeExists] = useState<boolean | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [currentSuggestion, setCurrentSuggestion] = useState<ResumeSuggestion | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true); // To prevent state updates on unmounted component

  // --- Lifecycle and Cleanup ---
  useEffect(() => {
     isMounted.current = true;
     return () => { // Cleanup on unmount
        isMounted.current = false;
        stopPolling();
     };
  }, []); // Empty dependency array means run once on mount, return on unmount

  // --- Polling Logic ---
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
       console.log("ResumeAnalysisPage: Polling stopped.");
    }
  }, []);

  const pollAnalysisStatus = useCallback(async (suggestionId: string) => {
    if (!isMounted.current) return; // Check if component is still mounted
    console.log(`ResumeAnalysisPage: Polling for suggestion ID: ${suggestionId}`);
    try {
      const updatedSuggestion = await getResumeAnalysis(suggestionId);
      if (!isMounted.current) return; // Check again after async operation

      setCurrentSuggestion(updatedSuggestion); // Update full suggestion state

      if (updatedSuggestion.status === 'completed') {
        setAnalysisStatus('completed');
        const resultData = updatedSuggestion.suggestion_data as ResumeAnalysisResult; // Type assertion
        // Validate if the resultData actually contains the expected 'score' property
        if (resultData && typeof resultData.score === 'number') {
            setAnalysisResult(resultData);
        } else {
            console.error("ResumeAnalysisPage: Analysis 'completed' but result data is invalid or missing 'score'.", resultData);
            setAnalysisStatus('error');
            setErrorMessage("Analysis completed, but the received data was not in the expected format.");
            setAnalysisResult(null); // Clear any partial/invalid results
        }
        setErrorMessage(null); // Clear any previous error messages
        stopPolling();
        toast({ title: "Analysis Complete", description: "Your resume analysis is ready." });

      } else if (updatedSuggestion.status === 'error') {
        setAnalysisStatus('error');
        const errorMsg = (updatedSuggestion.suggestion_data as { error?: string })?.error || "Analysis process failed.";
        setErrorMessage(errorMsg);
        setAnalysisResult(null); // Clear previous results on error
        stopPolling();
        toast({ variant: "destructive", title: "Analysis Failed", description: errorMsg });

      } else if (updatedSuggestion.status === 'processing') {
        setAnalysisStatus('processing'); // Keep polling

      } else { // Handle unexpected status from polling
           console.warn("ResumeAnalysisPage: Polling encountered unexpected status:", updatedSuggestion.status);
           setAnalysisStatus('error');
           setErrorMessage(`Analysis process in an unexpected state: ${updatedSuggestion.status}`);
           stopPolling();
      }
    } catch (error) {
      if (!isMounted.current) return;
      console.error(`ResumeAnalysisPage: Error during polling for ${suggestionId}:`, error);
      setAnalysisStatus('error');
      setErrorMessage(error instanceof Error ? error.message : "Could not check analysis status.");
      stopPolling();
      // Optionally toast here, but the error state will already display a message
      // toast({ variant: "destructive", title: "Polling Error", description: "Could not get analysis update." });
    }
  }, [getResumeAnalysis, toast, stopPolling]); // Dependencies for useCallback

  const startPolling = useCallback((suggestionId: string) => {
    stopPolling(); // Ensure no multiple intervals
    pollAnalysisStatus(suggestionId); // Initial immediate check
    pollingIntervalRef.current = setInterval(() => pollAnalysisStatus(suggestionId), 5000); // Poll every 5s
  }, [pollAnalysisStatus, stopPolling]);

  // --- Resume Existence Check ---
  const checkResumeExists = useCallback(async () => {
    if (!isMounted.current) return;
    console.log("ResumeAnalysisPage: Checking resume existence...");
    setAnalysisStatus('checking_resume');
    setErrorMessage(null);
    setAnalysisResult(null); // Clear any previous analysis results
    setCurrentSuggestion(null); // Clear previous suggestion state

    try {
      const resume = await getResume(); // From AuthContext
      if (!isMounted.current) return;

      if (resume) {
        setResumeExists(true);
        setAnalysisStatus('ready_to_analyze');
        console.log("ResumeAnalysisPage: Resume exists.");
        // Optional: You could try to fetch the latest *completed* suggestion here
        // to show previous results immediately if the user navigates back.
      } else {
        setResumeExists(false);
        setAnalysisStatus('no_resume');
        console.log("ResumeAnalysisPage: No resume found.");
      }
    } catch (error) {
      if (!isMounted.current) return;
      console.error("ResumeAnalysisPage: Error checking resume existence:", error);
      setAnalysisStatus('error');
      setErrorMessage(error instanceof Error ? error.message : "Failed to check for an existing resume.");
      setResumeExists(false); // Assume no resume on error for simplicity
    }
  }, [getResume]); // Dependency for useCallback

  // Effect for initial resume check when component mounts or auth status changes
  useEffect(() => {
    if (!isAuthLoading && analysisStatus === 'idle') { // Only if auth is loaded and we are in initial idle state
      checkResumeExists();
    }
  }, [isAuthLoading, analysisStatus, checkResumeExists]);

  // --- Handle "Analyze Resume" Button Click ---
  const handleAnalyzeResume = async () => {
    // Prevent action if already processing or starting
    if (analysisStatus === 'processing' || analysisStatus === 'starting_analysis') return;

    console.log("ResumeAnalysisPage: 'Analyze Resume' button clicked.");
    setAnalysisStatus('starting_analysis');
    setErrorMessage(null);
    setCurrentSuggestion(null); // Clear previous suggestion
    setAnalysisResult(null);   // Clear previous results

    try {
      const initialSuggestion = await requestResumeAnalysis(); // From AuthContext
      if (!isMounted.current) return;

      setCurrentSuggestion(initialSuggestion);

      if (initialSuggestion.status === 'processing') {
        setAnalysisStatus('processing');
        startPolling(initialSuggestion.id);
        console.log("ResumeAnalysisPage: Analysis request successful, now polling ID:", initialSuggestion.id);
      } else if (initialSuggestion.status === 'completed') {
        // Rare case: Analysis might complete extremely fast or was already done
        setAnalysisStatus('completed');
        setAnalysisResult(initialSuggestion.suggestion_data as ResumeAnalysisResult);
        setErrorMessage(null);
        stopPolling();
        toast({ title: "Analysis Complete", description: "Resume analysis is ready." });
      } else {
        // Backend returned an unexpected initial status (e.g., 'error' right away)
        console.warn("ResumeAnalysisPage: Analysis request returned unexpected initial status:", initialSuggestion.status, initialSuggestion.suggestion_data);
        setAnalysisStatus('error');
        const errorMsg = (initialSuggestion.suggestion_data as { error?: string })?.error || "Failed to start the analysis process correctly.";
        setErrorMessage(errorMsg);
        stopPolling(); // Ensure polling is stopped
      }
    } catch (error) {
      if (!isMounted.current) return;
      console.error("ResumeAnalysisPage: Error requesting resume analysis:", error);
      setAnalysisStatus('error');
      setErrorMessage(error instanceof Error ? error.message : "Could not start the resume analysis.");
      stopPolling(); // Ensure polling is stopped on error
    }
  };

  // --- Render Logic ---
  const renderContent = () => {
    switch (analysisStatus) {
      case 'idle':
      case 'checking_resume':
        return ( <Card><CardHeader><CardTitle>Resume Analysis</CardTitle><CardDescription>Checking for your resume...</CardDescription></CardHeader><CardContent className="flex items-center justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /> <span className="ml-2 text-muted-foreground">Loading...</span></CardContent></Card> );
      case 'no_resume':
        return ( <> <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>No Resume Found</AlertTitle><AlertDescription>Please upload a resume on your profile page before analysis.</AlertDescription></Alert><Link href="/profile"><Button className="mt-4"><FileText className="mr-2 h-4 w-4" /> Go to Profile to Upload</Button></Link> </> );
      case 'ready_to_analyze':
        return ( <Card><CardHeader><CardTitle>Analyze Your Resume</CardTitle><CardDescription>Get AI-powered feedback and suggestions to improve your resume.</CardDescription></CardHeader><CardContent><Button onClick={handleAnalyzeResume} size="lg">Analyze Resume</Button></CardContent></Card> );
      case 'starting_analysis':
        return ( <Card><CardHeader><CardTitle>Starting Analysis</CardTitle><CardDescription>Please wait while we prepare your resume for analysis...</CardDescription></CardHeader><CardContent className="flex items-center justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="ml-2 text-muted-foreground">Initializing...</span></CardContent></Card> );
      case 'processing':
        return ( <Card><CardHeader><CardTitle>Analyzing Your Resume</CardTitle><CardDescription>This may take a few moments. Please wait...</CardDescription></CardHeader><CardContent className="flex flex-col items-center justify-center space-y-4 p-6"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-muted-foreground">AI is working its magic...</p><Skeleton className="h-4 w-3/4 mt-2" /><Skeleton className="h-4 w-1/2 mt-1" /></CardContent></Card> );
      case 'error':
          return ( <> <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Analysis Error</AlertTitle><AlertDescription>{errorMessage || "An unknown error occurred during the analysis."}</AlertDescription></Alert><div className="mt-4 flex gap-2"><Button onClick={checkResumeExists} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Check Resume Status</Button>{resumeExists && ( <Button onClick={handleAnalyzeResume}>Retry Analysis</Button> )}</div> </> );
      case 'completed':
        if (!analysisResult) {
             // This should ideally be caught by the pollAnalysisStatus logic, but as a fallback:
             return ( <> <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Data Display Error</AlertTitle><AlertDescription>Analysis completed, but there was an issue displaying the results.</AlertDescription></Alert><Button onClick={handleAnalyzeResume} variant="outline" className="mt-4"><RefreshCw className="mr-2 h-4 w-4" /> Re-analyze Resume</Button> </>);
        }
        const analysis = analysisResult; // Alias for readability
        return (
          <div className="space-y-6">
             <div className="flex justify-end"><Button onClick={handleAnalyzeResume} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Re-analyze Resume</Button></div>
             {/* Resume Score Card */}
             <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Resume Score</CardTitle><CardDescription>Overall score based on format, content, and relevance</CardDescription></CardHeader>
                    <CardContent className="flex flex-col items-center justify-center">
                        <ResumeScoreChart score={analysis.score} />
                        <div className="mt-4 text-center"><p className="text-lg font-medium">{analysis.score < 5 ? "Needs Improvement" : analysis.score < 8 ? "Good" : "Excellent"}</p><p className="text-sm text-muted-foreground">{analysis.score < 5 ? "Your resume needs significant improvements." : analysis.score < 8 ? "Your resume is good but could be improved." : "Your resume is excellent and competitive."}</p></div>
                    </CardContent>
                </Card>
                {/* Section Scores Card */}
                 <Card>
                    <CardHeader><CardTitle>Section Scores</CardTitle><CardDescription>Breakdown of scores by resume section</CardDescription></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analysis.sectionFeedback && Object.keys(analysis.sectionFeedback).length > 0 ? (
                                Object.entries(analysis.sectionFeedback).map(([section, data]) => (
                                <div key={section} className="space-y-2">
                                    <div className="flex items-center justify-between"><p className="text-sm font-medium capitalize">{section}</p><p className="text-sm font-medium">{typeof data?.score === 'number' ? `${data.score}/10` : 'N/A'}</p></div>
                                    <div className="h-2 w-full rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${typeof data?.score === 'number' ? Math.max(0, Math.min(100, data.score * 10)) : 0}%` }} /></div> {/* Added min/max for width */}
                                    <p className="text-xs text-muted-foreground">{data?.feedback || "No specific feedback for this section."}</p>
                                </div>
                                ))
                             ) : ( <p className="text-sm text-muted-foreground">Section-specific feedback is not available.</p> )}
                        </div>
                    </CardContent>
                 </Card>
             </div>
             {/* Strengths / Weaknesses Cards */}
             <div className="grid gap-6 md:grid-cols-2">
                 <Card>
                     <CardHeader><CardTitle className="flex items-center"><CheckCircle className="mr-2 h-5 w-5 text-green-500" /> Strengths</CardTitle><CardDescription>What your resume does well</CardDescription></CardHeader>
                     <CardContent>{(analysis.strengths && analysis.strengths.length > 0) ? <ul className="ml-6 list-disc space-y-2">{analysis.strengths.map((strength, index) => <li key={`strength-${index}`} className="text-sm">{strength}</li>)}</ul> : <p className="text-sm text-muted-foreground">No specific strengths were identified.</p>}</CardContent>
                 </Card>
                 <Card>
                     <CardHeader><CardTitle className="flex items-center"><XCircle className="mr-2 h-5 w-5 text-destructive" /> Weaknesses</CardTitle><CardDescription>Areas that need improvement</CardDescription></CardHeader>
                     <CardContent>{(analysis.weaknesses && analysis.weaknesses.length > 0) ? <ul className="ml-6 list-disc space-y-2">{analysis.weaknesses.map((weakness, index) => <li key={`weakness-${index}`} className="text-sm">{weakness}</li>)}</ul> : <p className="text-sm text-muted-foreground">No specific weaknesses were identified.</p>}</CardContent>
                 </Card>
             </div>
             {/* Improvement Suggestions Card */}
             <Card>
                 <CardHeader><CardTitle>Improvement Suggestions</CardTitle><CardDescription>Detailed recommendations to enhance your resume</CardDescription></CardHeader>
                 <CardContent>
                     {analysis.suggestions && Object.keys(analysis.suggestions).length > 0 ? (
                         <Tabs defaultValue={Object.keys(analysis.suggestions)[0] || 'format'} className="w-full">
                             <TabsList className={`grid w-full grid-cols-${Math.min(4, Object.keys(analysis.suggestions).length || 1)}`}> {/* Cap at 4 cols */}
                                 {Object.keys(analysis.suggestions).map((key) => (<TabsTrigger key={key} value={key} className="capitalize">{key}</TabsTrigger>))}
                             </TabsList>
                             {Object.entries(analysis.suggestions).map(([key, suggestionsList]) => (
                                 <TabsContent key={key} value={key} className="mt-4">{(suggestionsList && suggestionsList.length > 0) ? <ul className="ml-6 list-disc space-y-2">{suggestionsList.map((suggestion, index) => <li key={`${key}-suggestion-${index}`} className="text-sm">{suggestion}</li>)}</ul> : <p className="text-sm text-muted-foreground">No specific suggestions for {key}.</p>}</TabsContent>
                             ))}
                         </Tabs>
                     ) : ( <p className="text-sm text-muted-foreground">No improvement suggestions are available at this time.</p> )}
                 </CardContent>
             </Card>
          </div>
        );
      default: // Fallback for any unhandled state
        return <div className="p-4 text-center text-red-500">An unexpected UI state occurred. Please refresh.</div>;
    }
  };

  // --- Main Page Render ---
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resume Analysis</h1>
          <p className="text-muted-foreground">Get AI-powered feedback on your resume</p>
        </div>
        {renderContent()}
      </div>
    </DashboardLayout>
  );
}