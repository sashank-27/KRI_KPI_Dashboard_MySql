"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useSocket, useSocketEvent } from "@/hooks/useSocket";
import {
  BarChart3,
  Download,
  Calendar,
  User,
  TrendingUp,
  TrendingDown,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Filter,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAuthHeaders, requireAuth } from "@/lib/auth";
import { User as UserType, Department } from "@/lib/types";
import { getApiBaseUrl } from "@/lib/api";

interface KPIBreakdown {
  directCompleted: number;
  directCredits: number;
  sharedTasks: number;
  sharedCredits: number;
  escalatedAway: number;
  escalatedAwayCredits: number;
  receivedEscalated: number;
  receivedEscalatedCredits: number;
  totalCredits: number;
}

interface KPIData {
  userId: string;
  userName: string;
  userEmail: string;
  department: string;
  total: number;
  closed: number;
  inProgress: number;
  escalated: number;
  completionRate?: number;
  breakdown?: KPIBreakdown;
}

interface UserKPIData {
  total: number;
  closed: number;
  inProgress: number;
  escalated: number;
  completionRate: string;
  breakdown?: KPIBreakdown;
}

export default function KPIDashboard() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [userKpiData, setUserKpiData] = useState<UserKPIData | null>(null);
  const [filterType, setFilterType] = useState<"year" | "month" | "custom">("year");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Socket.IO for real-time updates
  const { socket, isConnected } = useSocket();

  // Fetch users and departments
  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#search') && !target.closest('.suggestion-dropdown')) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch KPI data when filters change
  useEffect(() => {
    if (selectedUser === "all") {
      fetchAllUsersKPIData();
    } else {
      fetchUserKPIData();
    }
  }, [selectedUser, selectedYear, selectedMonth, dateFrom, dateTo, filterType]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/users`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch users, status:", res.status);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/departments`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setDepartments(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch departments, status:", res.status);
      }
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

  const fetchAllUsersKPIData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType === "year") {
        params.append("year", selectedYear);
      } else if (filterType === "month") {
        params.append("year", selectedYear);
        params.append("month", selectedMonth);
      } else if (filterType === "custom") {
        if (dateFrom) params.append("dateFrom", dateFrom);
        if (dateTo) params.append("dateTo", dateTo);
      }

      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks/kpi/all?${params}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        setKpiData(Array.isArray(data) ? data : []);
        setUserKpiData(null);
      } else {
        console.error('Failed to fetch KPI data, status:', res.status);
        setKpiData([]);
      }
    } catch (err) {
      console.error("Failed to fetch KPI data", err);
      setKpiData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserKPIData = async () => {
    if (selectedUser === "all") return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType === "year") {
        params.append("year", selectedYear);
      } else if (filterType === "month") {
        params.append("year", selectedYear);
        params.append("month", selectedMonth);
      } else if (filterType === "custom") {
        if (dateFrom) params.append("dateFrom", dateFrom);
        if (dateTo) params.append("dateTo", dateTo);
      }


      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks/kpi/user/${selectedUser}?${params}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();

        setUserKpiData(data);
        setKpiData([]);
      } else {
        console.error('Failed to fetch user KPI data, status:', res.status);
        setUserKpiData(null);
      }
    } catch (err) {
      console.error("Failed to fetch user KPI data", err);
      setUserKpiData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time event handlers - use debouncing to avoid too many refreshes
  const refreshKPIData = useCallback(() => {
    console.log('📊 Refreshing KPI data');
    if (selectedUser === "all") {
      fetchAllUsersKPIData();
    } else {
      fetchUserKPIData();
    }
  }, [selectedUser, selectedYear, selectedMonth, dateFrom, dateTo, filterType]);

  const handleTaskUpdate = useCallback((task: any) => {
    console.log('🔄 Task updated in KPI dashboard:', task?.id);
    refreshKPIData();
  }, [refreshKPIData]);

  const handleTaskCreated = useCallback((task: any) => {
    console.log('📥 New task in KPI dashboard:', task?.id);
    refreshKPIData();
  }, [refreshKPIData]);

  const handleTaskDeleted = useCallback((data: any) => {
    console.log('🗑️  Task deleted in KPI dashboard:', data?.id);
    refreshKPIData();
  }, [refreshKPIData]);

  const handleTaskEscalated = useCallback((task: any) => {
    console.log('🚀 Task escalated in KPI dashboard:', task?.id);
    refreshKPIData();
  }, [refreshKPIData]);

  const handleTaskRollback = useCallback((task: any) => {
    console.log('↩️  Task rolled back in KPI dashboard:', task?.id);
    refreshKPIData();
  }, [refreshKPIData]);

  const handleTaskStatusUpdated = useCallback((task: any) => {
    console.log('📊 Task status updated in KPI dashboard:', task?.id);
    refreshKPIData();
  }, [refreshKPIData]);

  const handleStatsUpdate = useCallback((data: any) => {
    console.log('📈 Stats update triggered in KPI dashboard');
    refreshKPIData();
  }, [refreshKPIData]);

  // Set up real-time event listeners
  useSocketEvent(socket, 'task-updated', handleTaskUpdate);
  useSocketEvent(socket, 'new-task', handleTaskCreated);
  useSocketEvent(socket, 'task-deleted', handleTaskDeleted);
  useSocketEvent(socket, 'task-escalated', handleTaskEscalated);
  useSocketEvent(socket, 'task-rolled-back', handleTaskRollback);
  useSocketEvent(socket, 'task-status-updated', handleTaskStatusUpdated);
  useSocketEvent(socket, 'task-stats-update', handleStatsUpdate);

  const exportToCSV = () => {
    const dataToExport = selectedUser === "all" ? kpiData : [userKpiData];
    if (!dataToExport || dataToExport.length === 0) return;

    const headers = [
      "User Name",
      "Email",
      "Department",
      "Total Tasks",
      "Total Credits",
      "Direct Credits",
      "Shared Credits",
      "Escalated Away Credits",
      "Received Credits",
      "KPI %"
    ];

    const csvContent = [
      headers.join(","),
      ...dataToExport.map((item: any) => [
        item.userName || "N/A",
        item.userEmail || "N/A",
        item.department || "N/A",
        item.total || 0,
        item.breakdown?.totalCredits?.toFixed(2) || 0,
        item.breakdown?.directCredits?.toFixed(2) || 0,
        item.breakdown?.sharedCredits?.toFixed(2) || 0,
        item.breakdown?.escalatedAwayCredits?.toFixed(2) || 0,
        item.breakdown?.receivedEscalatedCredits?.toFixed(2) || 0,
        item.completionRate || 0
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kpi-report-${selectedYear}-${selectedMonth || 'full'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getPerformanceColor = (rate: number) => {
    const safeRate = rate || 0;
    if (safeRate >= 80) return "text-green-600";
    if (safeRate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getPerformanceBadge = (rate: number) => {
    const safeRate = rate || 0;
    if (safeRate >= 80) return "bg-green-100 text-green-800";
    if (safeRate >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 text-white"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">KPI Dashboard</h1>
            <p className="max-w-[600px] text-white/80">
              Track and analyze Key Performance Indicators for task completion efficiency.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-white/80" />
              <span className="text-2xl font-bold">
                {selectedUser === "all" ? kpiData.length : 1}
              </span>
              <span className="text-white/80">Users</span>
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2 relative">
              <Label htmlFor="search">Search User</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Type user name to search..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full pl-10"
                />
                {showSuggestions && searchTerm && (
                  <div className="suggestion-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {/* Show "All Users" option if search matches */}
                    {"all users".includes(searchTerm.toLowerCase()) && (
                      <div
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b"
                        onClick={() => {
                          setSelectedUser("all");
                          setSearchTerm("");
                          setShowSuggestions(false);
                        }}
                      >
                        <div className="font-medium text-sm text-blue-600">All Users</div>
                        <div className="text-xs text-gray-500">View all users KPI data</div>
                      </div>
                    )}
                    {users
                      .filter((user) =>
                        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .slice(0, 10)
                      .map((user) => (
                        <div
                          key={user.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedUser(user.id);
                            setSearchTerm(user.name || "");
                            setShowSuggestions(false);
                          }}
                        >
                          <div className="font-medium text-sm">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      ))}
                    {users.filter((user) =>
                      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length === 0 && !"all users".includes(searchTerm.toLowerCase()) && (
                      <div className="px-4 py-2 text-sm text-gray-500">
                        No users found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user">Select User</Label>
              <Select value={selectedUser} onValueChange={(value) => {
                setSelectedUser(value);
                if (value === "all") {
                  setSearchTerm("");
                } else {
                  const user = users.find(u => u.id === value);
                  if (user) setSearchTerm(user.name || "");
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} 
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-users" disabled>
                      No users available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterType">Filter Type</Label>
              <Select value={filterType} onValueChange={(value: "year" | "month" | "custom") => setFilterType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">Year</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterType === "year" && (
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filterType === "month" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="month">Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {filterType === "custom" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">From Date</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo">To Date</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={fetchAllUsersKPIData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards for Single User */}
      {selectedUser !== "all" && userKpiData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userKpiData.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Closed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userKpiData.closed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userKpiData.inProgress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Escalated</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userKpiData.escalated}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* KPI Performance Cards */}
      {selectedUser !== "all" && userKpiData && (
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">KPI % (Credits/Total)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPerformanceColor(parseFloat(userKpiData.completionRate))}`}>
                {userKpiData.completionRate}%
              </div>
              <Badge className={getPerformanceBadge(parseFloat(userKpiData.completionRate))}>
                {parseFloat(userKpiData.completionRate) >= 80 ? "Excellent" : 
                 parseFloat(userKpiData.completionRate) >= 60 ? "Good" : "Needs Improvement"}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* KPI Breakdown Cards */}
      {selectedUser !== "all" && userKpiData && userKpiData.breakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Credit Breakdown
            </CardTitle>
            <CardDescription>
              Detailed breakdown of how your KPI credits are calculated. 
              <br />
              <span className="text-xs text-amber-600 dark:text-amber-400">
                ℹ️ Note: Shared credits are calculated based on users working on the same SR-ID within the selected time period.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Direct Credits */}
              <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                <div className="text-sm font-medium text-muted-foreground mb-1">Direct Completed</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {userKpiData.breakdown.directCredits.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {userKpiData.breakdown.directCompleted} tasks × 1.0 credit
                </p>
              </div>

              {/* Shared Credits */}
              <div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-950">
                <div className="text-sm font-medium text-muted-foreground mb-1">Shared (Multi-User)</div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {userKpiData.breakdown.sharedCredits.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {userKpiData.breakdown.sharedTasks} tasks × shared credit
                  <br />
                  <span className="text-[10px]">Credit split equally with other users on same SR-ID</span>
                </p>
              </div>

              {/* Escalated Away Credits */}
              <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950">
                <div className="text-sm font-medium text-muted-foreground mb-1">Escalated Away</div>
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                  {userKpiData.breakdown.escalatedAwayCredits.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {userKpiData.breakdown.escalatedAway} tasks × 0.5 credit
                  <br />
                  <span className="text-[10px]">Tasks you started and escalated to others who completed them</span>
                </p>
              </div>

              {/* Received Escalated Credits */}
              <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                <div className="text-sm font-medium text-muted-foreground mb-1">Received & Completed</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {userKpiData.breakdown.receivedEscalatedCredits.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {userKpiData.breakdown.receivedEscalated} tasks × 0.5 credit
                  <br />
                  <span className="text-[10px]">Tasks escalated to you that you completed</span>
                </p>
              </div>
            </div>

            {/* Total Credits Summary */}
            <div className="mt-4 p-4 border-2 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Total Credits Earned</div>
                  <div className="text-3xl font-bold mt-1">{userKpiData.breakdown.totalCredits.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-muted-foreground">Out of Total Tasks</div>
                  <div className="text-3xl font-bold mt-1">{userKpiData.total}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-muted-foreground">KPI Percentage</div>
                  <div className={`text-3xl font-bold mt-1 ${getPerformanceColor(parseFloat(userKpiData.completionRate))}`}>
                    {userKpiData.completionRate}%
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Table */}
      <Card>
        <CardHeader>
          <CardTitle>KPI Performance Table</CardTitle>
          <CardDescription>
            {selectedUser === "all" 
              ? "Performance metrics for all users" 
              : "Performance metrics for selected user"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {/* Table Header Skeleton */}
              <div className="border rounded-lg p-4">
                <div className="grid grid-cols-9 gap-4 mb-4">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
                
                {/* Table Rows Skeleton */}
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-9 gap-4 py-3 border-t">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Direct</TableHead>
                  <TableHead>Shared</TableHead>
                  <TableHead>Escalated</TableHead>
                  <TableHead>KPI %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedUser === "all" ? (
                  kpiData && kpiData.length > 0 ? (
                    kpiData.map((user, index) => (
                      <TableRow key={user.userId || index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.userName || 'Unknown User'}</div>
                            <div className="text-sm text-muted-foreground">{user.userEmail || 'No email'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.department || 'N/A'}
                        </TableCell>
                        <TableCell>{user.total || 0}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-blue-600 dark:text-blue-400">
                            {user.breakdown?.totalCredits.toFixed(2) || '0.00'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {user.breakdown?.directCredits.toFixed(1) || '0.0'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {user.breakdown?.sharedCredits.toFixed(1) || '0.0'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-orange-600">↑{user.breakdown?.escalatedAwayCredits.toFixed(1) || '0.0'}</span>
                            {' / '}
                            <span className="text-green-600">↓{user.breakdown?.receivedEscalatedCredits.toFixed(1) || '0.0'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPerformanceBadge(user.completionRate || 0)}>
                            {(user.completionRate || 0).toFixed(2)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No KPI data available for the selected filters
                      </TableCell>
                    </TableRow>
                  )
                ) : userKpiData ? (
                  <TableRow>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {users.find(u => u.id === selectedUser)?.name || 'Selected User'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {users.find(u => u.id === selectedUser)?.email || ''}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const user = users.find(u => u.id === selectedUser);
                        if (!user || !user.department) return 'N/A';
                        if (typeof user.department === 'string') return user.department;
                        return user.department.name || 'N/A';
                      })()}
                    </TableCell>
                    <TableCell>{userKpiData.total || 0}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-blue-600 dark:text-blue-400">
                        {userKpiData.breakdown?.totalCredits.toFixed(2) || '0.00'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {userKpiData.breakdown?.directCredits.toFixed(1) || '0.0'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {userKpiData.breakdown?.sharedCredits.toFixed(1) || '0.0'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-orange-600">↑{userKpiData.breakdown?.escalatedAwayCredits.toFixed(1) || '0.0'}</span>
                        {' / '}
                        <span className="text-green-600">↓{userKpiData.breakdown?.receivedEscalatedCredits.toFixed(1) || '0.0'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPerformanceBadge(parseFloat(userKpiData.completionRate) || 0)}>
                        {userKpiData.completionRate || '0.00'}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      {selectedUser === "all" ? "No data available" : "No user data available"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
