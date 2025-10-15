"use client";

import { motion } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DailyTask, NewDailyTask, Department, User as UserType } from "@/lib/types";
import { DailyTaskModal } from "@/components/modals/DailyTaskModal";
import { getAuthHeaders, requireAuth } from "@/lib/auth";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket, useSocketEvent } from "@/hooks/useSocket";
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

interface DailyTaskManagementProps {
  departments: Department[];
  users: UserType[];
}

export function DailyTaskManagement({ departments, users }: DailyTaskManagementProps) {
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
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
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Socket.IO for real-time updates
  const { socket, isConnected } = useSocket();

  // Real-time event handlers
  const handleTaskUpdate = useCallback((data: any) => {
    
    // Update the specific task in the list
    if (data.data && data.data.id) {
      setTasks(prev => prev.map(t => t.id === data.data.id ? data.data : t));
    }
    
    // Refresh stats
    fetchStats();
  }, []);

  const handleTaskCreated = useCallback((data: any) => {
    
    // Add the new task to the list
    if (data.data) {
      setTasks(prev => [data.data, ...prev]);
    }
    
    // Refresh stats
    fetchStats();
  }, []);

  const handleTaskDeleted = useCallback((data: any) => {
    
    // Remove the deleted task from the list
    if (data.data && data.data.id) {
      setTasks(prev => prev.filter(t => t.id !== data.data.id));
    }
    
    // Refresh stats
    fetchStats();
  }, []);

  const handleTaskEscalated = useCallback((data: any) => {
    
    // Update the escalated task in the list
    if (data.data && data.data.id) {
      setTasks(prev => prev.map(t => t.id === data.data.id ? data.data : t));
    }
    
    // Refresh stats
    fetchStats();
  }, []);

  const handleTaskRollback = useCallback((data: any) => {
    
    // Update the rolled back task in the list
    if (data.data && data.data.id) {
      setTasks(prev => prev.map(t => t.id === data.data.id ? data.data : t));
    }
    
    // Refresh stats
    fetchStats();
  }, []);

  // Set up real-time event listeners
  useSocketEvent(socket, 'task-updated', handleTaskUpdate);
  useSocketEvent(socket, 'new-task', handleTaskCreated);
  useSocketEvent(socket, 'task-deleted', handleTaskDeleted);
  useSocketEvent(socket, 'task-escalated', handleTaskEscalated);
  useSocketEvent(socket, 'task-rolled-back', handleTaskRollback);
  
  // Listen for stats updates to refresh data
  useSocketEvent(socket, 'task-stats-update', () => {
    fetchTasks();
  });

  // Join admin room when connected
  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('join-admin-room');
    }
  }, [socket, isConnected]);

  // Fetch tasks from backend
  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, []);

  const fetchTasks = async () => {
    try {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const res = await fetch(`${apiUrl}/api/daily-tasks`, {
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
    } catch (err) {
      console.error("Failed to fetch daily tasks", err);
      setTasks([]);
    }
  };

  const fetchStats = async () => {
    try {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const res = await fetch(`${apiUrl}/api/daily-tasks/stats`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch daily task stats", err);
    }
  };

  // Create task
  const handleCreateTask = async () => {
    if (newTask.srId && newTask.remarks) {
      try {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const res = await fetch(`${apiUrl}/api/daily-tasks`, {
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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const res = await fetch(`${apiUrl}/api/daily-tasks/${updatedTask.id}`, {
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

  // Delete task
  const handleDeleteTask = (task: DailyTask) => {
    setTaskToDelete(task);
    setDeleteTaskOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (taskToDelete) {
      try {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const res = await fetch(`${apiUrl}/api/daily-tasks/${taskToDelete.id}`, {
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const deletePromises = selectedTasks.map(taskId =>
        fetch(`${apiUrl}/api/daily-tasks/${taskId}`, {
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


  // Filter tasks
  const filteredTasks = (tasks || []).filter((task) => {
    const matchesSearch = (task.task?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (task.remarks?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesDepartment = departmentFilter === "all" || 
      (typeof task.department === 'string' ? task.department === departmentFilter : task.department?.id === departmentFilter);
    
    return matchesSearch && matchesStatus && matchesDepartment;
  });

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
                <h2 className="text-3xl font-bold">Daily Task Management</h2>
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <div className="flex items-center gap-1 text-green-300">
                      <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                      <span className="text-sm">Live</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-300">
                      <div className="w-2 h-2 bg-red-300 rounded-full"></div>
                      <span className="text-sm">Offline</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="max-w-[600px] text-white/80">
                Manage and track daily tasks submitted by users across all departments.
                {realtimeEnabled ? " Real-time updates enabled." : " Real-time updates disabled."}
              </p>
            </div>
            <Button
              className="rounded-2xl bg-white text-emerald-700 hover:bg-white/90 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg"
              onClick={() => setCreateTaskOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Daily Task
            </Button>
          </div>
        </motion.div>
      </section>

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
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by task or remarks..."
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
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-48">
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

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">All Daily Tasks</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-2xl">
              <PanelLeft className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm" className="rounded-2xl">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Sort
            </Button>
          </div>
        </div>

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
              <div className="flex gap-2">
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
                {Array.isArray(filteredTasks) && filteredTasks.length > 0 ? filteredTasks.map((task, idx) => (
                  <tr
                    key={task.id}
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
                    
                    {/* SR ID */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-mono">
                        {task.srId || 'N/A'}
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
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No daily tasks found</p>
                      <p className="text-sm">Create your first daily task to get started.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

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
    </>
  );
}
