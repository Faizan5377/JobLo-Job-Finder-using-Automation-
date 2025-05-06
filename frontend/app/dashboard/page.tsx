"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BarChart, FileText, Search, User, TrendingUp, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/components/auth-provider"
import { Progress } from "@/components/ui/progress"

export default function DashboardPage() {
  const { user } = useAuth()
  const [resumeUploaded, setResumeUploaded] = useState(false)
  const [recentSearches, setRecentSearches] = useState<{ id: string; title: string; location: string; date: string }[]>(
    [],
  )
  const [resumeScore, setResumeScore] = useState<number | null>(null)

  useEffect(() => {
    // Mock data - in a real app, you would fetch this from the API
    setResumeUploaded(true)
    setResumeScore(7.5)
    setRecentSearches([
      { id: "1", title: "Frontend Developer", location: "New York, NY", date: "2 days ago" },
      { id: "2", title: "UX Designer", location: "Remote", date: "1 week ago" },
    ])
  }, [])

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-heading">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name || "User"}!</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="dashboard-stat-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resume Status</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {resumeUploaded ? (
                <>
                  <div className="text-2xl font-bold">Resume Uploaded</div>
                  <p className="text-xs text-muted-foreground">Last updated: 2 days ago</p>
                  <div className="mt-4">
                    <Link href="/resume-analysis">
                      <Button size="sm" className="w-full">
                        View Analysis
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">No Resume</div>
                  <p className="text-xs text-muted-foreground">Upload your resume to get started</p>
                  <div className="mt-4">
                    <Link href="/profile">
                      <Button size="sm" className="w-full">
                        Upload Resume
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="dashboard-stat-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resume Score</CardTitle>
              <BarChart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {resumeScore ? (
                <>
                  <div className="text-2xl font-bold">{resumeScore}/10</div>
                  <div className="mt-2">
                    <Progress value={(resumeScore / 10) * 100} className="h-2" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Your resume is performing well. See suggestions to improve.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">Not Analyzed</div>
                  <p className="text-xs text-muted-foreground">Upload your resume to get a score</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="dashboard-stat-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Job Searches</CardTitle>
              <Search className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {recentSearches.length > 0 ? (
                <div className="space-y-3">
                  {recentSearches.map((search) => (
                    <div key={search.id} className="flex flex-col space-y-1 p-2 rounded-md bg-muted/50">
                      <div className="text-sm font-medium">{search.title}</div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span>{search.location}</span>
                        <span className="mx-1">•</span>
                        <span>{search.date}</span>
                      </div>
                    </div>
                  ))}
                  <div className="mt-2">
                    <Link href="/job-search">
                      <Button size="sm" variant="outline" className="w-full">
                        New Search
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">No Searches</div>
                  <p className="text-xs text-muted-foreground">Start searching for jobs</p>
                  <div className="mt-4">
                    <Link href="/job-search">
                      <Button size="sm" className="w-full">
                        Search Jobs
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks you can perform</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Link href="/profile">
                  <Button variant="outline" className="w-full justify-start hover:bg-primary/10">
                    <User className="mr-2 h-4 w-4" />
                    Update Profile
                  </Button>
                </Link>
                <Link href="/resume-analysis">
                  <Button variant="outline" className="w-full justify-start hover:bg-primary/10">
                    <FileText className="mr-2 h-4 w-4" />
                    Analyze Resume
                  </Button>
                </Link>
                <Link href="/job-search">
                  <Button variant="outline" className="w-full justify-start hover:bg-primary/10">
                    <Search className="mr-2 h-4 w-4" />
                    Search Jobs
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="outline" className="w-full justify-start hover:bg-primary/10">
                    <FileText className="mr-2 h-4 w-4" />
                    Upload Resume
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Tips & Resources
              </CardTitle>
              <CardDescription>Helpful resources to improve your job search</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted/50 p-4 hover:bg-muted transition-colors">
                <h3 className="font-medium">Resume Tips</h3>
                <p className="text-sm text-muted-foreground">
                  Tailor your resume to each job application by highlighting relevant skills and experience.
                </p>
              </div>
              <div className="rounded-md bg-muted/50 p-4 hover:bg-muted transition-colors">
                <h3 className="font-medium">Interview Preparation</h3>
                <p className="text-sm text-muted-foreground">
                  Research the company and prepare answers to common interview questions.
                </p>
              </div>
              <div className="rounded-md bg-muted/50 p-4 hover:bg-muted transition-colors">
                <h3 className="font-medium">Networking</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with professionals in your field to discover hidden job opportunities.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

