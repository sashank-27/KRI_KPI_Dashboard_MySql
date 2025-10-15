"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Download, RefreshCw, FileText, Calendar, User, Building2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getApiBaseUrl } from "@/lib/api"
import { getAuthHeaders } from "@/lib/auth"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { useSocket } from "@/hooks/useSocket"

interface FAQ {
  id: string
  problem: string
  srId: string
  solutionFile: {
    filename: string
    originalName: string
    mimetype: string
    size: number
  }
  solvedBy: {
    id: string
    name: string
    email: string
  }
  department?: {
    id: string
    name: string
  }
  tags: string[]
  createdAt: string
}

export function FAQViewerPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { socket } = useSocket()

  useEffect(() => {
    fetchFAQs()
  }, [])

  useEffect(() => {
    filterFAQs()
  }, [faqs, searchQuery])

  // Real-time event handler for FAQ updates
  const handleFAQRealTimeEvent = useCallback((data: any) => {
    // Refresh FAQ list when any FAQ event occurs
    fetchFAQs();
  }, []);

  // Set up real-time event listeners for FAQ updates
  useEffect(() => {
    if (!socket) return;

    socket.on('faq-created', handleFAQRealTimeEvent);
    socket.on('faq-updated', handleFAQRealTimeEvent);
    socket.on('faq-status-toggled', handleFAQRealTimeEvent);

    return () => {
      socket.off('faq-created', handleFAQRealTimeEvent);
      socket.off('faq-updated', handleFAQRealTimeEvent);
      socket.off('faq-status-toggled', handleFAQRealTimeEvent);
    };
  }, [socket, handleFAQRealTimeEvent]);

  const fetchFAQs = async (showToast = false) => {
    try {
      setLoading(!showToast)
      setRefreshing(showToast)
      
      const response = await fetch(`${getApiBaseUrl()}/api/faqs`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch FAQs")
      }

      const data = await response.json()
      setFaqs(data)
      
      if (showToast) {
        toast.success("FAQs refreshed successfully")
      }
    } catch (error: any) {
      console.error("Error fetching FAQs:", error)
      toast.error("Failed to load FAQs")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchFAQs(true)
  }

  const filterFAQs = () => {
    let filtered = [...faqs]

    if (searchQuery) {
      filtered = filtered.filter(
        (faq) =>
          faq.problem.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.srId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
          faq.solvedBy?.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredFaqs(filtered)
  }

  const handleDownload = async (faqId: string, filename: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/faqs/${faqId}/download`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json()
          throw new Error(error.message || "Failed to download file")
        }
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Solution downloaded successfully")
    } catch (error) {
      console.error("Error downloading solution:", error)
      toast.error("Failed to download solution")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else return (bytes / 1048576).toFixed(1) + " MB"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-64 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
        
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
        </div>
        
        <div className="grid gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-10 w-24" />
                </div>
                
                <Skeleton className="h-px w-full" />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FAQs & Solutions</h1>
          <p className="text-muted-foreground mt-1">
            Browse solutions to previously resolved issues
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by problem, SR-ID, tags, or solver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* FAQ List */}
      <div className="grid gap-4">
        {filteredFaqs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No FAQs found matching your search"
                  : "No FAQs available yet. Complete tasks with SR-ID to create FAQs."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFaqs.map((faq) => (
            <Card key={faq.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono">
                        {faq.srId}
                      </Badge>
                      {faq.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <CardTitle className="text-xl leading-relaxed">
                      {faq.problem}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Info */}
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {faq.solutionFile.originalName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(faq.solutionFile.size)} •{" "}
                      {faq.solutionFile.mimetype}
                    </p>
                  </div>
                  <Button
                    onClick={() =>
                      handleDownload(faq.id, faq.solutionFile.originalName)
                    }
                    size="sm"
                    className="gap-2 flex-shrink-0"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>

                <Separator />

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Solved by: {faq.solvedBy?.name}</span>
                  </div>
                  {faq.department && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{faq.department.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(faq.createdAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Stats */}
      {faqs.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              Showing {filteredFaqs.length} of {faqs.length} solution{faqs.length !== 1 ? "s" : ""}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
