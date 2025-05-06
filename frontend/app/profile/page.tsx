"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/components/auth-provider";
import { FileUploader } from "@/components/file-uploader";
import { Loader2, Eye, Trash2, RefreshCw } from "lucide-react"; // Import icons
import { format } from 'date-fns'; // For date formatting
import { useToast } from "@/components/ui/use-toast"; // Import useToast
// Add these lines at the top with other imports
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components
import { AlertCircle, CheckCircle /* Add any other icons used here */ } from "lucide-react"; // Import required icons
import { Label } from "@/components/ui/label"; // <-- Add this line

// Define Resume type matching AuthProvider
type Resume = {
  id: string;
  file: string;
  file_url: string;
  uploaded_at: string;
  updated_at: string;
};

// Define the possible states for resume management within this component
type ResumeState = 'initial' | 'loading' | 'loaded' | 'none' | 'error' | 'deleted';

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z
    .string()
    .email({
      message: "Please enter a valid email address.",
    })
    .optional(), // Email is likely read-only from context
  phone_number: z
    .string()
    .refine(
      (val) => {
        if (!val) return true; // Allow empty string
        const pakistaniFormat1 = /^03[0-9]{9}$/;
        const pakistaniFormat2 = /^\+92[0-9]{10}$/;
        return pakistaniFormat1.test(val) || pakistaniFormat2.test(val);
      },
      {
        message: "Use format 03xxxxxxxxx or +92xxxxxxxxxx",
      }
    )
    .optional()
    .or(z.literal('')), // Explicitly allow empty string after optional
});

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, {
      message: "Current password is required.",
    }),
    newPassword: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"], // Apply error to confirmPassword field
  });

