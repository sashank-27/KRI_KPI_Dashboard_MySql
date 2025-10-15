"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Search, Filter, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
// Update the import path to the correct location of FAQModal, for example:
import { FAQModal } from "../modals/FAQModal"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { useSocket } from "@/hooks/useSocket"

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  order: number
  isActive: boolean
  createdBy?: {
    id: string
    name: string
    email: string
  }
  updatedBy?: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

const categories = [
  { value: "all", label: "All Categories" },
  { value: "general", label: "General" },
  { value: "tasks", label: "Tasks" },
  { value: "kra", label: "KRA" },
  { value: "departments", label: "Departments" },
  { value: "users", label: "Users" },
  { value: "other", label: "Other" },
]

export function FAQManagement() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null)
  const { socket } = useSocket()

  useEffect(() => {
    fetchFAQs()
  }, [])

  useEffect(() => {
    filterFAQs()
  }, [faqs, searchQuery, selectedCategory, statusFilter])

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
    socket.on('faq-stats-update', handleFAQRealTimeEvent);

    return () => {
      socket.off('faq-created', handleFAQRealTimeEvent);
      socket.off('faq-updated', handleFAQRealTimeEvent);
      socket.off('faq-status-toggled', handleFAQRealTimeEvent);
      socket.off('faq-stats-update', handleFAQRealTimeEvent);
    };
  }, [socket, handleFAQRealTimeEvent]);

  const fetchFAQs = async () => {
    try {
      setLoading(true)
      const response = await api.get("/faqs")
      setFaqs(response.data)
    } catch (error: any) {
      console.error("Error fetching FAQs:", error)
      toast.error(error.response?.data?.message || "Failed to fetch FAQs")
    } finally {
      setLoading(false)
    }
  }

  const filterFAQs = () => {
    let filtered = [...faqs]

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((faq) => faq.category === selectedCategory)
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((faq) => 
        statusFilter === "active" ? faq.isActive : !faq.isActive
      )
    }

    setFilteredFaqs(filtered)
  }

  const handleAddFaq = () => {
    setEditingFaq(null)
    setIsModalOpen(true)
  }

  const handleEditFaq = (faq: FAQ) => {
    setEditingFaq(faq)
    setIsModalOpen(true)
  }

  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return

    try {
      await api.delete(`/faqs/${id}`)
      toast.success("FAQ deleted successfully")
      fetchFAQs()
    } catch (error: any) {
      console.error("Error deleting FAQ:", error)
      toast.error(error.response?.data?.message || "Failed to delete FAQ")
    }
  }

  const handleModalClose = (refresh?: boolean) => {
    setIsModalOpen(false)
    setEditingFaq(null)
    if (refresh) {
      fetchFAQs()
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      general: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      tasks: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      kra: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      departments: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      users: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
      other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    }
    return colors[category] || colors.other
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">FAQ Management</h2>
          <p className="text-muted-foreground">
            Manage frequently asked questions
          </p>
        </div>
        <Button onClick={handleAddFaq}>
          <Plus className="mr-2 h-4 w-4" />
          Add FAQ
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* FAQ List */}
      <div className="grid gap-4">
        {filteredFaqs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No FAQs found</p>
            </CardContent>
          </Card>
        ) : (
          filteredFaqs.map((faq) => (
            <Card key={faq.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(faq.category)}>
                        {faq.category}
                      </Badge>
                      <Badge variant={faq.isActive ? "default" : "secondary"}>
                        {faq.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Order: {faq.order}
                      </span>
                    </div>
                    <CardTitle className="text-xl">{faq.question}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditFaq(faq)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteFaq(faq.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {faq.answer}
                </p>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  {faq.createdBy && (
                    <span>Created by: {faq.createdBy.name}</span>
                  )}
                  <span>
                    Created: {new Date(faq.createdAt).toLocaleDateString()}
                  </span>
                  {faq.updatedBy && (
                    <span>Updated by: {faq.updatedBy.name}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* FAQ Modal */}
      {isModalOpen && (
        <FAQModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          faq={editingFaq}
        />
      )}
    </div>
  )
}
