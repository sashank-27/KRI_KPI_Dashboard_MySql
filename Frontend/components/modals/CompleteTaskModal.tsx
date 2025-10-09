"use client"

import { useState } from "react"
import { X, Upload, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getApiBaseUrl } from "@/lib/api"
import { getAuthHeaders } from "@/lib/auth"
import { toast } from "sonner"

interface Task {
  id: string
  task: string
  srId?: string
  remarks: string
}

interface CompleteTaskModalProps {
  isOpen: boolean
  onClose: (refreshTasks?: boolean) => void
  task: Task | null
}

export function CompleteTaskModal({ isOpen, onClose, task }: CompleteTaskModalProps) {
  const [problem, setProblem] = useState("")
  const [solutionFile, setSolutionFile] = useState<File | null>(null)
  const [tags, setTags] = useState("")
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB")
        return
      }
      setSolutionFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!task || !task.srId) {
      toast.error("Task must have an SR-ID")
      return
    }

    if (!problem.trim()) {
      toast.error("Please describe the problem you solved")
      return
    }

    if (!solutionFile) {
      toast.error("Please upload a solution file")
      return
    }

    try {
      setLoading(true)

      // Create FormData for file upload
      const formData = new FormData()
      formData.append("taskId", task.id)
      formData.append("problem", problem)
      formData.append("srId", task.srId)
      formData.append("solutionFile", solutionFile)
      if (tags.trim()) {
        formData.append("tags", tags)
      }

      console.log("Submitting FAQ with:", {
        taskId: task.id,
        srId: task.srId,
        problemLength: problem.length,
        fileName: solutionFile.name,
        fileSize: solutionFile.size,
        tags: tags
      })

      const authHeaders = getAuthHeaders()
      const headers: Record<string, string> = {}
      
      // Only add Authorization header, not Content-Type (let browser handle it for FormData)
      if ('Authorization' in authHeaders) {
        headers['Authorization'] = authHeaders.Authorization as string
      }

      const response = await fetch(`${getApiBaseUrl()}/api/faqs`, {
        method: "POST",
        headers: headers,
        body: formData,
      })

      console.log("Response status:", response.status, response.statusText)

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        let errorMessage = "Failed to create FAQ"
        
        if (response.status === 413) {
          errorMessage = "File is too large. Maximum size is 10MB"
        } else if (contentType && contentType.includes("application/json")) {
          try {
            const error = await response.json()
            errorMessage = error.message || errorMessage
            console.error("Server error response:", error)
          } catch (parseError) {
            console.error("Failed to parse error response:", parseError)
            errorMessage = `Server error: ${response.status} ${response.statusText}`
          }
        } else {
          // Try to get text response for debugging
          try {
            const text = await response.text()
            console.error("Non-JSON error response:", text.substring(0, 500))
            errorMessage = `Server error: ${response.status} ${response.statusText}`
          } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`
          }
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      toast.success("Task completed and solution saved to FAQs!")
      
      // Reset form
      setProblem("")
      setSolutionFile(null)
      setTags("")
      
      onClose(true) // Close modal and refresh tasks
    } catch (error: any) {
      console.error("Error completing task:", error)
      toast.error(error.message || "Failed to complete task")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setProblem("")
      setSolutionFile(null)
      setTags("")
      onClose()
    }
  }

  // Auto-fill problem from task description
  useState(() => {
    if (task && !problem) {
      setProblem(task.task || "")
    }
  })

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Task with Solution</DialogTitle>
          <DialogDescription>
            {task?.srId && (
              <span className="font-mono text-primary">SR-ID: {task.srId}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="problem">Problem Description *</Label>
            <Textarea
              id="problem"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Describe the problem you solved..."
              rows={4}
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              This will be shown as the question in the FAQ section
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="solutionFile">Solution File *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="solutionFile"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                required
                disabled={loading}
                className="cursor-pointer"
              />
            </div>
            {solutionFile && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                solutionFile.size > 10 * 1024 * 1024 
                  ? 'bg-destructive/10 border border-destructive' 
                  : 'bg-muted'
              }`}>
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium truncate">
                  {solutionFile.name}
                </span>
                <span className={`text-xs ml-auto font-semibold ${
                  solutionFile.size > 10 * 1024 * 1024 
                    ? 'text-destructive' 
                    : 'text-muted-foreground'
                }`}>
                  {solutionFile.size > 1024 * 1024 
                    ? `${(solutionFile.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${(solutionFile.size / 1024).toFixed(1)} KB`}
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max 10MB)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (Optional)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. network, printer, software (comma-separated)"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Add tags to help others find this solution
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Complete Task & Save Solution"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
