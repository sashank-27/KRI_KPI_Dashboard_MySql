"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Bell,
  ChevronDown,
  Home,
  Layers,
  Menu,
  PanelLeft,
  Search,
  Target,
  ClipboardList,
  User as UserIcon,
  Users,
  Wand2,
  X,
  ArrowUpRight,
  BarChart3,
  LayoutGrid,
  UserCog,
  Building2,
  FileText,
  HelpCircle,
} from "lucide-react"
import TyroneLogo from "@/images/Tyrone-logo-KPI.png";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { User } from "@/lib/types"
import { isAdmin } from "@/lib/auth"

// Sample data for sidebar navigation
type SidebarSubItem = {
  title: string;
  url: string;
  icon?: React.ReactNode;
};

type SidebarItem = {
  title: string;
  icon: React.ReactNode;
  isActive: boolean;
  items?: SidebarSubItem[];
};

const getSidebarItems = (isUserAdmin: boolean): SidebarItem[] => {
  const baseItems: SidebarItem[] = [
    {
      title: "Daily Tasks",
      icon: <ClipboardList />,
      isActive: false,
    },
    {
      title: "My KRA",
      icon: <Target />,
      isActive: false,
    },
    {
      title: "Escalated",
      icon: <ArrowUpRight />,
      isActive: false,
    },
    {
      title: "FAQs",
      icon: <HelpCircle />,
      isActive: false,
    },
  ];

  // Add admin-only items
  if (isUserAdmin) {
    baseItems.unshift({
      title: "Admin Dashboard",
      icon: <Home />,
      isActive: false,
    });
    
    baseItems.push({
      title: "Tasks Dashboard",
      icon: <ClipboardList />,
      isActive: false,
    });
    
    baseItems.push({
      title: "KPI Dashboard",
      icon: <BarChart3 />,
      isActive: false,
    });
    
    baseItems.push({
      title: "Management",
      icon: <Layers />,
      items: [
        { title: "All Management", url: "#", icon: <LayoutGrid className="mr-2 h-4 w-4" /> },
        { title: "User Management", url: "#", icon: <UserCog className="mr-2 h-4 w-4" /> },
        { title: "Department Management", url: "#", icon: <Building2 className="mr-2 h-4 w-4" /> },
        { title: "KRA Management", url: "#", icon: <FileText className="mr-2 h-4 w-4" /> },
      ],
      isActive: false,
    });
  }

  return baseItems;
};

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  expandedItems: Record<string, boolean>;
  setExpandedItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  activeManagementView: "all" | "user" | "department" | "kra";
  setActiveManagementView: (view: "all" | "user" | "department" | "kra") => void;
  currentUser: User;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  mobileMenuOpen,
  setMobileMenuOpen,
  expandedItems,
  setExpandedItems,
  activeManagementView,
  setActiveManagementView,
  currentUser,
}: SidebarProps) {
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Determine admin status after component mounts to avoid hydration mismatch
  useEffect(() => {
    const adminStatus = isAdmin();
    setIsUserAdmin(adminStatus);
    setIsLoading(false);
  }, []);

  const sidebarItems = getSidebarItems(isUserAdmin);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev: Record<string, boolean>) => {
      const newItems = { ...prev }
      newItems[title] = !prev[title]
      return newItems
    })
  }

  const handleManagementClick = (view: "all" | "user" | "department" | "kra") => {
    setActiveManagementView(view)
    setActiveTab("apps") // Switch to management tab
  }

  // Show loading state to prevent hydration mismatch
  if (isLoading) {
    return (
      <>
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Sidebar - Mobile Loading */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 transform bg-background transition-transform duration-300 ease-in-out md:hidden",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-full flex-col border-r">
            <div className="flex items-center p-0">
              <div className="w-12" />
              <div className="flex-1 flex justify-center">
                <img src={TyroneLogo.src} alt="Tyrone logo" className="h-12 sm:h-16 md:h-20 lg:h-24 w-auto object-contain" />
              </div>
              <div className="w-12 flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="space-y-4 w-full px-4">
                {/* Logo skeleton */}
                <div className="flex justify-center">
                  <Skeleton className="h-16 w-32" />
                </div>
                
                {/* Navigation items skeleton */}
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
                
                {/* User profile skeleton */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Desktop Loading */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-30 hidden w-64 transform border-r bg-background transition-transform duration-300 ease-in-out md:block",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-full flex-col">
            <div className="p-0">
              <div className="flex items-center gap-0">
              <div className="flex items-center justify-center p-0 m-0 bg-transparent">
                <img src={TyroneLogo.src} alt="Tyrone logo" className="h-12 sm:h-16 md:h-20 lg:h-24 w-auto object-contain" />
              </div>

              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="space-y-4 w-full px-4">
                {/* Logo skeleton */}
                <div className="flex justify-center">
                  <Skeleton className="h-16 w-32" />
                </div>
                
                {/* Navigation items skeleton */}
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
                
                {/* User profile skeleton */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar - Mobile */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-background transition-transform duration-300 ease-in-out md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col border-r">
      <div className="flex items-center p-0">
        <div className="w-12" />
        <div className="flex-1 flex justify-center">
          <img src={TyroneLogo.src} alt="Tyrone logo" className="h-12 sm:h-16 md:h-20 lg:h-24 w-auto object-contain" />
        </div>
        <div className="w-12 flex justify-end">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

          <ScrollArea className="flex-1 px-3 py-2">
            <div className="space-y-1">
              {sidebarItems.map((item) => (
                <div key={item.title} className="mb-1">
                  <button
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium",
                      (item.title === "Admin Dashboard" && activeTab === "home") || 
                      (item.title === "My KRA" && activeTab === "my-kra") ||
                      (item.title === "Daily Tasks" && activeTab === "my-tasks") ||
                      (item.title === "Escalated" && activeTab === "escalated-tasks") ||
                      (item.title === "Tasks Dashboard" && activeTab === "tasks-dashboard") ||
                      (item.title === "KPI Dashboard" && activeTab === "kpi-dashboard") ||
                      (item.title === "FAQs" && activeTab === "faqs") ||
                      (item.title === "Management" && activeTab === "apps") 
                        ? "bg-primary/10 text-primary" : "hover:bg-muted",
                    )}
                    onClick={() => {
                      if (item.title === "Admin Dashboard") {
                        setActiveTab("home")
                        setMobileMenuOpen(false)
                      } else if (item.title === "My KRA") {
                        setActiveTab("my-kra")
                        setMobileMenuOpen(false)
                      } else if (item.title === "Daily Tasks") {
                        setActiveTab("my-tasks")
                        setMobileMenuOpen(false)
                      } else if (item.title === "Escalated") {
                        setActiveTab("escalated-tasks")
                        setMobileMenuOpen(false)
                      } else if (item.title === "Tasks Dashboard") {
                        setActiveTab("tasks-dashboard")
                        setMobileMenuOpen(false)
                      } else if (item.title === "KPI Dashboard") {
                        setActiveTab("kpi-dashboard")
                        setMobileMenuOpen(false)
                      } else if (item.title === "FAQs") {
                        setActiveTab("faqs")
                        setMobileMenuOpen(false)
                      } else if (item.items) {
                        toggleExpanded(item.title)
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.title}</span>
                    </div>

                    {item.items && (
                      <ChevronDown
                        className={cn(
                          "ml-2 h-4 w-4 transition-transform",
                          expandedItems[item.title] ? "rotate-180" : "",
                        )}
                      />
                    )}
                  </button>

                  {item.items && expandedItems[item.title] && (
                    <div className="mt-1 ml-6 space-y-1 border-l pl-3">
                      {item.items && item.items.map((subItem: SidebarSubItem) => (
                        <button
                          key={subItem.title}
                          onClick={() => {
                            if (item.title === "Management") {
                              if (subItem.title === "All Management") {
                                handleManagementClick("all")
                                setMobileMenuOpen(false)
                              } else if (subItem.title === "User Management") {
                                handleManagementClick("user")
                                setMobileMenuOpen(false)
                              } else if (subItem.title === "Department Management") {
                                handleManagementClick("department")
                                setMobileMenuOpen(false)
                              } else if (subItem.title === "KRA Management") {
                                handleManagementClick("kra")
                                setMobileMenuOpen(false)
                              } else if (subItem.title === "FAQ Management") {
                                setActiveManagementView("all")
                                setActiveTab("faq-management")
                                setMobileMenuOpen(false)
                              }
                            }
                          }}
                          className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm hover:bg-muted text-left"
                        >
                          {subItem.icon && <span>{subItem.icon}</span>}
                          <span>{subItem.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            <div className="space-y-2">     
              {/* New Profile Section */}
              <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 p-3 dark:from-purple-950/20 dark:to-blue-950/20">
                <button 
                  className="flex w-full items-center gap-3 rounded-xl p-2 hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
                  onClick={() => {
                    setActiveTab("profile")
                    setMobileMenuOpen(false)
                  }}
                >
                  <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-gray-800">
                    <AvatarImage src={currentUser?.avatar ?? undefined} alt="User" />
                    <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                      {(currentUser?.name ?? "")
                        .split(' ')
                        .filter(Boolean)
                        .map(n => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {currentUser?.name ?? "User"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {currentUser?.role ?? "user"}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar - Desktop */}
      <div
        className={cn(
          sidebarOpen
            ? "fixed inset-y-0 left-0 z-30 hidden w-64 transform border-r bg-background transition-all duration-300 ease-in-out md:block"
            : "fixed inset-y-0 left-0 z-30 hidden w-20 transform border-r bg-background transition-all duration-300 ease-in-out md:block",
          sidebarOpen ? "translate-x-0" : "translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="p-4 flex items-center gap-0 justify-center">
            <div className="flex items-center justify-center rounded-2xl bg-transparent">
                  <img src={TyroneLogo.src} alt="Tyrone logo" className="block h-12 sm:h-16 md:h-20 lg:h-24 w-auto object-contain" />
            </div>
          </div>
          
          <ScrollArea className={sidebarOpen ? "flex-1 px-3 py-2" : "flex-1 px-1 py-2"}>
            <div className="space-y-1">
              {sidebarItems.map((item) => (
                <div key={item.title} className="mb-1">
                  <button
                    className={cn(
                      sidebarOpen
                        ? "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium"
                        : "flex w-full items-center justify-center rounded-2xl p-2 text-xl",
                      (item.title === "Admin Dashboard" && activeTab === "home") || 
                        (item.title === "My KRA" && activeTab === "my-kra") ||
                        (item.title === "Daily Tasks" && activeTab === "my-tasks") ||
                        (item.title === "Escalated" && activeTab === "escalated-tasks") ||
                        (item.title === "Tasks Dashboard" && activeTab === "tasks-dashboard") ||
                        (item.title === "KPI Dashboard" && activeTab === "kpi-dashboard") ||
                        (item.title === "FAQs" && activeTab === "faqs") ||
                        (item.title === "Management" && activeTab === "apps") 
                        ? "bg-primary/10 text-primary" : "hover:bg-muted",
                    )}
                    onClick={() => {
                      if (item.title === "Admin Dashboard") {
                        if (!sidebarOpen) {
                          setSidebarOpen(true);
                        } else {
                          setActiveTab("home");
                        }
                      } else if (item.title === "My KRA") {
                        setActiveTab("my-kra")
                      } else if (item.title === "Daily Tasks") {
                        setActiveTab("my-tasks")
                      } else if (item.title === "Escalated") {
                        setActiveTab("escalated-tasks")
                      } else if (item.title === "Tasks Dashboard") {
                        setActiveTab("tasks-dashboard")
                      } else if (item.title === "KPI Dashboard") {
                        setActiveTab("kpi-dashboard")
                      } else if (item.title === "FAQs") {
                        setActiveTab("faqs")
                      } else if (item.items) {
                        toggleExpanded(item.title)
                      }
                    }}
                  >
                    <div className={sidebarOpen ? "flex items-center gap-3" : "flex items-center justify-center"}>
                      {item.icon}
                      {sidebarOpen && <span>{item.title}</span>}
                    </div>

                    {sidebarOpen && item.items && (
                      <ChevronDown
                        className={cn(
                          "ml-2 h-4 w-4 transition-transform",
                          expandedItems[item.title] ? "rotate-180" : "",
                        )}
                      />
                    )}
                  </button>

                  {sidebarOpen && item.items && expandedItems[item.title] && (
                    <div className="mt-1 ml-6 space-y-1 border-l pl-3">
                      {item.items && item.items.map((subItem: SidebarSubItem) => (
                        <button
                          key={subItem.title}
                          onClick={() => {
                            if (item.title === "Management") {
                              if (subItem.title === "All Management") {
                                handleManagementClick("all")
                              } else if (subItem.title === "User Management") {
                                handleManagementClick("user")
                              } else if (subItem.title === "Department Management") {
                                handleManagementClick("department")
                              } else if (subItem.title === "KRA Management") {
                                handleManagementClick("kra")
                              } else if (subItem.title === "FAQ Management") {
                                setActiveManagementView("all")
                                setActiveTab("faq-management")
                              }
                            }
                          }}
                          className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm hover:bg-muted text-left"
                        >
                          {subItem.icon && <span>{subItem.icon}</span>}
                          <span>{subItem.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {sidebarOpen && (
            <div className="border-t p-3">
              <div className="space-y-2">  
                {/* New Profile Section */}
                <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 p-3 dark:from-purple-950/20 dark:to-blue-950/20">
                  <button 
                    className="flex w-full items-center gap-3 rounded-xl p-2 hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
                    onClick={() => setActiveTab("profile")}
                  >
                    <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-gray-800">
                      <AvatarImage src={currentUser?.avatar ?? undefined} alt="User" />
                      <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                        {(currentUser?.name ?? "")
                          .split(' ')
                          .filter(Boolean)
                          .map(n => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {currentUser?.name ?? "User"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {currentUser?.role ?? "user"}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
