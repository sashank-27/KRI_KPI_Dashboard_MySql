"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Menu, PanelLeft, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Department, NewUser, User, KRA, NewKRA, DailyTask, NewDailyTask } from "@/lib/types";
import { logout, getAuthHeaders, getCurrentUser, isAuthenticated, requireAuth, isAdmin } from "@/lib/auth";
import { DepartmentManagement } from "@/components/management/DepartmentManagement";
import { UserManagement } from "@/components/management/UserManagement";
import { KRAManagement } from "@/components/management/KRAManagement";
import { DailyTaskManagement } from "@/components/management/DailyTaskManagement";
import { FAQManagement } from "@/components/management/FAQManagement";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { MyKRADashboard } from "@/components/dashboard/MyKRADashboard";
import { MyTasksDashboard } from "@/components/dashboard/MyTasksDashboard";
import { EscalatedTasksDashboard } from "@/components/dashboard/EscalatedTasksDashboard";
import { RealTimeTaskDashboard } from "@/components/dashboard/RealTimeTaskDashboard";
import { FAQViewerPage } from "@/components/dashboard/FAQViewerPage";
import { ProfilePage } from "@/components/profile/ProfilePage";
import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import dynamic from 'next/dynamic';
const KPIDashboard = dynamic(() => import('@/app/kpi/page'), { ssr: false });
import { getApiBaseUrl } from "@/lib/api";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

// Small inline avatar menu component to avoid adding a new file
function AvatarMenu({ currentUser, onViewProfile, onRemovePhoto }: { currentUser: any, onViewProfile: () => void, onRemovePhoto: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="focus:outline-none"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Avatar className="h-9 w-9 border-2 border-primary cursor-pointer hover:border-primary/80 transition-colors">
          <AvatarImage src={currentUser.avatar || undefined} alt="User" />
          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold">
            {(currentUser.name || "User").split(" ").map((n: string) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-lg border bg-white shadow-lg z-50">
          <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setOpen(false); onViewProfile(); }}>View Profile</button>
          {currentUser?.avatar ? (
            <button className="w-full text-left px-3 py-2 text-red-600 hover:bg-gray-50" onClick={() => { setOpen(false); onRemovePhoto(); }}>Remove Photo</button>
          ) : null}
        </div>
      )}
    </div>
  )
}

