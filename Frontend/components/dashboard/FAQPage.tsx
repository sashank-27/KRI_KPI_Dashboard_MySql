"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, ChevronDown, ChevronUp, HelpCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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

export function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const { socket } = useSocket()

  useEffect(() => {
    fetchFAQs()
  }, [])

  useEffect(() => {
    filterFAQs()
  }, [faqs, searchQuery, selectedCategory])

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

  const fetchFAQs = async () => {
    try {
      setLoading(true)
      // Use the public endpoint to get active FAQs (no authentication required)
      const response = await api.get("/faqs/public")
      
      // The public endpoint already returns only active FAQs
      const activeFaqs = Array.isArray(response.data) ? response.data : []
      
      setFaqs(activeFaqs)
    } catch (error: any) {
      console.error("Error fetching FAQs - Full error:", error)
      console.error("Error response:", error?.response)
      console.error("Error data:", error?.response?.data)
      
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to load FAQs. Please check if you're logged in."
      toast.error(errorMessage)
      // Set empty array on error so UI doesn't break
      setFaqs([])
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

    // Filter by category (case-insensitive)
    if (selectedCategory !== "all") {
      filtered = filtered.filter((faq) => 
        faq.category.toLowerCase() === selectedCategory.toLowerCase()
      )
    }

    setFilteredFaqs(filtered)
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

  // Group FAQs by category (normalize to lowercase for grouping)
  const groupedFaqs = filteredFaqs.reduce((acc, faq) => {
    const categoryKey = faq.category.toLowerCase()
    if (!acc[categoryKey]) {
      acc[categoryKey] = []
    }
    acc[categoryKey].push(faq)
    return acc
  }, {} as Record<string, FAQ[]>)

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
          <Skeleton className="h-10 w-80 mx-auto" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
          </div>
          
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <HelpCircle className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Find answers to common questions about our KPI & Task mangement
        </p>
      </div>

      {/* Search and Filter */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </CardContent>
      </Card>

      {/* FAQ Content */}
      <div className="max-w-4xl mx-auto space-y-8">
        {filteredFaqs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No FAQs found matching your search
              </p>
            </CardContent>
          </Card>
        ) : selectedCategory === "all" ? (
          // Show grouped by category when "all" is selected
          Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getCategoryColor(category)}>
                  {categories.find((c) => c.value === category)?.label || category}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {categoryFaqs.length} {categoryFaqs.length === 1 ? "question" : "questions"}
                </span>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Accordion type="single" collapsible className="w-full">
                    {categoryFaqs.map((faq, index) => (
                      <AccordionItem key={faq.id} value={faq.id} className="border-b last:border-0">
                        <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 text-left">
                          <span className="font-medium">{faq.question}</span>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-4">
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {faq.answer}
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          ))
        ) : (
          // Show single category
          <Card>
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id} className="border-b last:border-0">
                    <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 text-left">
                      <span className="font-medium">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {faq.answer}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
