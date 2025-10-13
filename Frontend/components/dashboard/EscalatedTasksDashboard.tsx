"use client";

import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  User,
  Building,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Users,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DailyTask, Department, User as UserType } from "@/lib/types";
import { getAuthHeaders, requireAuth } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSocket, useSocketEvent } from "@/hooks/useSocket";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface EscalatedTasksDashboardProps {
  currentUserId: string;
  departments: Department[];
  users: UserType[];
}

export function EscalatedTasksDashboard({ currentUserId, departments, users }: EscalatedTasksDashboardProps) {
  const [escalatedTasks, setEscalatedTasks] = useState<DailyTask[]>([]);
  const [escalatedByMe, setEscalatedByMe] = useState<DailyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"escalated-to-me" | "escalated-by-me">("escalated-to-me");

  // Socket.IO for real-time updates
  const { socket, isConnected } = useSocket();

  // Fetch escalated tasks
  useEffect(() => {
    fetchEscalatedTasks();
  }, [currentUserId]);

  const fetchEscalatedTasks = async () => {
    try {
      setIsLoading(true);
      
      // Fetch tasks escalated to current user
      const escalatedToMeRes = await fetch(`${getApiBaseUrl()}/api/daily-tasks/escalated/${currentUserId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      
      if (escalatedToMeRes.ok) {
        const escalatedToMeData = await escalatedToMeRes.json();
        console.log("Escalated to me data:", escalatedToMeData);
        setEscalatedTasks(Array.isArray(escalatedToMeData.tasks) ? escalatedToMeData.tasks : []);
      }
      
      // Fetch tasks escalated by current user
      const escalatedByMeRes = await fetch(`${getApiBaseUrl()}/api/daily-tasks/escalated-by/${currentUserId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      
      if (escalatedByMeRes.ok) {
        const escalatedByMeData = await escalatedByMeRes.json();
        console.log("Escalated by me data:", escalatedByMeData);
        setEscalatedByMe(Array.isArray(escalatedByMeData.tasks) ? escalatedByMeData.tasks : []);
      }
    } catch (err) {
      console.error("Failed to fetch escalated tasks", err);
      setEscalatedTasks([]);
      setEscalatedByMe([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time event handlers
  const handleTaskUpdate = useCallback((data: any) => {
    console.log('Real-time task update received in EscalatedTasks:', data);
    
    // Refresh escalated tasks when any task is updated
    fetchEscalatedTasks();
  }, []);

  const handleTaskCreated = useCallback((data: any) => {
    console.log('Real-time task created in EscalatedTasks:', data);
    
    // Refresh escalated tasks when a new task is created (in case it's escalated)
    fetchEscalatedTasks();
  }, []);

  const handleTaskDeleted = useCallback((data: any) => {
    console.log('Real-time task deleted in EscalatedTasks:', data);
    
    // Remove the deleted task from local state
    setEscalatedTasks(prevTasks => prevTasks.filter(task => task.id !== data.data.id));
    setEscalatedByMe(prevTasks => prevTasks.filter(task => task.id !== data.data.id));
  }, []);

  const handleTaskEscalated = useCallback((data: any) => {
    console.log('Real-time task escalated in EscalatedTasks:', data);
    
    // Refresh escalated tasks when a task is escalated
    fetchEscalatedTasks();
  }, []);

  const handleTaskRollback = useCallback((data: any) => {
    console.log('Real-time task rollback in EscalatedTasks:', data);
    
    // Refresh escalated tasks when a task is rolled back
    fetchEscalatedTasks();
  }, []);

  const handleTaskStatusUpdated = useCallback((data: any) => {
    console.log('Real-time task status updated in EscalatedTasks:', data);
    
    // Refresh escalated tasks when status is updated
    fetchEscalatedTasks();
  }, []);

  // Set up real-time event listeners
  useSocketEvent(socket, 'task-update', handleTaskUpdate);
  useSocketEvent(socket, 'task-created', handleTaskCreated);
  useSocketEvent(socket, 'task-deleted', handleTaskDeleted);
  useSocketEvent(socket, 'task-escalated', handleTaskEscalated);
  useSocketEvent(socket, 'task-rollback', handleTaskRollback);
  useSocketEvent(socket, 'task-status-updated', handleTaskStatusUpdated);

  // Rollback escalated task
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [taskToRollback, setTaskToRollback] = useState<DailyTask | null>(null);

  const handleRollbackTask = (task: DailyTask) => {
    setTaskToRollback(task);
    setRollbackDialogOpen(true);
  };

  const confirmRollbackTask = async () => {
    if (!taskToRollback) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks/${taskToRollback.id}/rollback`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) {
          requireAuth();
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to rollback task: ${res.status} ${res.statusText}`);
      }
      setRollbackDialogOpen(false);
      setTaskToRollback(null);
      fetchEscalatedTasks();
    } catch (err) {
      console.error("Failed to rollback task", err);
      alert(`Failed to rollback task: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "in-progress":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "closed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "closed":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Filter tasks
  const currentTasks = activeTab === "escalated-to-me" ? escalatedTasks : escalatedByMe;
  const filteredTasks = currentTasks.filter((task) => {
    const matchesSearch = task.srId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.remarks.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-9 w-64 bg-white/20" />
              <Skeleton className="h-5 w-96 bg-white/20" />
            </div>
            <div className="flex gap-4">
              <div className="rounded-2xl bg-white/10 p-6">
                <Skeleton className="h-8 w-8 bg-white/20 mb-2" />
                <Skeleton className="h-6 w-16 bg-white/20 mb-1" />
                <Skeleton className="h-4 w-20 bg-white/20" />
              </div>
              <div className="rounded-2xl bg-white/10 p-6">
                <Skeleton className="h-8 w-8 bg-white/20 mb-2" />
                <Skeleton className="h-6 w-16 bg-white/20 mb-1" />
                <Skeleton className="h-4 w-20 bg-white/20" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-10 flex-1 max-w-sm" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Task Cards Skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 p-8 text-white"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Escalated Tasks</h2>
            <p className="max-w-[600px] text-white/80">
              Manage tasks that have been escalated to you or by you.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-8 w-8 text-white/80" />
              <span className="text-2xl font-bold">{escalatedTasks.length + escalatedByMe.length}</span>
              <span className="text-white/80">Total Escalated</span>
            </div>
            {/* <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm text-white/60">
                {isConnected ? 'Real-time Connected' : 'Disconnected'}
              </span>
            </div> */}
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("escalated-to-me")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "escalated-to-me"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ArrowDownLeft className="h-4 w-4" />
              Escalated to you ({escalatedTasks.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab("escalated-by-me")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "escalated-by-me"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Escalated by you ({escalatedByMe.length})
            </div>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by SR-ID or remarks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Task Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
                        <ArrowUpRight className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{task.task}</h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge 
                            variant="secondary"
                            className={`${getStatusColor(task.status)}`}
                          >
                            {getStatusIcon(task.status)}
                            <span className="ml-1 capitalize">{task.status}</span>
                          </Badge>
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            Escalated
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-sm">{task.remarks}</p>
                      </div>
                    </div>
                  </div>

                  {/* Task Details */}
                  <div className="lg:w-80 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building className="h-4 w-4" />
                          <span className="font-medium">Department:</span>
                        </div>
                        <p className="text-sm text-gray-900">
                          {typeof task.department === 'string' 
                            ? task.department 
                            : task.department?.name || 'Unknown'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">Date:</span>
                        </div>
                        <p className="text-sm text-gray-900">
                          {formatDate(task.date).split(',')[0]}
                        </p>
                      </div>
                    </div>

                    {/* Escalation Info */}
                    <div className="space-y-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-orange-700">
                        <ArrowUpRight className="h-4 w-4" />
                        <span className="font-medium">
                          {activeTab === "escalated-to-me" ? "Escalated to me by:" : "Escalated to:"}
                        </span>
                      </div>
                      <p className="text-sm text-orange-800">
                        {activeTab === "escalated-to-me" 
                          ? (typeof task.escalatedBy === 'string' 
                              ? task.escalatedBy 
                              : task.escalatedBy?.name || 'Unknown')
                          : (typeof task.escalatedTo === 'string' 
                              ? task.escalatedTo 
                              : task.escalatedTo?.name || 'Unknown')
                        }
                      </p>
                      {task.escalationReason && (
                        <p className="text-xs text-orange-600 italic">
                          Reason: {task.escalationReason}
                        </p>
                      )}
                      {task.escalatedAt && (
                        <p className="text-xs text-orange-600">
                          Escalated: {formatDate(task.escalatedAt).split(',')[0]}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      {activeTab === "escalated-by-me" && (() => {
                        // Use originalUser if available, otherwise fallback to escalatedBy
                        const originalUserId = task.originalUser || task.escalatedBy;
                        const canRollback = originalUserId && 
                          (typeof originalUserId === 'string' ? originalUserId : originalUserId.id) === currentUserId;
                        
                        return canRollback;
                      })() && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRollbackTask(task)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <ArrowDownLeft className="h-4 w-4 mr-1" />
                            Rollback
                          </Button>
                          {/* Rollback Confirmation Dialog */}
                          <Dialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <ArrowDownLeft className="h-6 w-6 text-blue-600" />
                                  Rollback Escalated Task
                                </DialogTitle>
                                <DialogDescription>
                                  <>
                                    <span className="block text-base font-medium text-gray-900">Are you sure you want to rollback this escalated task?</span>
                                    <span className="block text-sm text-gray-500 text-center">This will transfer the task back to you and remove escalation details. This action cannot be undone.</span>
                                    {taskToRollback && (
                                      <span className="block w-full mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
                                        <span className="block font-semibold text-blue-800">{taskToRollback.task}</span>
                                        <span className="block text-xs text-gray-600">SR-ID: {taskToRollback.srId}</span>
                                        <span className="block text-xs text-gray-600">Remarks: {taskToRollback.remarks}</span>
                                      </span>
                                    )}
                                  </>
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setRollbackDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={confirmRollbackTask} className="bg-blue-600 hover:bg-blue-700 text-white">
                                  Rollback Task
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                      {activeTab === "escalated-to-me" && (
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                          Assigned to You
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl border shadow-sm p-12 text-center"
          >
            <ArrowUpRight className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Escalated Tasks Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== "all"
                ? "No tasks match your current filters. Try adjusting your search criteria."
                : `You don't have any ${activeTab === "escalated-to-me" ? "tasks escalated to you" : "tasks escalated by you"} yet.`}
            </p>
            {(searchTerm || statusFilter !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
