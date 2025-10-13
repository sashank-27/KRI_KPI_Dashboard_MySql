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

interface KPIData {
  userId: string;
  userName: string;
  userEmail: string;
  department: string;
  total: number;
  closed: number;
  open: number;
  pending: number;
  escalated: number;
  completionRate?: number;
  penalizedRate?: number;
}

interface UserKPIData {
  total: number;
  closed: number;
  open: number;
  pending: number;
  escalated: number;
  completionRate: string;
  penalizedRate: string;
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

  // Socket.IO for real-time updates
  const { socket, isConnected } = useSocket();

  // Fetch users and departments
  useEffect(() => {
    fetchUsers();
    fetchDepartments();
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
      console.log("Fetching users...");
      const res = await fetch(`${getApiBaseUrl()}/api/users`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Users data received:", data);
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
      console.log("Fetching departments...");
      const res = await fetch(`${getApiBaseUrl()}/api/departments`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Departments data received:", data);
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

      console.log('Fetching KPI data with params:', params.toString());
      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks/kpi/all?${params}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('KPI data received:', data);
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

      console.log('Fetching user KPI data for user:', selectedUser, 'with params:', params.toString());
      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks/kpi/user/${selectedUser}?${params}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('User KPI data received:', data);
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

  // Real-time event handlers
  const handleTaskUpdate = useCallback((data: any) => {
    console.log('Real-time task update received in KPI:', data);
    
    // Refresh KPI data when any task is updated
    if (selectedUser === "all") {
      fetchAllUsersKPIData();
    } else {
      fetchUserKPIData();
    }
  }, [selectedUser, selectedYear, selectedMonth, dateFrom, dateTo, filterType]);

  const handleTaskCreated = useCallback((data: any) => {
    console.log('Real-time task created in KPI:', data);
    
    // Refresh KPI data when a new task is created
    if (selectedUser === "all") {
      fetchAllUsersKPIData();
    } else {
      fetchUserKPIData();
    }
  }, [selectedUser, selectedYear, selectedMonth, dateFrom, dateTo, filterType]);

  const handleTaskDeleted = useCallback((data: any) => {
    console.log('Real-time task deleted in KPI:', data);
    
    // Refresh KPI data when a task is deleted
    if (selectedUser === "all") {
      fetchAllUsersKPIData();
    } else {
      fetchUserKPIData();
    }
  }, [selectedUser, selectedYear, selectedMonth, dateFrom, dateTo, filterType]);

  const handleTaskEscalated = useCallback((data: any) => {
    console.log('Real-time task escalated in KPI:', data);
    
    // Refresh KPI data when a task is escalated
    if (selectedUser === "all") {
      fetchAllUsersKPIData();
    } else {
      fetchUserKPIData();
    }
  }, [selectedUser, selectedYear, selectedMonth, dateFrom, dateTo, filterType]);

  const handleTaskRollback = useCallback((data: any) => {
    console.log('Real-time task rollback in KPI:', data);
    
    // Refresh KPI data when a task is rolled back
    if (selectedUser === "all") {
      fetchAllUsersKPIData();
    } else {
      fetchUserKPIData();
    }
  }, [selectedUser, selectedYear, selectedMonth, dateFrom, dateTo, filterType]);

  const handleTaskStatusUpdated = useCallback((data: any) => {
    console.log('Real-time task status updated in KPI:', data);
    
    // Refresh KPI data when task status is updated
    if (selectedUser === "all") {
      fetchAllUsersKPIData();
    } else {
      fetchUserKPIData();
    }
  }, [selectedUser, selectedYear, selectedMonth, dateFrom, dateTo, filterType]);

  // Set up real-time event listeners
  useSocketEvent(socket, 'task-update', handleTaskUpdate);
  useSocketEvent(socket, 'task-created', handleTaskCreated);
  useSocketEvent(socket, 'task-deleted', handleTaskDeleted);
  useSocketEvent(socket, 'task-escalated', handleTaskEscalated);
  useSocketEvent(socket, 'task-rollback', handleTaskRollback);
  useSocketEvent(socket, 'task-status-updated', handleTaskStatusUpdated);

  const exportToCSV = () => {
    const dataToExport = selectedUser === "all" ? kpiData : [userKpiData];
    if (!dataToExport || dataToExport.length === 0) return;

    const headers = [
      "User Name",
      "Email",
      "Department",
      "Total",
      "Closed",
      "Open",
      "Pending",
      "Escalated",
      "KPI % (Closed/Total)",
      "KPI % (Penalized)"
    ];

    const csvContent = [
      headers.join(","),
      ...dataToExport.map((item: any) => [
        item.userName || "N/A",
        item.userEmail || "N/A",
        item.department || "N/A",
        item.total || 0,
        item.closed || 0,
        item.open || 0,
        item.pending || 0,
        item.escalated || 0,
        item.completionRate || 0,
        item.penalizedRate || 0
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
            <div className="space-y-2">
              <Label htmlFor="user">Select User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo">To Date</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <CardTitle className="text-sm font-medium">Open</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userKpiData.open}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userKpiData.pending}</div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">KPI % (Closed/Total)</CardTitle>
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">KPI % (Penalized)</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPerformanceColor(parseFloat(userKpiData.penalizedRate))}`}>
                {userKpiData.penalizedRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                (Closed - Escalated) / Total
              </p>
            </CardContent>
          </Card>
        </div>
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
                  <TableHead>Closed</TableHead>
                  <TableHead>Open</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Escalated</TableHead>
                  <TableHead>KPI % (Closed/Total)</TableHead>
                  <TableHead>KPI % (Penalized)</TableHead>
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
                        <TableCell>{user.closed || 0}</TableCell>
                        <TableCell>{user.open || 0}</TableCell>
                        <TableCell>{user.pending || 0}</TableCell>
                        <TableCell>{user.escalated || 0}</TableCell>
                        <TableCell>
                          <Badge className={getPerformanceBadge(user.completionRate || 0)}>
                            {(user.completionRate || 0).toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPerformanceBadge(user.penalizedRate || 0)}>
                            {(user.penalizedRate || 0).toFixed(2)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
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
                    <TableCell>{userKpiData.closed || 0}</TableCell>
                    <TableCell>{userKpiData.open || 0}</TableCell>
                    <TableCell>{userKpiData.pending || 0}</TableCell>
                    <TableCell>{userKpiData.escalated || 0}</TableCell>
                    <TableCell>
                      <Badge className={getPerformanceBadge(parseFloat(userKpiData.completionRate) || 0)}>
                        {userKpiData.completionRate || '0.00'}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPerformanceBadge(parseFloat(userKpiData.penalizedRate) || 0)}>
                        {userKpiData.penalizedRate || '0.00'}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
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
