"use client"

import type React from "react"
import { useCallback } from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

type User = {
  id: string
  name: string
  email: string
  phone_number?: string
}

type Resume = {
  id: string;
  file: string;
  file_url: string;
  uploaded_at: string;
  updated_at: string;
}

// Represents the result of a resume analysis
// Mirror the structure expected by the ResumeAnalysisPage component
// and the JSON structure returned by Gemini
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

// Represents the state of a suggestion request from the backend
interface ResumeSuggestion {
  id: string; // UUID
  resume_id: string;
  user_id: string;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  suggestion_data: ResumeAnalysisResult | { error?: string; message?: string }; // Contains result or error/message
}

// --- AuthContextType ---
type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  requestPasswordReset: (email: string) => Promise<void>
  resetPassword: (uidb64: string, token: string, password: string) => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<User>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  // Resume file management
  uploadResume: (file: File) => Promise<Resume>; // Returns details of the saved resume
  getResume: () => Promise<Resume | null>;      // Fetches details of the current resume
  deleteResume: () => Promise<void>;
  // Resume analysis management
  requestResumeAnalysis: () => Promise<ResumeSuggestion>; // Starts analysis, returns initial suggestion state
  getResumeAnalysis: (suggestionId: string) => Promise<ResumeSuggestion>; // Fetches status/result by ID
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  // --- Authentication Check Effect (keep as is) ---
  useEffect(() => {
    const checkAuth = async () => {
        setIsLoading(true); // Start loading
        try {
            const token = localStorage.getItem("token");
            if (token) {
                const response = await fetch('/api/users/profile/', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    if (response.status === 401) { // Explicitly handle 401 Unauthorized
                         console.log("Token invalid or expired, logging out.");
                         localStorage.removeItem("token");
                         setUser(null);
                    } else {
                        console.error(`Failed to fetch profile: ${response.status}`);
                        // Optionally clear token here too, or handle based on status code
                        localStorage.removeItem("token"); // Example: clear token on any non-OK status
                        setUser(null);
                    }
                    return; // Exit if profile fetch failed
                }
                const userData = await response.json();
                setUser({
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    phone_number: userData.phone_number
                });
            } else {
                 setUser(null); // No token means no user
            }
        } catch (error) {
            console.error("Authentication check error:", error);
            localStorage.removeItem("token"); // Clear token on error
            setUser(null);
        } finally {
            setIsLoading(false); // Finish loading
        }
    };
    checkAuth();
  }, []); // Run only once on mount

  // --- Redirect Effect (keep as is) ---
  useEffect(() => {
    // Add a small delay or check pathname change if experiencing rapid redirects
    if (!isLoading) {
      const protectedRoutes = ["/dashboard", "/profile", "/resume-analysis", "/job-search"]
      const authRoutes = ["/login", "/register", "/reset-password"]

      const isProtectedRoute = protectedRoutes.some((route) => pathname?.startsWith(route))
      const isAuthRoute = authRoutes.some((route) => pathname?.startsWith(route))

      console.log(`Redirect Check: Path=${pathname}, User=${!!user}, Loading=${isLoading}, Prot=${isProtectedRoute}, AuthR=${isAuthRoute}`);


      if (isProtectedRoute && !user) {
        console.log("Redirecting to /login (protected route, no user)");
        router.push("/login");
      } else if (isAuthRoute && user) {
         console.log("Redirecting to /dashboard (auth route, user exists)");
        router.push("/dashboard");
      }
    }
  }, [isLoading, user, pathname, router]);

  const login = async (email: string, password: string) => {
    // setIsLoading(true); // Already handled by checkAuth potentially, remove if causing issues
    try {
      const response = await fetch('/api/users/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        let errorMessage = 'Login failed';
        if (typeof data === 'object') {
          errorMessage = data.error || data.detail || data.non_field_errors?.[0] || data.message || 'Login failed';
        }
        throw new Error(errorMessage);
      }
      localStorage.setItem("token", data.access); // Assuming 'access' is the token key

       // Fetch profile *after* setting token to update user state
       await fetchUserProfile(data.access);


      toast({ title: "Login successful", description: "Welcome back!" });
      router.push("/dashboard"); // Redirect after state is potentially updated
    } catch (error) {
      console.error("Login error:", error);
      toast({ variant: "destructive", title: "Login failed", description: error instanceof Error ? error.message : "Please check credentials." });
      throw error; // Re-throw for component handling if needed
    }
    // finally { setIsLoading(false); } // Let fetchUserProfile handle loading state
  };

  // Helper to fetch profile data and set user state
  const fetchUserProfile = async (token: string) => {
    setIsLoading(true);
    try {
        const response = await fetch('/api/users/profile/', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
         if (!response.ok) { throw new Error("Failed to fetch user profile after login."); }
        const userData = await response.json();
         setUser({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            phone_number: userData.phone_number
        });
    } catch (error) {
         console.error("Error fetching profile after login:", error);
         localStorage.removeItem("token"); // Log out if profile fetch fails
         setUser(null);
         toast({ variant: "destructive", title: "Session Error", description: "Could not retrieve user data." });
         router.push('/login'); // Force back to login
    } finally {
        setIsLoading(false);
    }
};

  // Inside auth-provider.tsx, update the register function as follows:
  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          password_confirm: password, // Match exactly what your serializer expects
        }),
      });
  
      // Try to parse response as JSON, but handle non-JSON responses
      let data;
      try {
        data = await response.json();
      } catch (e) {
        // If not JSON, get the text
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error("Server returned non-JSON response");
      }
      
      if (!response.ok) {
        // Handle different types of errors
        const errorMsg = data.error || 
          data.email || 
          data.name || 
          data.password || 
          data.password_confirm ||
          data.non_field_errors || 
          'Registration failed';
        throw new Error(errorMsg);
      }
      
      // Success
      toast({
        title: "Registration successful",
        description: "Please check your email to verify your account.",
      });
      
      router.push("/login");
      return data;
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again later.",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token")
    setUser(null)
    router.push("/")
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    })
  }

  const requestPasswordReset = async (email: string) => {
    setIsLoading(true)
    try {
      // In a real app, you would make an API call to /api/users/request-password-reset/
      // Mock implementation
      toast({
        title: "Password reset email sent",
        description: "Please check your email for instructions.",
      })

      router.push("/login")
    } catch (error) {
      console.error("Password reset request error:", error)
      toast({
        variant: "destructive",
        title: "Password reset request failed",
        description: "Please try again later.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async (uidb64: string, token: string, password: string) => {
    setIsLoading(true)
    try {
      // In a real app, you would make an API call to /api/users/reset-password/<uidb64>/<token>/
      // Mock implementation
      toast({
        title: "Password reset successful",
        description: "You can now log in with your new password.",
      })

      router.push("/login")
    } catch (error) {
      console.error("Password reset error:", error)
      toast({
        variant: "destructive",
        title: "Password reset failed",
        description: "Please try again later.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (data: Partial<User>) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      
      const response = await fetch('/api/users/profile/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update profile");
      }
  
      const updatedUser = await response.json();
      setUser((prev) => (prev ? { ...prev, ...updatedUser } : null));
  
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      
      return updatedUser;
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        variant: "destructive",
        title: "Profile update failed",
        description: error instanceof Error ? error.message : "Please try again later.",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      
      const response = await fetch('/api/users/change-password/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          confirm_new_password: newPassword
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = 
          errorData.old_password?.[0] || 
          errorData.new_password?.[0] || 
          errorData.detail || 
          "Failed to change password";
        throw new Error(errorMessage);
      }
  
      toast({
        title: "Password changed",
        description: "Your password has been successfully changed.",
      });
    } catch (error) {
      console.error("Password change error:", error);
      toast({
        variant: "destructive",
        title: "Password change failed",
        description: error instanceof Error ? error.message : "Please try again later.",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // --- Resume Management Functions ---

  // GET Current Resume Details
  const getResume = useCallback(async (): Promise<Resume | null> => {
    // No need for setIsLoading here usually, let the calling component manage its loading state
    console.log("Attempting to fetch resume details..."); // Add log
    const token = localStorage.getItem("token");
    if (!token) {
        console.log("No token found for getResume");
        // Don't throw error here, just return null as user is not authenticated
        return null;
    }

    try {
      // *** Use the NEW endpoint ***
      const response = await fetch('/api/resumes/details/', { // <-- CHANGED Endpoint
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 404) {
        console.log("No resume found on backend (404).");
        return null; // No resume found is a valid state
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Failed to fetch resume: ${response.status}`, errorData);
        // Optionally show a toast for non-404 errors
        if (response.status !== 401) { // Don't toast on auth errors handled elsewhere
             toast({ variant: "destructive", title: "Error", description: `Could not fetch resume details (${response.status}).` });
        }
        throw new Error(`Failed to fetch resume (${response.status})`);
      }

      const resumeData: Resume = await response.json();
      console.log("Resume details fetched:", resumeData);
      return resumeData;

    } catch (error) {
      console.error("Error in getResume:", error);
      // Avoid throwing error for expected cases like 404 or network issues if handled by caller
       // Re-throw only if it's an unexpected error type or needed by caller
       if (!(error instanceof Error && error.message.includes("Failed to fetch resume"))) {
             // throw error; // Only throw truly unexpected errors
       }
      return null; // Return null on error for simplicity in UI
    }
  }, [toast]); // Add toast dependency

  // POST/Update Resume File
  const uploadResume = async (file: File): Promise<Resume> => {
    // setIsLoading(true); // Manage loading in the component calling this
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Not authenticated");

    const formData = new FormData();
    formData.append('file', file);

    try {
      // *** Use the upload endpoint for POST ***
      const response = await fetch('/api/resumes/upload/', { // <-- Correct endpoint for POST
        method: 'POST', // Use POST for create/update via this endpoint design
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const responseData = await response.json(); // Try parsing JSON regardless of status for error messages

      if (!response.ok) {
         console.error(`Resume upload failed: ${response.status}`, responseData);
        throw new Error(responseData.error || responseData.detail || `Failed to upload resume (${response.status})`);
      }

      toast({ title: "Resume uploaded", description: "Your resume has been successfully saved." });
      return responseData as Resume; // Return the updated/created resume data

    } catch (error) {
      console.error("Resume upload error:", error);
      toast({ variant: "destructive", title: "Resume upload failed", description: error instanceof Error ? error.message : "Please try again later." });
      throw error; // Re-throw for the calling component
    }
    // finally { setIsLoading(false); }
  };

  // DELETE Resume
  const deleteResume = async (): Promise<void> => {
    // setIsLoading(true); // Manage loading in the component
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Not authenticated");

    try {
      // *** Use the DELETE endpoint ***
      const response = await fetch('/api/resumes/delete/', { // <-- Correct endpoint
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // 204 No Content is the expected success status for DELETE
      if (response.status !== 204) {
          // Try to get error details if available
          let errorMsg = `Failed to delete resume (${response.status})`;
           try {
              const errorData = await response.json();
              errorMsg = errorData.error || errorData.detail || errorMsg;
           } catch (e) { /* Ignore if response body is not JSON */ }
          console.error(`Resume delete failed: ${response.status}`, errorMsg);
          throw new Error(errorMsg);
      }

      toast({ title: "Resume deleted", description: "Your resume has been successfully deleted." });

    } catch (error) {
      console.error("Resume delete error:", error);
      toast({ variant: "destructive", title: "Delete failed", description: error instanceof Error ? error.message : "Could not delete resume." });
      throw error; // Re-throw
    }
    // finally { setIsLoading(false); }
  };

   // --- Resume Analysis Functions ---

   // POST to start analysis
  const requestResumeAnalysis = async (): Promise<ResumeSuggestion> => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Not authenticated");

    try {
        const response = await fetch('/api/resumes/suggestions/', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error(`Request analysis failed: ${response.status}`, responseData);
             // Handle specific errors like 404 (no resume)
             if (response.status === 404) {
                  throw new Error(responseData.error || "No resume found. Please upload one first.");
             }
            throw new Error(responseData.error || responseData.detail || `Failed to start analysis (${response.status})`);
        }

         // Expecting 202 Accepted with initial suggestion data
        if (response.status === 202) {
            toast({ title: "Analysis Started", description: "Your resume is being analyzed. Results will appear shortly." });
            return responseData as ResumeSuggestion;
        } else {
              // Should not happen if backend adheres to the pattern, but handle defensively
              console.warn("Unexpected status code from requestResumeAnalysis:", response.status);
              return responseData as ResumeSuggestion; // Still return data if possible
        }

    } catch (error) {
        console.error("Request resume analysis error:", error);
        toast({ variant: "destructive", title: "Analysis Error", description: error instanceof Error ? error.message : "Could not start resume analysis." });
        throw error;
      }
  };

  // GET analysis status/result by ID
  const getResumeAnalysis = async (suggestionId: string): Promise<ResumeSuggestion> => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      try {
          const response = await fetch(`/api/resumes/suggestions/${suggestionId}/`, { // <-- Endpoint with ID
              method: 'GET',
              headers: { 'Authorization': `Bearer ${token}` },
          });

          const responseData = await response.json();

          if (!response.ok) {
               console.error(`Get analysis failed: ${response.status}`, responseData);
               throw new Error(responseData.error || responseData.detail || `Failed to get analysis status (${response.status})`);
          }

          return responseData as ResumeSuggestion;

      } catch (error) {
          console.error(`Get resume analysis error (ID: ${suggestionId}):`, error);
          // Don't toast here, let the polling logic decide how to handle errors
          throw error; // Re-throw for the polling logic
      }
  };

  // --- Provider Value ---
  const contextValue = {
    user,
    isLoading,
    login,
    register,
    logout,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    changePassword,
    uploadResume,
    getResume,
    deleteResume,
    requestResumeAnalysis, // Add new function
    getResumeAnalysis,     // Add new function
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}