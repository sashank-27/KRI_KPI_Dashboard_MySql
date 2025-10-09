"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { getApiBaseUrl } from "@/lib/api";
import { getAuthHeaders } from "@/lib/auth";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  Users,
  Building2,
  TrendingUp,
  Activity,
  UserPlus,
  Building,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Department } from "@/lib/types";

interface DashboardOverviewProps {
  todayUsers?: any[];
  todayDepartments?: any[];
  todayKras?: any[];
  todayDailyTasks?: any[];
  users: User[];
  departments: Department[];
  kras: any[];
  dailyTasks: any[];
  lastMonthUsers?: User[];
  lastMonthDepartments?: Department[];
  lastMonthKras?: any[];
  systemHealth: any;
  isLoadingSystemHealth: boolean;
  onCreateUser: () => void;
  onCreateDepartment: () => void;
  currentUserRole: string;
}

export function DashboardOverview({
  todayUsers = [],
  todayDepartments = [],
  todayKras = [],
  todayDailyTasks = [],
  users,
  departments,
  kras,
  dailyTasks: initialDailyTasks,
  lastMonthUsers = [],
  lastMonthDepartments = [],
  lastMonthKras = [],
  systemHealth,
  isLoadingSystemHealth,
  onCreateUser,
  onCreateDepartment,
  currentUserRole,
}: DashboardOverviewProps) {
  // Real-time daily tasks state
  const [dailyTasks, setDailyTasks] = useState(initialDailyTasks || []);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch daily tasks from backend
  const fetchDailyTasks = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks?limit=20`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch daily tasks");
      const data = await res.json();
      setDailyTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (err) {
      setDailyTasks([]);
    }
  };

  // Poll for real-time updates every 10 seconds
  useEffect(() => {
    fetchDailyTasks();
    pollingRef.current = setInterval(fetchDailyTasks, 10000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Recently added tasks (last 3)
  const recentTasks = dailyTasks
    .filter((task) => !!task.createdAt)
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 3);

  // Recently escalated tasks (last 3)
  const recentEscalatedTasks = dailyTasks
    .filter((task) => task.isEscalated && !!task.escalatedAt)
    .sort((a, b) => new Date(b.escalatedAt!).getTime() - new Date(a.escalatedAt!).getTime())
    .slice(0, 3);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate statistics
  const totalUsers = users.length;
  const totalDepartments = departments.length;
  const totalKRAs = kras.length;
  const totalDailyTasks = dailyTasks.length;
  // Last month stats
  const lastMonthUsersCount = lastMonthUsers.length;
  const lastMonthDepartmentsCount = lastMonthDepartments.length;
  const lastMonthKrasCount = lastMonthKras.length;
  // Percentage change helpers
  function getPercentChange(current: number, last: number) {
    if (last === 0) return current === 0 ? 0 : 100;
    return Math.round(((current - last) / last) * 100);
  }
  const usersChange = getPercentChange(totalUsers, lastMonthUsersCount);
  const departmentsChange = getPercentChange(totalDepartments, lastMonthDepartmentsCount);
  const krasChange = getPercentChange(totalKRAs, lastMonthKrasCount);
  const totalMembers = departments.reduce(
    (sum, dept) => sum + (typeof dept.members === "number" ? dept.members : 0),
    0
  );
  const totalProjects = departments.reduce(
    (sum, dept) =>
      sum + (typeof dept.projects === "number" ? dept.projects : 0),
    0
  );

  // Recent users (last 3)
  const recentUsers = users.slice(-3).reverse();

  // Department distribution
  const departmentStats = departments.map((dept) => {
    const members = typeof dept.members === "number" ? dept.members : 0;
    const projects = typeof dept.projects === "number" ? dept.projects : 0;
    const color = dept.color || "#8884d8";
    return {
      name: dept.name,
      members,
      projects,
      color,
      percentage:
        totalMembers > 0 ? Math.round((members / totalMembers) * 100) : 0,
    };
  });

  // Role distribution
  const roleStats = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statsCards = [
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      dailyCount: todayUsers.length,
    },
    {
      title: "Total Departments",
      value: totalDepartments,
      icon: Building2,
      color: "text-green-600",
      bgColor: "bg-green-50",
      dailyCount: todayDepartments.length,
    },
    {
      title: "Total KRAs",
      value: totalKRAs,
      icon: BarChart3,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      dailyCount: todayKras.length,
    },
    {
      title: "Total Daily Tasks",
      value: totalDailyTasks,
      icon: Activity,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      dailyCount: todayDailyTasks.length,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 text-white"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <p className="max-w-[600px] text-white/80 text-lg">
              Monitor your organization's performance, manage departments, and
              track user activities all in one place.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title + '-' + index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="rounded-2xl border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-2xl ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Department Distribution
              </CardTitle>
              <CardDescription>
                Member distribution across departments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {departmentStats.map((dept, index) => (
                <div key={dept.name + '-' + index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full bg-${dept.color}`}
                      ></div>
                      <span className="font-medium">{dept.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {dept.members} members ({dept.percentage}%)
                    </span>
                  </div>
                  <Progress value={dept.percentage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Role Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Role Distribution
              </CardTitle>
              <CardDescription>
                User roles across the organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(roleStats).map(([role, count], index) => {
                const percentage = Math.round((count / totalUsers) * 100);
                const colors = [
                  "bg-blue-500",
                  "bg-green-500",
                  "bg-purple-500",
                  "bg-orange-500",
                ];
                return (
                  <div key={role + '-' + index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{role}</span>
                      <span className="text-sm text-muted-foreground">
                        {count} users ({percentage}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity, Tasks, and System Status */}
      <div
        className={`grid grid-cols-1 gap-6 ${currentUserRole === 'superadmin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
      >
        {/* Recent Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Users
              </CardTitle>
              <CardDescription>
                Latest additions to the organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentUsers.map((user, index) => (
                <div key={user.id || user.username || index} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar || undefined} alt={user.name} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">
                      {(user.name ?? "")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {typeof user.department === "string"
                        ? user.department
                        : user.department?.name}{" "}
                      • {user.role}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {formatDate(user.joined || "")}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Tasks
              </CardTitle>
              <CardDescription>
                Most recently created daily tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentTasks.length === 0 ? (
                <div className="text-muted-foreground text-sm">No recent tasks</div>
              ) : (
                recentTasks.map((task, idx) => (
                  <div key={task.id || idx} className="flex flex-col gap-1 border-b last:border-b-0 pb-2">
                    <span className="font-medium">{task.task}</span>
                    <span className="text-xs text-muted-foreground">SR-ID: {task.srId}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(task.createdAt)}</span>
                    <span className="text-xs text-muted-foreground">By: {typeof task.user === 'string' ? task.user : task.user?.name}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Escalated */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Recent Escalated
              </CardTitle>
              <CardDescription>
                Most recently escalated daily tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentEscalatedTasks.length === 0 ? (
                <div className="text-muted-foreground text-sm">No recent escalations</div>
              ) : (
                recentEscalatedTasks.map((task, idx) => (
                  <div key={task.id || idx} className="flex flex-col gap-1 border-b last:border-b-0 pb-2">
                    <span className="font-medium">{task.task}</span>
                    <span className="text-xs text-muted-foreground">SR-ID: {task.srId}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(task.escalatedAt)}</span>
                    <span className="text-xs text-muted-foreground">Escalated By: {typeof task.escalatedBy === 'string' ? task.escalatedBy : task.escalatedBy?.name}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* System Status (Super Admin Only) */}
        {currentUserRole === 'superadmin' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  System Status
                </CardTitle>
                <CardDescription>
                  {isLoadingSystemHealth ? "Loading system health..." : 
                    systemHealth ? `System ${systemHealth.status}${mounted ? ` - Last updated: ${formatRelativeTime(systemHealth.timestamp)}` : ''}` : 
                    "System health unavailable"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingSystemHealth ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Loading system status...</span>
                  </div>
                ) : systemHealth ? (
                  <>
                    {Object.entries(systemHealth.services).map(([serviceName, service]: [string, any]) => {
                      const isOnline = service.status === 'online';
                      const isPending = service.status === 'pending';
                      const Icon = isOnline ? CheckCircle : isPending ? AlertCircle : AlertCircle;
                      const iconColor = isOnline ? 'text-green-500' : isPending ? 'text-yellow-500' : 'text-red-500';
                      const badgeColor = isOnline ? 'bg-green-500' : isPending ? 'bg-yellow-500' : 'bg-red-500';
                      const badgeVariant = isOnline ? 'default' : isPending ? 'secondary' : 'destructive';
                      
                      return (
                        <div key={serviceName} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${iconColor}`} />
                            <span className="text-sm capitalize">{serviceName.replace(/([A-Z])/g, ' $1').trim()}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <Badge variant={badgeVariant} className={badgeColor}>
                              {service.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground mt-1">
                              {service.message}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Unable to load system status</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