export function KRADashboard() {
  const isMobile = useIsMobile();
  // Fetch all Daily Tasks (for total count)
  const fetchDailyTasks = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to fetch Daily Tasks", res.status, text);
        throw new Error("Failed to fetch Daily Tasks");
      }
      const data = await res.json();
      setDailyTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (err) {
      console.error("Error in fetchDailyTasks:", err);
      setDailyTasks([]);
    }
  };
  const [todayDailyTasks, setTodayDailyTasks] = useState<DailyTask[]>([]);
  // Daily Tasks state
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  // Fetch all Daily Tasks
  const fetchTodayDailyTasks = async () => {
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const res = await fetch(`${getApiBaseUrl()}/api/daily-tasks?dateFrom=${start}&dateTo=${end}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch today's daily tasks");
      const data = await res.json();
      setTodayDailyTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setTodayDailyTasks([]);
    }
  };
  // Fetch all users and departments from backend on mount
  useEffect(() => {
    // Check if user is authenticated before making API calls
    if (!isAuthenticated()) {

      requireAuth();
      return;
    }

    fetchUsers();
    fetchDepartments();
    fetchSystemHealth();
    fetchKRAs();
    fetchDailyTasks();
  }, []);



  // Fetch all KRAs
  const fetchKRAs = async () => {
    try {
      setIsLoadingKRAs(true);
      const res = await fetch(`${getApiBaseUrl()}/api/kras`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch KRAs");
      const data = await res.json();
      setKras(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch KRAs", err);
      setKras([]);
    } finally {
      setIsLoadingKRAs(false);
    }
  };


  const fetchCurrentUser = async () => {
    try {
      setIsLoadingCurrentUser(true);
      const res = await fetch(`${getApiBaseUrl()}/api/me`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) {

          requireAuth();
          return;
        }
        throw new Error(`Failed to fetch current user: ${res.status} ${res.statusText}`);
      }
      const userData = await res.json();
      setCurrentUser(userData);
      
      // Set admin status and adjust default tab
      const isAdminUser = userData.role === 'admin' || userData.role === 'superadmin';
      setIsUserAdmin(isAdminUser);
      
      // Admin defaults are now handled in the hydration effect
    } catch (err) {
      console.error("Failed to fetch current user", err);
      // Fallback to JWT token data (only on client side)
      if (typeof window !== 'undefined') {
        const tokenUser = getCurrentUser();

        if (tokenUser) {
          const isAdminUser = tokenUser.role === 'admin' || tokenUser.role === 'superadmin';
          setIsUserAdmin(isAdminUser);
          
          setCurrentUser({
            id: tokenUser.id,
            email: tokenUser.email,
            role: tokenUser.role as "superadmin" | "admin" | "user",
            name: "User",
            username: "user",
            department: "Unknown",
            joined: new Date().toISOString(),
          });
          
          // Admin defaults are now handled in the hydration effect
        } else {
          // Set a default user if no token is available
          setIsUserAdmin(false);
          setCurrentUser({
            id: "guest",
            email: "guest@example.com",
            role: "user" as "superadmin" | "admin" | "user",
            name: "Guest User",
            username: "guest",
            department: "Unknown",
            joined: new Date().toISOString(),
          });
        }
      }
    } finally {
      setIsLoadingCurrentUser(false);
    }
  };

  // Update current user profile
  const handleUpdateProfile = async (updatedUser: Partial<User>) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/me`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(updatedUser),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      const updatedData = await res.json();
      setCurrentUser(updatedData);
    } catch (err) {
      console.error("Failed to update profile", err);
    }
  };

  const fetchDepartments = async () => {
    try {
      setIsLoadingDepartments(true);
      const res = await fetch(`${getApiBaseUrl()}/api/departments`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) {

          requireAuth();
          return;
        }
        throw new Error(`Failed to fetch departments: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      // Ensure data is an array
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch departments", err);
      // Always set an empty array as fallback
      setDepartments([]);
    } finally {
      setIsLoadingDepartments(false);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      setIsLoadingSystemHealth(true);
      const res = await fetch(`${getApiBaseUrl()}/api/health`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch system health");
      const data = await res.json();
      setSystemHealth(data);
    } catch (err) {
      console.error("Failed to fetch system health", err);
      setSystemHealth(null);
    } finally {
      setIsLoadingSystemHealth(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const res = await fetch(`${getApiBaseUrl()}/api/users`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) {

          requireAuth();
          return;
        }
        throw new Error(`Failed to fetch users: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Create user
  const handleCreateUser = async (user: Omit<User, "id">) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/users`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(user),
      });
      if (!res.ok) throw new Error("Failed to create user");
      fetchUsers();
      setCreateUserOpen(false);
    } catch (err) {
      console.error("Failed to create user", err);
    }
  };

  // Update user
  const handleUpdateUser = async (id: string, user: Partial<User>) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/users/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(user),
      });
      if (!res.ok) throw new Error("Failed to update user");
      fetchUsers();
    } catch (err) {
      console.error("Failed to update user", err);
    }
  };

  // Delete user
  const handleDeleteUser = async (id: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/users/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete user");
      fetchUsers();
    } catch (err) {
      console.error("Failed to delete user", err);
    }
  };
  // User list state
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  // Modal state for Add User
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    username: "",
    name: "",
    email: "",
    password: "",
    departmentId: "",
    role: "",
  });
  const [currentUser, setCurrentUser] = useState<User>({
    id: "",
    username: "",
    name: "",
    email: "",
    department: "",
    role: "user" as "superadmin" | "admin" | "user",
    joined: "",
  });
  const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(true);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  // Initialize with a safe default for SSR, then hydrate from localStorage
  const [activeTab, setActiveTab] = useState<string>("my-tasks");
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Hydrate from localStorage after component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('activeTab');
      if (savedTab) {
        setActiveTab(savedTab);
      } else {
        // No saved tab - check if user is admin to set appropriate default
        const tokenUser = getCurrentUser();
        if (tokenUser && (tokenUser.role === 'admin' || tokenUser.role === 'superadmin')) {
          setActiveTab("home"); // Admin default
        }
        // Regular users keep the SSR default of "my-tasks"
      }
      setIsHydrated(true);
    }
  }, []);

  // Fetch current user data (after hydration to set admin defaults correctly)
  useEffect(() => {
    if (!isAuthenticated()) {
      return;
    }
    fetchCurrentUser();
  }, [isHydrated]);

  // Close quick action modals when leaving dashboard tab
  useEffect(() => {
    if (activeTab !== 'home') {
      setCreateUserOpen(false);
      setCreateDeptOpen(false);
    }
  }, [activeTab]);

  // Persist activeTab to localStorage (only after hydration)
  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      localStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab, isHydrated]);

  // Close quick action modals when leaving dashboard tab
  useEffect(() => {
    if (activeTab !== 'home') {
      setCreateUserOpen(false);
      setCreateDeptOpen(false);
    }
  }, [activeTab]);
  const [notifications, setNotifications] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {}
  );
  const [newDeptName, setNewDeptName] = useState("");
  const [createDeptOpen, setCreateDeptOpen] = useState(false);
  const [activeManagementView, setActiveManagementView] = useState<
    "all" | "user" | "department" | "kra"
  >("all");
  // Department list state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  
  // KRA list state
  const [kras, setKras] = useState<KRA[]>([]);
  const [isLoadingKRAs, setIsLoadingKRAs] = useState(true);
  const [createKRAOpen, setCreateKRAOpen] = useState(false);
  const [newKRA, setNewKRA] = useState<NewKRA>({
    responsibilityAreas: "",
    departmentId: "",
    assignedToId: "",
    startDate: "",
    endDate: "",
  });
  
  // System health state
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [isLoadingSystemHealth, setIsLoadingSystemHealth] = useState(true);
  // Modal input state

  // Custom logout handler that clears saved tab preference
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activeTab');
    }
    logout();
  };

  // Handle tab access restrictions
  useEffect(() => {
    // Only redirect if we have loaded the user data and user is not admin
    if (!isLoadingCurrentUser && !isUserAdmin && (activeTab === "home" || activeTab === "apps")) {
      setActiveTab("my-tasks");
    }
  }, [isUserAdmin, activeTab, isLoadingCurrentUser]);

  const { toast } = useToast();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 -z-10 opacity-20"
        animate={{
          background: [
            "radial-gradient(circle at 50% 50%, rgba(120, 41, 190, 0.5) 0%, rgba(53, 71, 125, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
            "radial-gradient(circle at 30% 70%, rgba(233, 30, 99, 0.5) 0%, rgba(81, 45, 168, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
            "radial-gradient(circle at 70% 30%, rgba(76, 175, 80, 0.5) 0%, rgba(32, 119, 188, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
            "radial-gradient(circle at 50% 50%, rgba(120, 41, 190, 0.5) 0%, rgba(53, 71, 125, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
          ],
        }}
        transition={{
          duration: 30,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        expandedItems={expandedItems}
        setExpandedItems={setExpandedItems}
        activeManagementView={activeManagementView}
        setActiveManagementView={setActiveManagementView}
        currentUser={currentUser}
      />

      {/* Main Content */}
      <div
        className={cn(
          "min-h-screen transition-all duration-300 ease-in-out",
          sidebarOpen ? "md:pl-64" : "md:pl-20"
        )}
      >
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-xl font-semibold">KPI & Task mangement</h1>
            <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-2xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all duration-200 group"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Logout</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-2xl relative"
                    >
                      <Bell className="h-5 w-5" />
                      {notifications > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                          {notifications}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Avatar with dropdown menu for quick actions (Profile, Remove Photo) */}
              <div className="relative" ref={undefined as any}>
                {/* We'll manage open state below */}
              </div>
              {/* Confirmation dialog for removing profile photo from header */}
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove profile photo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove your profile photo? This will remove it from your account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={async () => {
                      try {
                        await handleUpdateProfile({ avatar: null as unknown as any });
                        toast({ title: 'Profile photo removed' });
                      } catch (err) {
                        console.error('Failed to remove photo', err);
                        toast({ title: 'Failed to remove photo' });
                      } finally {
                        setConfirmOpen(false);
                      }
                    }}>
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AvatarMenu
                currentUser={currentUser}
                onViewProfile={() => setActiveTab("profile")}
                onRemovePhoto={() => setConfirmOpen(true)}
              />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Tabs
            defaultValue="home"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            {!isMobile && !isLoadingCurrentUser && (
              <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <TabsList className={`grid w-full max-w-[1200px] ${isUserAdmin ? 'grid-cols-7' : 'grid-cols-4'} rounded-2xl p-1`}>
                  {isUserAdmin && (
                    <TabsTrigger
                      value="home"
                      className="rounded-xl data-[state=active]:rounded-xl"
                    >
                      Dashboard
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value="my-kra"
                    className="rounded-xl data-[state=active]:rounded-xl"
                  >
                    My KRA
                  </TabsTrigger>
                  <TabsTrigger
                    value="my-tasks"
                    className="rounded-xl data-[state=active]:rounded-xl"
                  >
                    Daily Tasks
                  </TabsTrigger>
                  <TabsTrigger
                    value="escalated-tasks"
                    className="rounded-xl data-[state=active]:rounded-xl"
                  >
                    Escalated
                  </TabsTrigger>
                  {isUserAdmin && (
                    <TabsTrigger
                      value="tasks-dashboard"
                      className="rounded-xl data-[state=active]:rounded-xl"
                    >
                      Tasks Dashboard
                    </TabsTrigger>
                  )}
                  {isUserAdmin && (
                    <TabsTrigger
                      value="apps"
                      className="rounded-xl data-[state=active]:rounded-xl"
                      onClick={() => setActiveManagementView("all")}
                    >
                      Management
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value="profile"
                    className="rounded-xl data-[state=active]:rounded-xl"
                  >
                    Profile
                  </TabsTrigger>
                </TabsList>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {isUserAdmin && (
                  <TabsContent value="home" className="space-y-8 mt-0">
                    <DashboardOverview
                      users={users}
                      departments={departments}
                      kras={kras}
                      dailyTasks={dailyTasks}
                      systemHealth={systemHealth}
                      isLoadingSystemHealth={isLoadingSystemHealth}
                      onCreateUser={() => setCreateUserOpen(true)}
                      onCreateDepartment={() => setCreateDeptOpen(true)}
                      currentUserRole={currentUser?.role || ''}
                    />
                  </TabsContent>
                )}

                <TabsContent value="my-kra" className="space-y-8 mt-0">
                  {currentUser.id ? (
                    <MyKRADashboard currentUserId={currentUser.id} />
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <Skeleton className="h-9 w-48" />
                        <Skeleton className="h-5 w-64" />
                      </div>
                      
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="rounded-xl border bg-card p-6">
                            <div className="flex items-center justify-between space-y-0 pb-2">
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <Skeleton className="h-8 w-12" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="my-tasks" className="space-y-8 mt-0">
                  {currentUser.id ? (
                    <MyTasksDashboard 
                      currentUserId={currentUser.id} 
                      departments={departments}
                      users={users}
                    />
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <Skeleton className="h-9 w-48" />
                        <Skeleton className="h-5 w-64" />
                      </div>
                      
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="rounded-xl border bg-card p-6">
                            <div className="flex items-center justify-between space-y-0 pb-2">
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <Skeleton className="h-8 w-12" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="escalated-tasks" className="space-y-8 mt-0">
                  {currentUser.id ? (
                    <EscalatedTasksDashboard 
                      currentUserId={currentUser.id} 
                      departments={departments}
                      users={users}
                    />
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <Skeleton className="h-9 w-48" />
                        <Skeleton className="h-5 w-64" />
                      </div>
                      
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="rounded-xl border bg-card p-6">
                            <div className="flex items-center justify-between space-y-0 pb-2">
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <Skeleton className="h-8 w-12" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="faqs" className="space-y-8 mt-0">
                  <FAQViewerPage />
                </TabsContent>

                {isUserAdmin && (
                  <TabsContent value="faq-management" className="space-y-8 mt-0">
                    <FAQManagement />
                  </TabsContent>
                )}

                {isUserAdmin && (
                  <TabsContent value="tasks-dashboard" className="space-y-8 mt-0">
                    <RealTimeTaskDashboard 
                      departments={departments}
                      users={users}
                    />
                  </TabsContent>
                )}

                {isUserAdmin && (
                  <TabsContent value="kpi-dashboard" className="space-y-8 mt-0">
                    <KPIDashboard />
                  </TabsContent>
                )}

                {isUserAdmin && (
                  <TabsContent value="apps" className="space-y-6 mt-0">
                    {/* Management page styled like Files page */}
                    {(activeManagementView === "all" ||
                      activeManagementView === "department") && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <DepartmentManagement
                          departments={departments}
                          setDepartments={setDepartments}
                          createDeptOpen={createDeptOpen}
                          setCreateDeptOpen={setCreateDeptOpen}
                          newDeptName={newDeptName}
                          setNewDeptName={setNewDeptName}
                          users={users}
                        />
                      </motion.div>
                    )}

                    {/* User Management section below departments */}
                    {(activeManagementView === "all" ||
                      activeManagementView === "user") && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                      >
                        <UserManagement
                          users={users}
                          setUsers={setUsers}
                          createUserOpen={createUserOpen}
                          setCreateUserOpen={setCreateUserOpen}
                          newUser={newUser}
                          setNewUser={setNewUser}
                          departments={departments}
                          onCreateUser={handleCreateUser}
                          onUpdateUser={handleUpdateUser}
                          onDeleteUser={handleDeleteUser}
                        />
                      </motion.div>
                    )}

                    {/* KRA Management section */}
                    {(activeManagementView === "all" ||
                      activeManagementView === "kra") && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      >
                        <KRAManagement
                          departments={departments}
                          users={users}
                        />
                      </motion.div>
                    )}

                    {/* Daily Task Management section */}
                    {/* You can add DailyTaskManagement here if needed, but 'daily-task' is not a valid view anymore */}

                  </TabsContent>
                )}

                <TabsContent value="profile" className="space-y-8 mt-0">
                  {isLoadingCurrentUser ? (
                    <div className="space-y-6 p-6">
                      <div className="space-y-4">
                        <Skeleton className="h-9 w-48" />
                        <Skeleton className="h-5 w-64" />
                      </div>
                      
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
                          <div className="text-center space-y-2">
                            <Skeleton className="h-6 w-32 mx-auto" />
                            <Skeleton className="h-4 w-24 mx-auto" />
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                                <ProfilePage
              currentUser={{
                username: currentUser.username ?? "",
                name: currentUser.name ?? "",
                email: currentUser.email ?? "",
                department:
                  typeof currentUser.department === "string"
                    ? currentUser.department
                    : currentUser.department?.name ?? "",
                role: currentUser.role ?? "",
                joined: currentUser.joined ?? "",
                createdBy: currentUser.createdBy,
              }}
              onUpdateProfile={handleUpdateProfile}
            />
                  )}
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
