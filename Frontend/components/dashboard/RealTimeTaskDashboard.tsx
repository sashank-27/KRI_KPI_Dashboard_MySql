"use client";

import { motion, AnimatePresence } from "framer-motion";
import { formatDate, getTaskDuration } from "@/lib/utils";
import {
  ClipboardList,
  Plus,
  MoreHorizontal,
  PanelLeft,
  ArrowUpDown,
  Edit,
  Trash2,
  Calendar,
  User,
  Building,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Filter,
  BarChart3,
  Wifi,
  WifiOff,
  RefreshCw,
  Activity,
  TrendingUp,
  Users,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DailyTask, NewDailyTask, Department, User as UserType } from "@/lib/types";
import { getApiBaseUrl } from "@/lib/api";
import { DailyTaskModal } from "@/components/modals/DailyTaskModal";
import { getAuthHeaders, requireAuth, isAuthenticated } from "@/lib/auth";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface RealTimeTaskDashboardProps {
  departments: Department[];
  users: UserType[];
}

export function RealTimeTaskDashboard({ departments, users }: RealTimeTaskDashboardProps) {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  // Map of SR-ID to array of users (for multi-user indication)
  const srIdToUsers: Record<string, Set<string>> = {};
  tasks.forEach(task => {
    if (task.srId) {
      const userId = typeof task.user === 'object' ? task.user?.id : task.user;
      if (!srIdToUsers[task.srId]) srIdToUsers[task.srId] = new Set();
      if (userId) srIdToUsers[task.srId].add(userId);
    }
  });
  // Get current user from JWT
  const currentUser = (() => {
    if (typeof window !== 'undefined') {
      try {
        const token = document.cookie.split(';').find(cookie => cookie.trim().startsWith('jwtToken='));
        if (token) {
          const payload = JSON.parse(atob(token.split('=')[1].split('.')[1]));
          return { id: payload.id };
        }
      } catch {}
    }
    return null;
  })();
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<DailyTask | null>(null);
  const [newTask, setNewTask] = useState<NewDailyTask>({
    task: "",
    srId: "",
    remarks: "",
    status: "in-progress",
    date: new Date().toISOString().split('T')[0],
    tags: [],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    closed: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  // Removed recentActivity and showActivity state (Live Activity feature removed)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [escalateTaskOpen, setEscalateTaskOpen] = useState(false);
  const [taskToEscalate, setTaskToEscalate] = useState<DailyTask | null>(null);
  const [escalateToUser, setEscalateToUser] = useState<string>("");
  const [escalationReason, setEscalationReason] = useState<string>("");

  // Use the shared socket hook
  const { socket, isConnected: socketConnected } = useSocket();
  
  // Update isConnected state when socket connection changes
  useEffect(() => {
    setIsConnected(socketConnected && realtimeEnabled);
  }, [socketConnected, realtimeEnabled]);

  // Socket event handlers
  const handleNewTask = useCallback((task: DailyTask) => {
    console.log('📥 New task received:', task.id);
    setTasks(prev => {
      // Check if task already exists to prevent duplicates
      const exists = prev.some(t => t.id === task.id);
      if (exists) {
        console.log('⚠️  Task already exists, skipping:', task.id);
        return prev;
      }
      console.log('✅ Adding new task:', task.id);
      return [task, ...prev];
    });
    setLastUpdate(new Date());
    fetchStats();
  }, []);

  const handleTaskUpdated = useCallback((task: DailyTask) => {
    console.log('🔄 Task updated:', task.id);
    setTasks(prev => {
      const taskExists = prev.some(t => t.id === task.id);
      if (taskExists) {
        // Update existing task
        return prev.map(t => t.id === task.id ? task : t);
      } else {
        // Task might be newly visible due to filter changes, add it
        return [task, ...prev];
      }
    });
    setLastUpdate(new Date());
    fetchStats();
  }, []);

  const handleTaskDeleted = useCallback((data: { id: string }) => {
    console.log('🗑️  Task deleted:', data.id);
    setTasks(prev => prev.filter(t => t.id !== data.id));
    setLastUpdate(new Date());
    fetchStats();
  }, []);

  const handleTaskStatusUpdated = useCallback((task: DailyTask) => {
    console.log('📊 Task status updated:', task.id);
    setTasks(prev => {
      const taskExists = prev.some(t => t.id === task.id);
      if (taskExists) {
        return prev.map(t => t.id === task.id ? task : t);
      } else {
        return [task, ...prev];
      }
    });
    setLastUpdate(new Date());
    fetchStats();
  }, []);

  const handleTaskEscalated = useCallback((task: DailyTask) => {
    console.log('🚀 Task escalated:', task.id);
    setTasks(prev => {
      const taskExists = prev.some(t => t.id === task.id);
      if (taskExists) {
        return prev.map(t => t.id === task.id ? task : t);
      } else {
        return [task, ...prev];
      }
    });
    setLastUpdate(new Date());
    fetchStats();
  }, []);

  const handleTaskRolledBack = useCallback((task: DailyTask) => {
    console.log('↩️  Task rolled back:', task.id);
    setTasks(prev => {
      const taskExists = prev.some(t => t.id === task.id);
      if (taskExists) {
        return prev.map(t => t.id === task.id ? task : t);
      } else {
        return [task, ...prev];
      }
    });
    setLastUpdate(new Date());
    fetchStats();
  }, []);

  const handleStatsUpdate = useCallback(() => {
    console.log('📈 Stats update triggered');
    fetchStats();
  }, []);

  const handleTaskProgressAdded = useCallback((data: any) => {
    console.log('📝 Task progress added:', data.taskId);
    // Refresh the task to get updated progress
    setTasks(prev => {
      const taskIndex = prev.findIndex(t => t.id === data.taskId);
      if (taskIndex !== -1) {
        // Task exists, trigger a refresh by updating its timestamp
        const updatedTasks = [...prev];
        updatedTasks[taskIndex] = { 
          ...updatedTasks[taskIndex], 
          updatedAt: new Date().toISOString() 
        };
        return updatedTasks;
      }
      return prev;
    });
  }, []);

  // Set up socket event listeners only when realtime is enabled
  useEffect(() => {
    if (!realtimeEnabled || !socket) return;

    console.log('🎧 Setting up socket event listeners');

    socket.on('new-task', handleNewTask);
    socket.on('task-updated', handleTaskUpdated);
    socket.on('task-deleted', handleTaskDeleted);
    socket.on('task-status-updated', handleTaskStatusUpdated);
    socket.on('task-escalated', handleTaskEscalated);
    socket.on('task-rolled-back', handleTaskRolledBack);
    socket.on('task-stats-update', handleStatsUpdate);
    socket.on('task-progress-added', handleTaskProgressAdded);

    return () => {
      console.log('🔇 Removing socket event listeners');
      socket.off('new-task', handleNewTask);
      socket.off('task-updated', handleTaskUpdated);
      socket.off('task-deleted', handleTaskDeleted);
      socket.off('task-status-updated', handleTaskStatusUpdated);
      socket.off('task-escalated', handleTaskEscalated);
      socket.off('task-rolled-back', handleTaskRolledBack);
      socket.off('task-stats-update', handleStatsUpdate);
      socket.off('task-progress-added', handleTaskProgressAdded);
    };
  }, [socket, realtimeEnabled, handleNewTask, handleTaskUpdated, handleTaskDeleted, 
      handleTaskStatusUpdated, handleTaskEscalated, handleTaskRolledBack, 
      handleStatsUpdate, handleTaskProgressAdded]);

  // Debounce search term - removed backend fetch trigger since search is client-side only
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch ALL tasks from backend on initial load for proper search functionality
  useEffect(() => {
    fetchTasks(1, 9999, true); // Load all tasks initially
    fetchStats();
  }, []);

  // Clean up any duplicate tasks on mount
  useEffect(() => {
    setTasks(prev => {
      const seen = new Set();
      return prev.filter(task => {
        if (seen.has(task.id)) {
          return false;
        }
        seen.add(task.id);
        return true;
      });
    });
  }, []);

  // Recalculate stats when tasks change (as backup to API stats)
  useEffect(() => {
    if (tasks.length > 0) {
      const localStats = {
        total: tasks.length,
        inProgress: tasks.filter(task => task.status === 'in-progress').length,
        closed: tasks.filter(task => task.status === 'closed').length,
      };
      
      // Only update if we don't have stats from API or if local calculation gives different results
      setStats(prevStats => {
        if (prevStats.total === 0 || 
            (localStats.total !== prevStats.total && tasks.length > 0)) {
          return localStats;
        }
        return prevStats;
      });
    }
  }, [tasks]);

  const fetchTasks = async (page = 1, limit = itemsPerPage, reset = false) => {
    try {
      if (reset) {
        setIsInitialLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      // Check authentication status
      const authHeaders = getAuthHeaders();
      
      if (!isAuthenticated()) {
        requireAuth();
        return;
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      // Note: Search is handled client-side for better name/user search support
      // Backend search doesn't support user name searching
      
      // Add status filter if not 'all'
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      // Add department filter if not 'all'
      if (departmentFilter && departmentFilter !== 'all') {
        params.append('department', departmentFilter);
      }
      
      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks?${params.toString()}`, {
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
      const tasksData = Array.isArray(data.tasks) ? data.tasks : (Array.isArray(data) ? data : []);
      
      // Deduplicate tasks by id
      const deduplicateTasks = (tasks: DailyTask[]) => {
        const seen = new Set();
        return tasks.filter(task => {
          if (seen.has(task.id)) {
            return false;
          }
          seen.add(task.id);
          return true;
        });
      };
      
      if (reset) {
        setTasks(deduplicateTasks(tasksData));
        setCurrentPage(1);
      } else {
        setTasks(prev => deduplicateTasks([...prev, ...tasksData]));
      }
      
      // Check if there's more data
      setHasMoreData(tasksData.length === limit);
    } catch (err) {
      console.error("Failed to fetch daily tasks", err);
      if (err instanceof Error) {
        console.error("Error details:", {
          message: err.message,
          name: err.name,
          stack: err.stack
        });
        // Check if it's a network error
        if (err.message === 'Failed to fetch') {
          console.error("Network error: Backend server might not be running on http://localhost:5000");
          alert("Unable to connect to server. Please ensure the backend server is running on http://localhost:5000");
        }
      }
      setTasks([]);
    } finally {
      setIsLoadingMore(false);
      setIsInitialLoading(false);
    }
  };

  // Load more tasks
  const loadMoreTasks = () => {
    if (!isLoadingMore && hasMoreData) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchTasks(nextPage, itemsPerPage, false);
    }
  };

  // Handle search and filter changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to page 1 when searching
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
    fetchTasks(1, 9999, true); // Load all tasks with status filter
  };

  const handleDepartmentFilterChange = (value: string) => {
    setDepartmentFilter(value);
    setCurrentPage(1);
    fetchTasks(1, 9999, true); // Load all tasks with department filter
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      // Check authentication status
      const authHeaders = getAuthHeaders();
      
      if (!isAuthenticated()) {
        requireAuth();
        return;
      }
      
      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks/stats`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Map backend response to frontend state structure
        const mappedStats = {
          total: data.totalTasks || 0,
          inProgress: data.pendingTasks || 0,
          closed: data.completedTasks || 0,
        };
        
        setStats(mappedStats);
      } else {
        console.error('Failed to fetch stats:', res.status, res.statusText);
        // If API fails, try to calculate from local tasks
        if (tasks.length > 0) {
          const localStats = {
            total: tasks.length,
            inProgress: tasks.filter(task => task.status === 'in-progress').length,
            closed: tasks.filter(task => task.status === 'closed').length,
          };
          setStats(localStats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch daily task stats", err);
      // If API fails, try to calculate from local tasks
      if (tasks.length > 0) {
        const localStats = {
          total: tasks.length,
          inProgress: tasks.filter(task => task.status === 'in-progress').length,
          closed: tasks.filter(task => task.status === 'closed').length,
        };
        setStats(localStats);
      }
      
      if (err instanceof Error) {
        console.error("Error details:", {
          message: err.message,
          name: err.name,
          stack: err.stack
        });
        // Check if it's a network error
        if (err.message === 'Failed to fetch') {
          console.error("Network error: Backend server might not be running on http://localhost:5000");
        }
      }
    } finally {
      setStatsLoading(false);
    }
  };

  // Create task
  const handleCreateTask = async () => {
    if (newTask.srId && newTask.remarks) {
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
          throw new Error(errorData.error || `Failed to create daily task: ${res.status} ${res.statusText}`);
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
        fetchStats();
      } catch (err) {
        console.error("Failed to create daily task", err);
        alert(`Failed to create daily task: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  // Edit task
  const handleEditTask = (task: DailyTask) => {
    setEditingTask(task);
    setEditTaskOpen(true);
  };

  // Update task
  const handleUpdateTask = async (updatedTask: DailyTask) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks/${updatedTask.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(updatedTask),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          
          requireAuth();
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update daily task: ${res.status} ${res.statusText}`);
      }
      
      const updated = await res.json();
      setTasks(tasks.map((task) => (task.id === updated.id ? updated : task)));
      setEditTaskOpen(false);
      setEditingTask(null);
      fetchStats();
    } catch (err) {
      console.error("Failed to update daily task", err);
      alert(`Failed to update daily task: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
    setEscalateTaskOpen(true);
  };

  const confirmEscalateTask = async () => {
    if (taskToEscalate && escalateToUser) {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks/${taskToEscalate.id}/escalate`, {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            escalatedTo: escalateToUser,
            escalationReason: escalationReason
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
        
        const updated = await res.json();
        setTasks(tasks.map((task) => (task.id === updated.id ? updated : task)));
        setEscalateTaskOpen(false);
        setTaskToEscalate(null);
        setEscalateToUser("");
        setEscalationReason("");
        fetchStats();
      } catch (err) {
        console.error("Failed to escalate task", err);
        alert(`Failed to escalate task: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  // Delete task
  const handleDeleteTask = (task: DailyTask) => {
    setTaskToDelete(task);
    setDeleteTaskOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (taskToDelete) {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks/${taskToDelete.id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
          credentials: "include",
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            
            requireAuth();
            return;
          }
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to delete daily task: ${res.status} ${res.statusText}`);
        }
        
        setTasks(tasks.filter((task) => task.id !== taskToDelete.id));
        setDeleteTaskOpen(false);
        setTaskToDelete(null);
        fetchStats();
      } catch (err) {
        console.error("Failed to delete daily task", err);
        alert(`Failed to delete daily task: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  // Handle task selection
  const handleTaskSelect = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(task => task.id));
    }
    setSelectAll(!selectAll);
  };

  // Bulk delete selected tasks
  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;
    
    try {
      const deletePromises = selectedTasks.map(taskId => 
        fetch(`${getApiBaseUrl()}/api/daily-tasks/${taskId}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
          credentials: "include",
        })
      );
      
      await Promise.all(deletePromises);
      setTasks(tasks.filter(task => !selectedTasks.includes(task.id)));
      setSelectedTasks([]);
      setSelectAll(false);
      fetchStats();
    } catch (err) {
      console.error("Failed to delete selected tasks", err);
      alert(`Failed to delete selected tasks: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "new":
        return <Plus className="h-4 w-4 text-green-500" />;
      case "update":
        return <Edit className="h-4 w-4 text-blue-500" />;
      case "delete":
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case "status":
        return <RefreshCw className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  // Filter tasks
  const filteredTasks = (tasks || []).filter((task) => {
    const searchLower = searchTerm.toLowerCase();
    
    // Extract user name from different possible fields
    const getUserName = (userField: string | { id: string; name: string; email: string } | undefined): string => {
      if (!userField) return '';
      return typeof userField === 'string' ? userField : (userField.name || '');
    };
    
    const userName = getUserName(task.user);
    const createdByName = getUserName(task.createdBy);
    const escalatedToName = getUserName(task.escalatedTo);
    const escalatedByName = getUserName(task.escalatedBy);
    const originalUserName = getUserName(task.originalUser);
    
    // Extract department name
    const departmentName = typeof task.department === 'string' 
      ? task.department 
      : (task.department?.name || '');
    
    // Search in multiple fields
    const matchesSearch = 
      (task.task?.toLowerCase() || '').includes(searchLower) ||
      (task.remarks?.toLowerCase() || '').includes(searchLower) ||
      (task.srId?.toLowerCase() || '').includes(searchLower) ||
      userName.toLowerCase().includes(searchLower) ||
      createdByName.toLowerCase().includes(searchLower) ||
      escalatedToName.toLowerCase().includes(searchLower) ||
      escalatedByName.toLowerCase().includes(searchLower) ||
      originalUserName.toLowerCase().includes(searchLower) ||
      departmentName.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesDepartment = departmentFilter === "all" || 
      (typeof task.department === 'string' ? task.department === departmentFilter : task.department?.id === departmentFilter);
    
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  // Client-side pagination: slice the filtered tasks for display
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);
  const totalFilteredPages = Math.ceil(filteredTasks.length / itemsPerPage);

  return (
    <>
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold">Tasks Dashboard</h2>
                {/* <div className="flex items-center gap-2">
                  {isConnected ? (
                    <Wifi className="h-5 w-5 text-green-300" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-red-300" />
                  )}
                  <span className="text-sm text-white/80">
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div> */}
              </div>
              <p className="max-w-[600px] text-white/80">
                Monitor and manage daily tasks submitted by users across all departments with real-time updates.
              </p>
              {/* <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="realtime-toggle" className="text-white/80">Real-time</Label>
                  <Switch
                    id="realtime-toggle"
                    checked={realtimeEnabled}
                    onCheckedChange={setRealtimeEnabled}
                  />
                </div>
              </div> */}
            </div>
            <div className="flex gap-2">
              {/* Live Activity toggle button removed */}
              <Button
                className="rounded-2xl bg-white text-emerald-700 hover:bg-white/90 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg"
                onClick={() => setCreateTaskOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Daily Task
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      <div className="grid grid-cols-1 gap-6 transition-all duration-500 ease-in-out">
        {/* Statistics Cards */}
        <div className="space-y-6 transition-all duration-500 ease-in-out">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <p className="text-2xl font-bold text-gray-900">
                    {statsLoading ? '...' : stats.total}
                  </p>
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
                  <p className="text-2xl font-bold text-gray-900">
                    {statsLoading ? '...' : stats.inProgress}
                  </p>
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
                  <p className="text-2xl font-bold text-gray-900">
                    {statsLoading ? '...' : stats.closed}
                  </p>
                  <p className="text-sm text-gray-600">Closed</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, SR-ID, task, remarks, or department..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 transition-all duration-200 ease-in-out focus:scale-105 focus:shadow-md"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger className="w-40 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={handleDepartmentFilterChange}>
                  <SelectTrigger className="w-48 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">All Daily Tasks</h3>
                  {selectedTasks.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {selectedTasks.length} selected
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        className="rounded-2xl transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Show:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                      setItemsPerPage(parseInt(value));
                      setCurrentPage(1);
                      fetchTasks(1, parseInt(value), true);
                    }}>
                      <SelectTrigger className="w-20 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-2xl transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md">
                    <PanelLeft className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-2xl transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Sort
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <TooltipProvider>
                <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SR ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isInitialLoading ? (
                    // Loading skeleton
                    Array.from({ length: itemsPerPage }).map((_, idx) => (
                      <tr key={`skeleton-${idx}`}>
                        <td className="px-6 py-4 w-12">
                          <Skeleton className="h-4 w-4" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Skeleton className="h-8 w-8 rounded-full mr-3" />
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <AnimatePresence>
                      {Array.isArray(paginatedTasks) && paginatedTasks.length > 0 ? paginatedTasks.map((task, idx) => (
                      <motion.tr
                        key={`${task.id}-${idx}-${task.updatedAt || task.createdAt || Date.now()}`}
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.98 }}
                        transition={{ 
                          duration: 0.4, 
                          delay: idx * 0.03,
                          ease: "easeOut"
                        }}
                        className="hover:bg-gray-50/50 transition-all duration-300 ease-in-out hover:shadow-sm"
                      >
                        {/* Checkbox */}
                        <td className="px-6 py-4 w-12">
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task.id)}
                            onChange={() => handleTaskSelect(task.id)}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 transition-all duration-200 ease-in-out hover:scale-110 hover:shadow-sm"
                          />
                        </td>
                        {/* Task Details */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-900 line-clamp-2">
                              {task.task || 'No task description'}
                            </p>
                            {task.remarks && (
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {task.remarks}
                              </p>
                            )}
                          </div>
                        </td>
                        
                        {/* SR ID with multi-user indication */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 font-mono flex items-center gap-1">
                            {task.srId || 'N/A'}
                            {task.srId && srIdToUsers[task.srId] && srIdToUsers[task.srId].size > 1 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="ml-1 text-amber-600 flex items-center cursor-pointer">
                                    <Users className="h-4 w-4 mr-0.5" />
                                    <span className="text-xs font-semibold">Multi-user</span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <span>
                                    This Task was handling by <br />
                                    <ul className="mt-1 ml-2 list-disc text-xs text-gray-800">
                                      {Array.from(srIdToUsers[task.srId]).map((userId) => {
                                        const userObj = users.find(u => u.id === userId);
                                        return (
                                          <li key={userId} className="mb-0.5">
                                            {userObj ? `${userObj.name || userObj.email}` : userId}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </span>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </span>
                        </td>
                        
                        {/* User */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                <User className="h-4 w-4 text-white" />
                              </div>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                {typeof task.user === 'string' 
                                  ? task.user 
                                  : task.user?.name || 'Unknown'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {typeof task.user === 'object' && task.user?.email 
                                  ? task.user.email 
                                  : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        
                        {/* Department */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Building className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {typeof task.department === 'string' 
                                ? task.department 
                                : task.department?.name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        
                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(task.status || 'in-progress')}
                            <Badge 
                              variant="secondary"
                              className={`ml-2 text-xs ${getStatusColor(task.status || 'in-progress')}`}
                            >
                              {task.status || 'in-progress'}
                            </Badge>
                          </div>
                        </td>
                        

                        {/* Date */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-1" />
                            {task.date ? new Date(task.date).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            {task.status === 'closed' && task.closedAt && task.createdAt
                              ? getTaskDuration(task.createdAt, task.closedAt)
                              : '-'}
                          </div>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {/* Escalate Button - only show for in-progress (not closed), not escalated, and owned tasks */}
                            {task.status === 'in-progress' && !task.isEscalated && currentUser &&
                              ((typeof task.user === 'string' && task.user === currentUser.id) ||
                               (typeof task.user === 'object' && task.user?.id === currentUser.id)) && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEscalateTask(task)}
                                      className="h-8 px-3 hover:bg-orange-100 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md text-orange-700 border-orange-300"
                                    >
                                      <ArrowUpDown className="h-4 w-4 mr-1" />
                                      Escalate
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-medium">Escalate Task</p>
                                    <p className="text-xs text-gray-500">Click to escalate this task to another user</p>
                                  </TooltipContent>
                                </Tooltip>
                            )}
                            
                            {/* Escalated Task Info - show escalation details */}
                            {task.isEscalated && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center space-x-1 text-orange-600">
                                    <ArrowUpDown className="h-4 w-4" />
                                    <span className="text-sm font-medium">Escalated</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <div className="space-y-1">
                                    <p className="font-medium text-orange-600">Task Escalated</p>
                                    {(() => {
                                      const details = getEscalationDetails(task);
                                      if (!details) return <p className="text-xs">No escalation details available</p>;
                                      return (
                                        <>
                                          <p className="text-xs"><span className="font-medium">From:</span> {details.escalatedBy}</p>
                                          <p className="text-xs"><span className="font-medium">To:</span> {details.escalatedTo}</p>
                                          <p className="text-xs"><span className="font-medium">Date:</span> {details.escalatedAt}</p>
                                          {details.reason && (
                                            <p className="text-xs"><span className="font-medium">Reason:</span> {details.reason}</p>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTask(task)}
                              className="h-8 w-8 p-0 hover:bg-blue-100 transition-all duration-200 ease-in-out hover:scale-110 hover:shadow-md"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task)}
                              className="h-8 w-8 p-0 hover:bg-red-100 transition-all duration-200 ease-in-out hover:scale-110 hover:shadow-md"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                      )) : (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No daily tasks found</p>
                            <p className="text-sm">Create your first daily task to get started.</p>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
              </TooltipProvider>
            </div>
            
            {/* Pagination Info and Controls */}
            <div className="px-6 py-4 border-t bg-gray-50">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredTasks.length)} of {filteredTasks.length} tasks
                  {tasks.length > filteredTasks.length && ` (filtered from ${tasks.length} total)`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="rounded-2xl transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600 px-4">
                    Page {currentPage} of {totalFilteredPages || 1}
                  </span>
                  <Button
                    onClick={() => setCurrentPage(Math.min(totalFilteredPages, currentPage + 1))}
                    disabled={currentPage >= totalFilteredPages}
                    variant="outline"
                    size="sm"
                    className="rounded-2xl transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Activity section removed */}
      </div>

      <DailyTaskModal
        isOpen={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        newTask={newTask}
        setNewTask={setNewTask}
        onCreateTask={handleCreateTask}
      />

      {editingTask && (
        <DailyTaskModal
          isOpen={editTaskOpen}
          onClose={() => {
            setEditTaskOpen(false);
            setEditingTask(null);
          }}
          newTask={{
            task: editingTask.task,
            srId: editingTask.srId,
            remarks: editingTask.remarks,
            status: editingTask.status,
            date: editingTask.date.split('T')[0],
            tags: editingTask.tags,
          }}
          setNewTask={(updatedTask) => {
            setEditingTask({
              ...editingTask,
              ...updatedTask,
            });
          }}
          onCreateTask={() => {
            if (editingTask) {
              handleUpdateTask(editingTask);
            }
          }}
          isEdit={true}
        />
      )}

      <AlertDialog open={deleteTaskOpen} onOpenChange={setDeleteTaskOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              daily task <strong>{taskToDelete?.srId}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTask}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Escalate Task Modal */}
      <AlertDialog open={escalateTaskOpen} onOpenChange={setEscalateTaskOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Escalate Task</AlertDialogTitle>
            <AlertDialogDescription>
              Escalate this task to another user. The task will be transferred to the selected user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="escalate-user">Escalate to User</Label>
              <Select value={escalateToUser} onValueChange={setEscalateToUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="escalation-reason">Reason for Escalation (Optional)</Label>
              <Input
                id="escalation-reason"
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Enter reason for escalation..."
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setEscalateTaskOpen(false);
              setTaskToEscalate(null);
              setEscalateToUser("");
              setEscalationReason("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmEscalateTask}
              disabled={!escalateToUser}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Escalate Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
