"use client";

import { motion } from "framer-motion";
import { formatDate, getTaskDuration } from "@/lib/utils";
  // Get task duration (for closed tasks)
  const getTaskDurationDisplay = (task: DailyTask) => {
    if (task.status !== 'closed' || !task.closedAt || !task.createdAt) return null;
    return getTaskDuration(task.createdAt, task.closedAt);
  };
import {
  ClipboardList,
  Plus,
  Calendar,
  User,
  Building,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  BarChart3,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  RefreshCw,
  Eye,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DailyTask, NewDailyTask, Department, User as UserType } from "@/lib/types";
import { getApiBaseUrl } from "@/lib/api";
import { DailyTaskModal } from "@/components/modals/DailyTaskModal";
import { CompleteTaskModal } from "@/components/modals/CompleteTaskModal";
import { TaskViewModal } from "@/components/modals/TaskViewModal";
import { AddProgressModal } from "@/components/modals/AddProgressModal";
import { getAuthHeaders, requireAuth } from "@/lib/auth";
import { useState, useEffect, useCallback } from "react";
import { useSocket, useSocketEvent } from "@/hooks/useSocket";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface MyTasksDashboardProps {
  currentUserId: string;
  departments: Department[];
  users: UserType[];
}

export function MyTasksDashboard({ currentUserId, departments, users }: MyTasksDashboardProps) {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [allTasks, setAllTasks] = useState<DailyTask[]>([]); // For tracking multi-user SR-IDs
  
  // Map of SR-ID to array of users (for multi-user indication)
  const srIdToUsers: Record<string, Set<string>> = {};
  allTasks.forEach(task => {
    if (task.srId && task.srId.trim()) {
      // Get user ID from either object or string
      let userId = '';
      if (typeof task.user === 'object' && task.user?.id) {
        userId = String(task.user.id);
      } else if (typeof task.user === 'string') {
        userId = task.user;
      } else if (task.userId) {
        userId = String(task.userId);
      }
      
      const normalizedSrId = task.srId.trim().toLowerCase();
      if (!srIdToUsers[normalizedSrId]) {
        srIdToUsers[normalizedSrId] = new Set();
      }
      if (userId) {
        srIdToUsers[normalizedSrId].add(userId);
      }
    }
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [newTask, setNewTask] = useState<NewDailyTask>({
    task: "",
    srId: "",
    remarks: "",
    status: "in-progress",
    date: new Date().toISOString().split('T')[0],
    tags: [],
  });
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    closed: 0,
    escalated: 0,
  });
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [taskToEscalate, setTaskToEscalate] = useState<DailyTask | null>(null);
  const [escalationReason, setEscalationReason] = useState("");
  const [escalatedTo, setEscalatedTo] = useState("");
  const [completeTaskModalOpen, setCompleteTaskModalOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<DailyTask | null>(null);
  const [viewTaskModalOpen, setViewTaskModalOpen] = useState(false);
  const [taskToView, setTaskToView] = useState<DailyTask | null>(null);
  const [addProgressModalOpen, setAddProgressModalOpen] = useState(false);
  const [taskForProgress, setTaskForProgress] = useState<DailyTask | null>(null);

  // Socket.IO for real-time updates
  const { socket, isConnected } = useSocket();

  // Debug socket connection
  useEffect(() => {
    if (socket) {
      
      // Join user-specific room for escalated tasks
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (currentUser.id) {
        socket.emit("join-user-room", currentUser.id);
      }

      // Handle escalated tasks
      socket.on("task-assigned", (data) => {
        if (data.type === 'task-escalated') {
          alert(`New task assigned to you: ${data.message}`);
          // Refresh the task list to show the new escalated task
          fetchUserTasks();
        }
      });
      
      return () => {
        socket.off("task-assigned");
      };
    }
  }, [socket, isConnected]);

  // Fetch all tasks for multi-user SR-ID tracking
  const fetchAllTasksForSRTracking = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Handle different response formats
        let tasksArray: DailyTask[] = [];
        if (Array.isArray(data)) {
          tasksArray = data;
        } else if (data && Array.isArray(data.tasks)) {
          tasksArray = data.tasks;
        }
        
        setAllTasks(tasksArray);
      }
    } catch (err) {
      console.error("Failed to fetch all tasks for SR tracking", err);
    }
  };

  // Fetch user's daily tasks
  useEffect(() => {
    fetchUserTasks();
    // fetchEscalatedTasksCount(); // No longer needed - escalated count is calculated from main tasks
    fetchAllTasksForSRTracking();
  }, [currentUserId]);

  const fetchUserTasks = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks/user/${currentUserId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 401) {

          requireAuth();
          return;
        }
        throw new Error(`Failed to fetch daily tasks: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      
      // Calculate stats
      // Count escalated tasks that were escalated TO this user (where userRole is 'owner' and isEscalated is true)
      // Don't count tasks that this user escalated away (userRole is 'observer')
      const taskStats = {
        total: data.tasks?.length || 0,
        inProgress: data.tasks?.filter((task: DailyTask) => task.status === "in-progress").length || 0,
        closed: data.tasks?.filter((task: DailyTask) => task.status === "closed").length || 0,
        escalated: data.tasks?.filter((task: DailyTask) => 
          task.isEscalated === true && task.userRole === 'owner'
        ).length || 0, // Only count tasks escalated TO this user
      };
      setStats(taskStats);
    } catch (err) {
      console.error("Failed to fetch user daily tasks", err);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch escalated tasks count for current user
  const fetchEscalatedTasksCount = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks/escalated/${currentUserId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch escalated tasks: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      const escalatedCount = data.tasks?.length || 0;
      
      // Update stats with escalated count
      setStats(prevStats => ({
        ...prevStats,
        escalated: escalatedCount,
      }));
    } catch (err) {
      console.error("Failed to fetch escalated tasks count", err);
    }
  };

  // Simplified real-time event handler
  const handleRealtimeEvent = useCallback((data: any) => {

    
    // Check if the event affects current user
    const isRelevant = data.data && (
      data.data.user && data.data.user.id === currentUserId ||
      data.data.originalUser && data.data.originalUser.id === currentUserId ||
      data.data.escalatedBy && data.data.escalatedBy.id === currentUserId
    );
    
    if (isRelevant) {
      
      fetchUserTasks();
      // fetchEscalatedTasksCount(); // No longer needed
      fetchAllTasksForSRTracking();
    } else {
      
    }
  }, [currentUserId]);

  // Set up real-time event listeners with simplified approach
  useEffect(() => {
    if (!socket) return;
    socket.on('task-created', handleRealtimeEvent);
    socket.on('task-updated', handleRealtimeEvent);
    socket.on('task-deleted', handleRealtimeEvent);
    socket.on('task-escalated', handleRealtimeEvent);
    socket.on('task-rollback', handleRealtimeEvent);
    socket.on('task-status-updated', handleRealtimeEvent);

    return () => {
      socket.off('task-created', handleRealtimeEvent);
      socket.off('task-updated', handleRealtimeEvent);
      socket.off('task-deleted', handleRealtimeEvent);
      socket.off('task-escalated', handleRealtimeEvent);
      socket.off('task-rollback', handleRealtimeEvent);
      socket.off('task-status-updated', handleRealtimeEvent);
    };
  }, [socket, handleRealtimeEvent]);

  // Create task
  const handleCreateTask = async () => {
    if (newTask.task && newTask.remarks) {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks`, {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify(newTask),
        });
        
        if (!res.ok) {
          if (res.status === 401) {

            requireAuth();
            return;
          }
          const errorData = await res.json().catch(() => ({}));
          // Show user-friendly error message for date restrictions
          if (res.status === 403 && errorData.message) {
            alert(errorData.message);
          } else {
            throw new Error(errorData.error || `Failed to create daily task: ${res.status} ${res.statusText}`);
          }
          return;
        }
        
        const createdTask = await res.json();
        setTasks([createdTask, ...tasks]);
        setCreateTaskOpen(false);
        setNewTask({
          task: "",
          srId: "",
          remarks: "",
          status: "in-progress",
          date: new Date().toISOString().split('T')[0],
          tags: [],
        });
        fetchUserTasks(); // Refresh to update stats
      } catch (err) {
        console.error("Failed to create daily task", err);
        alert(`Failed to create daily task: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  // Update task status
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks/${taskId}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) {
        if (res.status === 401) {

          requireAuth();
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update task status: ${res.status} ${res.statusText}`);
      }
      
      const updated = await res.json();
      setTasks(tasks.map((task) => (task.id === updated.id ? updated : task)));
      fetchUserTasks(); // Refresh the task list
    } catch (err) {
      console.error("Failed to update task status", err);
      alert(`Failed to update task status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCompleteWithSolution = (task: DailyTask) => {
    setTaskToComplete(task);
    setCompleteTaskModalOpen(true);
  };

  const handleCompleteTaskModalClose = (refreshTasks?: boolean) => {
    setCompleteTaskModalOpen(false);
    setTaskToComplete(null);
    if (refreshTasks) {
      fetchUserTasks(); // Refresh the task list after completing with solution
    }
  };

  const handleViewTask = (task: DailyTask) => {
    setTaskToView(task);
    setViewTaskModalOpen(true);
  };

  const handleViewTaskModalClose = () => {
    setViewTaskModalOpen(false);
    setTaskToView(null);
  };

  const handleAddProgress = (task: DailyTask) => {
    setTaskForProgress(task);
    setAddProgressModalOpen(true);
  };

  const handleAddProgressModalClose = (refreshTasks?: boolean) => {
    setAddProgressModalOpen(false);
    setTaskForProgress(null);
    if (refreshTasks) {
      fetchUserTasks(); // Refresh the task list after adding progress
    }
  };

  // Get escalation details for tooltip
  const getEscalationDetails = (task: DailyTask) => {
    if (!task.isEscalated) return null;
    
    const escalatedBy = typeof task.escalatedBy === 'string' ? task.escalatedBy : task.escalatedBy?.name || 'Unknown';
    const escalatedTo = typeof task.escalatedTo === 'string' ? task.escalatedTo : task.escalatedTo?.name || 'Unknown';
    const escalatedAt = task.escalatedAt ? new Date(task.escalatedAt).toLocaleDateString() : 'Unknown date';
    const reason = task.escalationReason || 'No reason provided';
    
    return {
      escalatedBy,
      escalatedTo,
      escalatedAt,
      reason
    };
  };

  // Escalate task
  const handleEscalateTask = (task: DailyTask) => {
    setTaskToEscalate(task);
    setEscalationReason("");
    setEscalatedTo("");
    setEscalateDialogOpen(true);
  };

  const confirmEscalateTask = async () => {
    
    if (!taskToEscalate || !escalatedTo) {
      alert('Please select a user to escalate to.');
      return;
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks/${taskToEscalate.id}/escalate`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          escalatedToId: escalatedTo,
          escalationReason: escalationReason || 'No reason provided',
        }),
      });
      
      if (!res.ok) {
        if (res.status === 401) {

          requireAuth();
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to escalate task: ${res.status} ${res.statusText}`);
      }
      
      // Refresh tasks to show updated data
      fetchUserTasks();
      setEscalateDialogOpen(false);
      setTaskToEscalate(null);
      setEscalationReason("");
      setEscalatedTo("");
    } catch (err) {
      console.error("Failed to escalate task", err);
      alert(`Failed to escalate task: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Rollback escalated task
  const handleRollbackTask = async (taskId: string) => {
    // Confirm rollback action
    const confirmed = window.confirm(
      "Are you sure you want to rollback this task?\n\n" +
      "Note: Rollback is only allowed if the escalated user hasn't started working on it yet."
    );
    
    if (!confirmed) return;

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks/${taskId}/rollback`, {
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
        
        // Show user-friendly error message
        if (res.status === 403 && errorData.message) {
          alert(`Rollback Not Allowed\n\n${errorData.message}`);
        } else {
          throw new Error(errorData.error || `Failed to rollback task: ${res.status} ${res.statusText}`);
        }
        return;
      }
      
      // Success - refresh tasks to show updated data
      alert('Task rolled back successfully!');
      fetchUserTasks();
    } catch (err) {
      console.error("Failed to rollback task", err);
      alert(`Failed to rollback task: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = (task.srId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         task.remarks.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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


  // Task skeleton loading component
  const TaskCardSkeleton = () => (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-6 w-16 ml-4" />
      </div>
      
      <div className="space-y-2 mb-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 text-white rounded-3xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 bg-white/20" />
              <Skeleton className="h-4 w-96 bg-white/20" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-32 bg-white/20 rounded-2xl" />
            </div>
          </div>
        </div>
        
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        
        {/* Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Task Cards Skeleton */}
        <div className="grid gap-6">
          {[...Array(5)].map((_, i) => (
            <TaskCardSkeleton key={i} />
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
        className="overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">My Daily Tasks</h2>
            <p className="max-w-[600px] text-white/80">
              Track and manage your daily tasks and service requests.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-white/80" />
              <span className="text-2xl font-bold">{stats.total}</span>
              <span className="text-white/80">Total Tasks</span>
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-2xl border shadow-sm p-6"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Tasks</p>
            </div>
          </div>
        </motion.div>


        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-2xl border shadow-sm p-6"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white rounded-2xl border shadow-sm p-6"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.closed}</p>
              <p className="text-sm text-gray-600">Closed</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white rounded-2xl border shadow-sm p-6"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
              <ArrowUpRight className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.escalated}</p>
              <p className="text-sm text-gray-600">Escalated to Me</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Add Task Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setCreateTaskOpen(true)}
          className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Daily Task
        </Button>
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
          <TooltipProvider>
            {filteredTasks.map((task, index) => (
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
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
                        <ClipboardList className="h-6 w-6" />
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
                          {/* Show observer badge prominently if user is watching */}
                          {task.userRole === 'observer' && (
                            <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">
                              <Eye className="h-3 w-3 mr-1" />
                              You're Watching
                            </Badge>
                          )}
                          {task.isEscalated && task.userRole !== 'observer' && (
                            <Badge variant="outline" className="text-orange-600 border-orange-200">
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                              Escalated to You
                            </Badge>
                          )}
                          {task.srId && (
                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 inline-flex items-center gap-1">
                              <span className="font-mono text-xs">SR-{task.srId}</span>
                              {(() => {
                                const normalizedSrId = task.srId.trim().toLowerCase();
                                const hasMultipleUsers = srIdToUsers[normalizedSrId] && srIdToUsers[normalizedSrId].size > 1;
                                return hasMultipleUsers ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="ml-1 text-amber-600 flex items-center cursor-pointer">
                                          <Users className="h-3 w-3" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <span>
                                          Multiple users handling this task<br />
                                          <ul className="mt-1 ml-2 list-disc text-xs text-gray-800">
                                            {Array.from(srIdToUsers[normalizedSrId]).map((userId) => {
                                              const userObj = users.find(u => String(u.id) === String(userId));
                                              return (
                                                <li key={userId} className="mb-0.5">
                                                  {userObj?.name || userId}
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        </span>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : null;
                              })()}
                            </Badge>
                          )}
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
                      {task.status === 'closed' && task.closedAt && task.createdAt && (
                        <div className="col-span-2 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">Duration:</span>
                          </div>
                          <p className="text-sm text-gray-900">
                            {getTaskDurationDisplay(task)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Escalation Info */}
                    {task.isEscalated && (
                      <div className="space-y-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-orange-700">
                          <ArrowUpRight className="h-4 w-4" />
                          <span className="font-medium">Escalated to:</span>
                        </div>
                        <p className="text-sm text-orange-800">
                          {typeof task.escalatedTo === 'string' 
                            ? task.escalatedTo 
                            : task.escalatedTo?.name || 'Unknown'}
                        </p>
                        {task.escalationReason && (
                          <p className="text-xs text-orange-600 italic">
                            Reason: {task.escalationReason}
                          </p>
                        )}
                      </div>
                    )}

                    {task.tags && task.tags.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-600">Tags:</div>
                        <div className="flex flex-wrap gap-1">
                          {task.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {/* View Button - Always visible */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewTask(task)}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>

                      {/* Action buttons only for task owners, not observers */}
                      {task.userRole !== 'observer' && (
                        <>
                          {/* Add Progress Button - Only for in-progress tasks */}
                          {task.status === 'in-progress' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddProgress(task)}
                              className="text-purple-600 border-purple-200 hover:bg-purple-50"
                            >
                              <TrendingUp className="h-4 w-4 mr-1" />
                              Add Progress
                            </Button>
                          )}

                          {/* Status Change Button - Always visible for owners */}
                          {task.status === 'closed' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateTaskStatus(task.id, 'in-progress')}
                              className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Reopen
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => task.srId ? handleCompleteWithSolution(task) : handleUpdateTaskStatus(task.id, 'closed')}
                              className="text-green-600 border-green-200 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete{task.srId ? ' & Save Solution' : ''}
                            </Button>
                          )}
                          
                          {/* Escalate Button - Only show if not already escalated and task is not closed */}
                          {!task.isEscalated && task.status !== 'closed' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEscalateTask(task)}
                              className="text-orange-600 border-orange-200 hover:bg-orange-50"
                            >
                              <ArrowUpRight className="h-4 w-4 mr-1" />
                              Escalate
                            </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">Escalate Task</p>
                                <p className="text-xs text-gray-500">Click to escalate this task to another user</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </>
                      )}
                      
                      {/* Observer section - Show when user is watching an escalated task */}
                      {task.userRole === 'observer' && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50 cursor-help">
                                <Eye className="h-3 w-3 mr-1" />
                                Watching (Read-Only)
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">You're watching this task</p>
                              <p className="text-xs text-gray-500">You escalated this task. You can view progress but cannot edit.</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          {/* Rollback button for observer (original user) */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRollbackTask(task.id)}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <ArrowDownLeft className="h-4 w-4 mr-1" />
                                Rollback
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-medium">Rollback Task</p>
                              <p className="text-xs text-gray-500 mb-1">Return this task to you from the escalated user</p>
                              <p className="text-xs text-amber-600 italic">
                                ⚠️ Only allowed if no work has been done yet
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            ))}
          </TooltipProvider>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl border shadow-sm p-12 text-center"
          >
            <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Daily Tasks Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== "all"
                ? "No tasks match your current filters. Try adjusting your search criteria."
                : "You don't have any daily tasks yet. Create your first task to get started."}
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

      <DailyTaskModal
        isOpen={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        newTask={newTask}
        setNewTask={setNewTask}
        onCreateTask={handleCreateTask}
      />

      {/* Escalation Dialog */}
      <Dialog open={escalateDialogOpen} onOpenChange={setEscalateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Escalate Task</DialogTitle>
            <DialogDescription>
              Escalate this task to another user. They will be able to work on it and you can rollback if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="escalatedTo">Escalate to</Label>
              <Select value={escalatedTo} onValueChange={setEscalatedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(user => user.id !== currentUserId)
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="escalationReason">Reason for escalation (optional)</Label>
              <Textarea
                id="escalationReason"
                placeholder="Why are you escalating this task?"
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEscalateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmEscalateTask}
              disabled={!escalatedTo}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Escalate Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Task with Solution Modal */}
      <CompleteTaskModal
        isOpen={completeTaskModalOpen}
        onClose={handleCompleteTaskModalClose}
        task={taskToComplete}
      />

      {/* Task View Modal */}
      <TaskViewModal
        isOpen={viewTaskModalOpen}
        onClose={handleViewTaskModalClose}
        task={taskToView}
      />

      {/* Add Progress Modal */}
      <AddProgressModal
        isOpen={addProgressModalOpen}
        onClose={handleAddProgressModalClose}
        task={taskForProgress}
      />
    </div>
  );
}