// --- Profile Page Component ---
export default function ProfilePage() {
  const {
      user,
      updateProfile,
      changePassword,
      uploadResume,
      getResume,
      deleteResume,
      isLoading: isAuthLoading, // Use auth loading state for initial checks
  } = useAuth();
  const { toast } = useToast();

  // Component-specific state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentResume, setCurrentResume] = useState<Resume | null>(null);
  const [resumeState, setResumeState] = useState<ResumeState>('initial');
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  // --- Form Setup ---
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
      resolver: zodResolver(profileFormSchema),
      defaultValues: { name: "", email: "", phone_number: "" }, // Initialize empty, populate via useEffect
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
      resolver: zodResolver(passwordFormSchema),
      defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  // --- Effect to Populate Profile Form ---
  // Update form default values when user data from context is available/changes
  useEffect(() => {
      if (user) {
          profileForm.reset({
              name: user.name || "",
              email: user.email || "",
              phone_number: user.phone_number || "",
          });
      }
  }, [user, profileForm]); // Depend on user and profileForm.reset reference

  // --- Resume Fetching Logic ---
  const fetchResumeDetails = useCallback(async () => {
      // Avoid fetching if already loading or in a deleted state that shouldn't auto-refresh
      if (resumeState === 'loading' || resumeState === 'deleted') return;

      console.log("ProfilePage: Fetching resume details...");
      setResumeState('loading');
      setResumeError(null);
      try {
          const resumeData = await getResume(); // Use context function
          // Check component is still mounted if async operations are long
          if (resumeData) {
              setCurrentResume(resumeData);
              setResumeState('loaded');
              console.log("ProfilePage: Resume loaded.", resumeData);
          } else {
              setCurrentResume(null);
              setResumeState('none');
              console.log("ProfilePage: No resume found.");
          }
      } catch (error) {
          console.error("ProfilePage: Error fetching resume details", error);
          const errorMsg = error instanceof Error ? error.message : "Failed to load resume details.";
          setResumeError(errorMsg);
          setResumeState('error');
          setCurrentResume(null);
          // Optional: Show toast here only if getResume itself doesn't
          // toast({ variant: "destructive", title: "Error", description: errorMsg });
      }
  }, [getResume, resumeState]); // Depend on stable getResume and resumeState to prevent re-fetching unnecessarily

  // --- Effect for Initial Resume Fetch ---
  useEffect(() => {
      // Fetch only when auth is confirmed loaded AND resume state is 'initial' (first load)
      if (!isAuthLoading && resumeState === 'initial') {
          fetchResumeDetails();
      }
  }, [isAuthLoading, resumeState, fetchResumeDetails]); // Correct dependencies

  // --- Form Submission Handlers ---
  async function onProfileSubmit(values: z.infer<typeof profileFormSchema>) {
      setIsProfileSubmitting(true);
      try {
          await updateProfile({ name: values.name, phone_number: values.phone_number || undefined }); // Send undefined if empty
          // Profile data in form will update via useEffect when `user` context changes
           toast({ title: "Success", description: "Profile updated." }); // Context function might already toast
      } catch (error) {
          // Error toast is likely handled within updateProfile in context
          console.error("Profile update error:", error);
      } finally {
          setIsProfileSubmitting(false);
      }
  }

  async function onPasswordSubmit(values: z.infer<typeof passwordFormSchema>) {
      setIsPasswordSubmitting(true);
      passwordForm.clearErrors(); // Clear previous errors
      try {
          await changePassword(values.currentPassword, values.newPassword);
          passwordForm.reset(); // Reset form fields on success
          toast({ title: "Success", description: "Password changed successfully." }); // Context function might already toast
      } catch (error) {
          console.error("Password change error:", error);
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
          // Set specific form errors based on keywords from backend error
          if (errorMessage.toLowerCase().includes("old password") || errorMessage.toLowerCase().includes("wrong password")) {
              passwordForm.setError("currentPassword", { message: "Current password is incorrect" });
          } else if (errorMessage.toLowerCase().includes("match")) {
              passwordForm.setError("confirmPassword", { message: "New passwords do not match" });
          } else {
               // Add a general error if the source isn't clear
               passwordForm.setError("root", { message: `Password change failed: ${errorMessage}` });
          }
          // Error toast likely handled in context
      } finally {
          setIsPasswordSubmitting(false);
      }
  }

  // --- Resume Action Handlers ---
  const handleFileChange = (file: File | null) => {
      // Optional: Add client-side validation here if FileUploader doesn't handle it
      setResumeFile(file);
  };

  const handleUpload = async () => {
      if (!resumeFile || isUploading || resumeState === 'deleted') return; // Prevent upload if no file, uploading, or deleted

      setIsUploading(true);
      setResumeError(null); // Clear previous errors before upload attempt
      try {
          const uploadedResume = await uploadResume(resumeFile); // Use context function
          setCurrentResume(uploadedResume); // Update state with the response from backend
          setResumeState('loaded'); // Set state to reflect loaded status
          setResumeFile(null); // Clear the selected file input
          // Success toast handled in context
      } catch (error) {
          console.error("Resume upload error:", error);
          setResumeError(error instanceof Error ? error.message : "Failed to upload resume.");
          setResumeState('error'); // Set error state on failure
          // Error toast handled in context
      } finally {
          setIsUploading(false);
      }
  };

  const handleDelete = async () => {
      // Prevent deletion if not loaded, already deleting, or already deleted
      if (isDeleting || resumeState !== 'loaded') return;

      setIsDeleting(true);
      setResumeError(null);
      // Optimistic UI update
      const previousResumeData = currentResume; // Store previous state for potential rollback
      setCurrentResume(null);
      setResumeState('deleted'); // Immediately reflect deletion in UI

      try {
          await deleteResume(); // Call context function
          // Success toast handled in context
          setResumeFile(null); // Ensure file input is cleared if deletion succeeds
      } catch (error) {
          console.error("Resume delete error (frontend handler):", error);
          // Rollback optimistic update if backend call fails
          setCurrentResume(previousResumeData);
          setResumeState('loaded'); // Revert state
          setResumeError(error instanceof Error ? error.message : "Failed to delete resume.");
          // Error toast handled in context
      } finally {
          setIsDeleting(false);
      }
  };

  // Explicit refresh action for the user
  const handleRefreshResume = () => {
       if (resumeState === 'loading') return; // Don't overlap fetches
       console.log("ProfilePage: User triggered refresh...");
       // Resetting state to initial would trigger useEffect, but direct call is fine too
       fetchResumeDetails();
  };


  // --- UI Rendering Helper for Resume Section ---
  const renderResumeContent = () => {
      switch (resumeState) {
          case 'initial': // Show loading initially until fetch starts
          case 'loading':
              return (
                  <div className="flex items-center justify-center p-6 text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading resume status...
                  </div>
              );
          case 'error':
              return (
                  <Alert variant="destructive" className="my-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error Loading Resume</AlertTitle>
                      <AlertDescription>
                          {resumeError || "Could not load resume details."}
                          {/* Provide a direct retry button */}
                          <Button variant="link" size="sm" onClick={handleRefreshResume} className="p-0 h-auto ml-2 text-red-800 hover:text-red-900">Retry</Button>
                      </AlertDescription>
                  </Alert>
              );
          case 'none':
              return (
                  <div className="text-center p-6 text-muted-foreground border border-dashed rounded-md">
                      No resume has been uploaded yet.
                  </div>
              );
           case 'deleted':
               return (
                   <Alert variant="default" className="my-4 border-green-500 text-green-700 bg-green-50">
                       <CheckCircle className="h-4 w-4" />
                       <AlertTitle>Resume Deleted</AlertTitle>
                       <AlertDescription>
                           Your resume has been successfully removed. Upload a new one below.
                       </AlertDescription>
                   </Alert>
               );
          case 'loaded':
              if (!currentResume) {
                   // This case indicates an inconsistent state, treat as error
                   setResumeState('error');
                   setResumeError('Loaded state reached but resume data is missing.');
                   return null;
              }
              return (
                  // Display current resume info
                  <div className="rounded-md border p-4 mb-4 bg-muted/30">
                      <div className="flex items-center justify-between gap-4">
                          {/* Left side: Link and date */}
                          <div className="flex flex-col overflow-hidden"> {/* Added overflow */}
                              <div className="font-medium truncate"> {/* Added truncate */}
                                  {currentResume.file_url ? (
                                      <a
                                          href={currentResume.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center text-primary hover:underline break-all" // Added break-all
                                      >
                                          <Eye className="mr-1.5 h-4 w-4 flex-shrink-0" /> {/* Added flex-shrink-0 */}
                                          <span>View Current Resume</span>
                                      </a>
                                  ) : (
                                      <span className="text-muted-foreground">Resume uploaded (URL missing)</span>
                                  )}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                  Last updated:{" "}
                                  {/* Format date nicely */}
                                  {format(new Date(currentResume.updated_at), 'MMM d, yyyy h:mm a')}
                              </div>
                          </div>
                          {/* Right side: Delete button */}
                          <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleDelete}
                              disabled={isDeleting}
                              className="flex-shrink-0" // Prevent button from shrinking too much
                          >
                              {isDeleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
                              Delete
                          </Button>
                      </div>
                  </div>
              );
          default:
              // Fallback for unknown state
              return <div className="p-4 text-center text-red-500">An unexpected error occurred.</div>;
      }
  };

  // --- Main Component Return ---
  return (
      <DashboardLayout>
          <div className="space-y-6">
              {/* Page Header */}
              <div>
                  <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
                  <p className="text-muted-foreground">Manage your account settings and resume</p>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="general" className="space-y-6">
                  <TabsList>
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="password">Password</TabsTrigger>
                      <TabsTrigger value="resume">Resume</TabsTrigger>
                  </TabsList>

                  {/* General Tab Content */}
                  <TabsContent value="general">
                      <Card>
                          <CardHeader>
                              <CardTitle>General Information</CardTitle>
                              <CardDescription>Update your personal details.</CardDescription>
                          </CardHeader>
                          <Form {...profileForm}>
                              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                                  <CardContent className="space-y-4">
                                      {/* Name Field */}
                                      <FormField control={profileForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                      {/* Email Field (Disabled) */}
                                      <FormField control={profileForm.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input {...field} disabled /></FormControl> <FormDescription>Email cannot be changed.</FormDescription> <FormMessage /> </FormItem> )} />
                                      {/* Phone Number Field */}
                                      <FormField control={profileForm.control} name="phone_number" render={({ field }) => ( <FormItem> <FormLabel>Phone Number (Optional)</FormLabel> <FormControl><Input {...field} placeholder="03xxxxxxxxx or +92xxxxxxxxxx" /></FormControl> <FormMessage /> </FormItem> )} />
                                  </CardContent>
                                  <CardFooter>
                                      <Button type="submit" disabled={isProfileSubmitting || !profileForm.formState.isDirty}>
                                          {isProfileSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                          Save Changes
                                      </Button>
                                  </CardFooter>
                              </form>
                          </Form>
                      </Card>
                  </TabsContent>

                  {/* Password Tab Content */}
                  <TabsContent value="password">
                      <Card>
                          <CardHeader>
                              <CardTitle>Change Password</CardTitle>
                              <CardDescription>Update your account password.</CardDescription>
                          </CardHeader>
                           <Form {...passwordForm}>
                              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                                  <CardContent className="space-y-4">
                                      {/* Current Password Field */}
                                      <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => ( <FormItem> <FormLabel>Current Password</FormLabel> <FormControl><Input type="password" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                      {/* New Password Field */}
                                      <FormField control={passwordForm.control} name="newPassword" render={({ field }) => ( <FormItem> <FormLabel>New Password</FormLabel> <FormControl><Input type="password" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                      {/* Confirm New Password Field */}
                                      <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => ( <FormItem> <FormLabel>Confirm New Password</FormLabel> <FormControl><Input type="password" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                       {/* Display root errors (general errors) if any */}
                                       {passwordForm.formState.errors.root && (
                                          <p className="text-sm font-medium text-destructive">{passwordForm.formState.errors.root.message}</p>
                                       )}
                                  </CardContent>
                                  <CardFooter>
                                      <Button type="submit" disabled={isPasswordSubmitting}>
                                          {isPasswordSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                          Change Password
                                      </Button>
                                  </CardFooter>
                              </form>
                          </Form>
                      </Card>
                  </TabsContent>

                  {/* Resume Tab Content */}
                  <TabsContent value="resume">
                      <Card>
                          <CardHeader>
                              <CardTitle>Resume</CardTitle>
                              <CardDescription>Upload and manage your resume file (PDF, DOC, DOCX).</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                              {/* Render current resume status/details */}
                              {renderResumeContent()}

                              {/* Upload Section */}
                              {resumeState !== 'deleted' && ( // Only show upload if not in deleted confirmation state
                                   <div className="space-y-2">
                                      <Label htmlFor="resume-upload" className="text-sm font-medium">
                                          {resumeState === 'loaded' ? 'Upload New Resume (Replaces Current)' : 'Upload Your Resume'}
                                      </Label>
                                      <FileUploader
                                          id="resume-upload" // Add id for label association
                                          onFileChange={handleFileChange}
                                          // Pass current file state if needed by FileUploader to show name
                                          // currentFile={resumeFile}
                                          disabled={isUploading || isDeleting || resumeState === 'loading'}
                                      />
                                       {/* Display selected file name */}
                                       {resumeFile && (
                                           <p className="text-sm text-muted-foreground">Selected: {resumeFile.name}</p>
                                       )}
                                      <p className="text-xs text-muted-foreground pt-1">
                                          Accepted: PDF, DOC, DOCX. Max size: 5MB.
                                      </p>
                                  </div>
                              )}
                               {/* Show upload section again after deletion confirmation */}
                               {resumeState === 'deleted' && (
                                    <div className="space-y-2 pt-4 border-t">
                                       <Label htmlFor="resume-upload-after-delete" className="text-sm font-medium">
                                           Upload a New Resume
                                       </Label>
                                       <FileUploader
                                           id="resume-upload-after-delete"
                                           onFileChange={handleFileChange}
                                           disabled={isUploading} // Only disable during upload
                                       />
                                        {resumeFile && (
                                           <p className="text-sm text-muted-foreground">Selected: {resumeFile.name}</p>
                                       )}
                                       <p className="text-xs text-muted-foreground pt-1">
                                           Accepted: PDF, DOC, DOCX. Max size: 5MB.
                                       </p>
                                   </div>
                               )}

                          </CardContent>
                          <CardFooter className="flex justify-between border-t pt-4">
                              {/* Refresh Button */}
                              <Button
                                  variant="outline"
                                  onClick={handleRefreshResume}
                                  disabled={isUploading || isDeleting || resumeState === 'loading'} // Disable if any action is pending or loading
                              >
                                  <RefreshCw className={`mr-2 h-4 w-4 ${resumeState === 'loading' ? 'animate-spin' : ''}`} />
                                  Refresh Status
                              </Button>
                              {/* Upload/Replace Button */}
                              <Button
                                  onClick={handleUpload}
                                  // Disable if no file selected, or any action is in progress
                                  disabled={!resumeFile || isUploading || isDeleting || resumeState === 'loading'}
                              >
                                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                  {isUploading ? "Uploading..." : (resumeState === 'loaded' ? "Replace Resume" : "Upload Resume")}
                              </Button>
                          </CardFooter>
                      </Card>
                  </TabsContent>
              </Tabs>
          </div>
      </DashboardLayout>
  );
}



// --- Placeholder FileUploader Component ---
// Create this file e.g., in components/file-uploader.tsx if you don't have one
/*
"use client";

import React, { useRef, useState, DragEvent } from 'react';
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { UploadCloud } from 'lucide-react';

interface FileUploaderProps {
  id?: string;
  onFileChange: (file: File | null) => void;
  acceptedFileTypes?: string; // e.g., ".pdf,.doc,.docx"
  maxSize?: number; // In MB
  disabled?: boolean;
}

export function FileUploader({
    id = "file-upload",
    onFileChange,
    acceptedFileTypes = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    maxSize = 5, // Default 5MB
    disabled = false
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) {
        onFileChange(null);
        return;
    }

    // Validation: Size
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: `Maximum file size is ${maxSize}MB.`,
      });
      onFileChange(null); // Reject file
      if(inputRef.current) inputRef.current.value = ""; // Clear input
      return;
    }

    // Validation: Type (using acceptedFileTypes prop)
    // Note: Browser's 'accept' attribute is a hint, doesn't guarantee type. More robust check needed if critical.
    // This basic check relies on the 'accept' string format
    const acceptedTypesArray = acceptedFileTypes?.split(',').map(t => t.trim()) || [];
    let isValidType = false;
    if (acceptedTypesArray.includes(file.type) || acceptedTypesArray.some(type => type.startsWith('.') && file.name.endsWith(type))) {
        isValidType = true;
    }

    if (!isValidType && acceptedTypesArray.length > 0 && !acceptedTypesArray.includes("*")) {
         toast({
             variant: "destructive",
             title: "Invalid file type",
             description: `Please select a valid file type (${acceptedFileTypes.replace(/,/g,', ')})`,
         });
         onFileChange(null); // Reject file
          if(inputRef.current) inputRef.current.value = ""; // Clear input
         return;
    }


    onFileChange(file); // Accept file
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
     if (!disabled) {
        inputRef.current?.click();
     }
  };


  return (
      <div
          id={`${id}-dropzone`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-md transition-colors
                      ${disabled ? 'cursor-not-allowed bg-muted/50 border-muted' : 'cursor-pointer'}
                      ${dragActive ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary/50'} `}
      >
          <UploadCloud className={`h-10 w-10 mb-2 ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
          <p className={`text-sm mb-1 ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
              Drag & drop file here or{' '}
               <span className={`${disabled ? '' : 'font-semibold text-primary hover:underline'}`}>browse</span>
          </p>
           <p className={`text-xs ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>Max {maxSize}MB</p>
          <Input
              id={id}
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={handleInputChange}
              accept={acceptedFileTypes}
              disabled={disabled}
          />
      </div>
  );
}
*/