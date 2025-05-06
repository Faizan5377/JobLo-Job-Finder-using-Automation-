"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function VerifyEmailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState<string>("")

  const uidb64 = params.uidb64 as string
  const token = params.token as string

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/users/verify-email/${uidb64}/${token}/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully. You can now log in.");
          toast({
            title: "Success",
            description: "Email verified successfully!",
          });
          
          // Redirect to login page after a short delay
          setTimeout(() => {
            router.push("/login");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed. The link may be expired or invalid.");
          toast({
            variant: "destructive",
            title: "Verification failed",
            description: data.error || "The link may be expired or invalid.",
          });
        }
      } catch (error) {
        console.error("Email verification error:", error);
        setStatus("error");
        setMessage("Unable to connect to the server. Please try again later.");
        toast({
          variant: "destructive",
          title: "Connection error",
          description: "Unable to connect to the server. Please try again later.",
        });
      }
    }

    if (uidb64 && token) {
      verifyEmail();
    }
  }, [uidb64, token, toast, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto w-full max-w-md text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            <h1 className="text-2xl font-semibold tracking-tight">Verifying your email</h1>
            <p className="text-sm text-muted-foreground">Please wait while we verify your email address...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h1 className="text-2xl font-semibold tracking-tight">Email verified</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground">Redirecting to login page...</p>
            <Button asChild>
              <Link href="/login">Sign in now</Link>
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center space-y-4">
            <XCircle className="h-16 w-16 text-destructive" />
            <h1 className="text-2xl font-semibold tracking-tight">Verification failed</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button asChild variant="outline">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}