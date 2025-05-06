"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/dashboard-layout"

const formSchema = z.object({
  jobTitle: z.string().min(1, {
    message: "Job title is required.",
  }),
  location: z.string().optional(),
  jobType: z.string().optional(),
})

interface Job {
  id: string
  title: string
  company: string
  location: string
  description: string
  salary?: string
  postedDate: string
  url: string
  jobType: string
}

export default function JobSearchPage() {
  const [isSearching, setIsSearching] = useState(false)
  const [jobs, setJobs] = useState<Job[] | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobTitle: "",
      location: "",
      jobType: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSearching(true)
    setJobs(null)

    try {
      // In a real app, you would make an API call to search for jobs
      // Mock implementation
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock job data
      setJobs([
        {
          id: "1",
          title: "Frontend Developer",
          company: "Tech Solutions Inc.",
          location: "New York, NY",
          description:
            "We are looking for a skilled Frontend Developer to join our team. The ideal candidate should have experience with React, TypeScript, and modern CSS frameworks.",
          salary: "$90,000 - $120,000",
          postedDate: "2 days ago",
          url: "#",
          jobType: "Full-time",
        },
        {
          id: "2",
          title: "UX/UI Designer",
          company: "Creative Agency",
          location: "Remote",
          description:
            "Join our design team to create beautiful and intuitive user interfaces for web and mobile applications. Experience with Figma and design systems required.",
          postedDate: "1 week ago",
          url: "#",
          jobType: "Contract",
        },
        {
          id: "3",
          title: "Full Stack Developer",
          company: "Startup Innovations",
          location: "San Francisco, CA",
          description:
            "Looking for a Full Stack Developer with experience in React, Node.js, and database design. You'll be working on our core product and helping to scale our platform.",
          salary: "$110,000 - $140,000",
          postedDate: "3 days ago",
          url: "#",
          jobType: "Full-time",
        },
        {
          id: "4",
          title: "Product Manager",
          company: "Enterprise Solutions",
          location: "Chicago, IL",
          description:
            "Experienced Product Manager needed to lead our product development efforts. You'll work closely with engineering, design, and marketing teams.",
          salary: "$100,000 - $130,000",
          postedDate: "5 days ago",
          url: "#",
          jobType: "Full-time",
        },
        {
          id: "5",
          title: "DevOps Engineer",
          company: "Cloud Services Ltd.",
          location: "Remote",
          description:
            "Join our DevOps team to build and maintain our cloud infrastructure. Experience with AWS, Kubernetes, and CI/CD pipelines is required.",
          postedDate: "1 day ago",
          url: "#",
          jobType: "Part-time",
        },
      ])
    } catch (error) {
      console.error("Job search error:", error)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Search</h1>
          <p className="text-muted-foreground">Find job opportunities that match your skills and experience</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Jobs</CardTitle>
            <CardDescription>Enter your search criteria to find relevant job opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Frontend Developer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. New York, Remote" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jobType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select job type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="full-time">Full-time</SelectItem>
                            <SelectItem value="part-time">Part-time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="remote">Remote</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={isSearching}>
                  <Search className="mr-2 h-4 w-4" />
                  {isSearching ? "Searching..." : "Search Jobs"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {isSearching && (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full rounded-md" />
            <Skeleton className="h-[200px] w-full rounded-md" />
            <Skeleton className="h-[200px] w-full rounded-md" />
          </div>
        )}

        {jobs && jobs.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Search Results</h2>
              <p className="text-sm text-muted-foreground">{jobs.length} jobs found</p>
            </div>

            {jobs.map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex flex-col justify-between space-y-2 md:flex-row md:items-start md:space-y-0">
                    <div>
                      <CardTitle>{job.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {job.company} • {job.location}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{job.jobType}</Badge>
                      <Badge variant="secondary">{job.postedDate}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{job.description}</p>
                  {job.salary && <p className="mt-2 text-sm font-medium">Salary: {job.salary}</p>}
                </CardContent>
                <CardFooter>
                  <Button asChild>
                    <a href={job.url} target="_blank" rel="noopener noreferrer">
                      Apply
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {jobs && jobs.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No Results Found</CardTitle>
              <CardDescription>
                We couldn&apos;t find any jobs matching your search criteria. Try adjusting your search terms.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

