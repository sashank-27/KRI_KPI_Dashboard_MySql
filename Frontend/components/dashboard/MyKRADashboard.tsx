"use client";

import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import {
  Target,
  Calendar,
  User,
  Building,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  BarChart3,
  Filter,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { KRA } from "@/lib/types";
import { getAuthHeaders, requireAuth } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import { useSocket, useSocketEvent } from "@/hooks/useSocket";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MyKRADashboardProps {
  currentUserId: string;
}

export function MyKRADashboard({ currentUserId }: MyKRADashboardProps) {
  const [kras, setKras] = useState<KRA[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // WebSocket setup
  const { socket, isConnected } = useSocket();

  // Fetch user's KRAs
  const fetchUserKRAs = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!currentUserId) {
        setKras([]);
        return;
      }
      const res = await fetch(`${getApiBaseUrl()}/api/kras/user/${currentUserId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) {
          requireAuth();
          return;
        }
        throw new Error(`Failed to fetch KRAs: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setKras(Array.isArray(data) ? data : []);
    } catch (err) {
      setKras([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  // Join user room and fetch KRAs on mount/ID change
  useEffect(() => {
    fetchUserKRAs();
    if (socket && currentUserId) {
      socket.emit('join-user-room', currentUserId);
    }
    return () => {
      if (socket && currentUserId) {
        socket.emit('leave-user-room', currentUserId);
      }
    };
  }, [socket, currentUserId, fetchUserKRAs]);

  // Real-time KRA events
  useSocketEvent(socket, 'kra-created', (kra) => {
    if (kra.assignedTo && (kra.assignedTo.id === currentUserId || kra.assignedTo === currentUserId)) {
      setKras((prev) => [kra, ...prev.filter(k => k.id !== kra.id)]);
    }
  });
  useSocketEvent(socket, 'kra-updated', (kra) => {
    if (kra.assignedTo && (kra.assignedTo.id === currentUserId || kra.assignedTo === currentUserId)) {
      setKras((prev) => prev.map(k => k.id === kra.id ? kra : k));
    }
  });
  useSocketEvent(socket, 'kra-deleted', ({ id }) => {
    setKras((prev) => prev.filter(k => k.id !== id));
  });

  // Filter KRAs based on search and filters
  const filteredKRAs = kras.filter((kra) => {
    const matchesSearch = kra.responsibilityAreas.some(area => 
      area.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = statusFilter === "all" || kra.status === statusFilter;
    // Remove priority filter since priority is removed
    return matchesSearch && matchesStatus;
  });

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "on-hold":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "on-hold":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your KRAs...</p>
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
        className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white"
      >
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">My KRAs</h2>
          <p className="max-w-[600px] text-white/80">
            Track and manage your assigned Key Result Areas and responsibilities.
          </p>
        </div>
      </motion.div>





      {/* KRA List */}
      <div className="space-y-4">
        {filteredKRAs.length > 0 ? (
          filteredKRAs.map((kra, index) => (
            <motion.div
              key={kra.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* KRA Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
                        <Target className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {kra.responsibilityAreas && kra.responsibilityAreas.length > 0
                            ? kra.responsibilityAreas[0]
                            : 'No responsibility area'}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge 
                            variant="secondary"
                            className={`${getStatusColor(kra.status)}`}
                          >
                            {getStatusIcon(kra.status)}
                            <span className="ml-1 capitalize">{kra.status}</span>
                          </Badge>
                        </div>

                      </div>
                    </div>

                    {/* Responsibility Areas */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Responsibility Areas:</h4>
                      <ul className="space-y-1">
                        {kra.responsibilityAreas.map((area, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-indigo-500 mt-1">•</span>
                            <span>{area}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* KRA Details */}
                  <div className="lg:w-80 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building className="h-4 w-4" />
                          <span className="font-medium">Department:</span>
                        </div>
                        <p className="text-sm text-gray-900">
                          {typeof kra.department === 'string' 
                            ? kra.department 
                            : kra.department?.name || 'Unknown'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4" />
                          <span className="font-medium">Assigned By:</span>
                        </div>
                        <p className="text-sm text-gray-900">
                          {typeof kra.createdBy === 'string' 
                            ? kra.createdBy 
                            : kra.createdBy?.name || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">Start Date:</span>
                        </div>
                        <p className="text-sm text-gray-900">
                          {formatDate(kra.startDate).split(',')[0]}
                        </p>
                      </div>
                      {kra.endDate && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">End Date:</span>
                          </div>
                          <p className="text-sm text-gray-900">
                            {formatDate(kra.endDate).split(',')[0]}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Progress indicator for active KRAs */}
                    {kra.status === "active" && kra.endDate && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Progress</span>
                          <span>
                            {Math.round(
                              ((new Date().getTime() - new Date(kra.startDate).getTime()) /
                              (new Date(kra.endDate).getTime() - new Date(kra.startDate).getTime())) * 100
                            )}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.max(0, 
                                ((new Date().getTime() - new Date(kra.startDate).getTime()) /
                                (new Date(kra.endDate).getTime() - new Date(kra.startDate).getTime())) * 100
                              ))}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
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
            <Target className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No KRAs Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                ? "No KRAs match your current filters. Try adjusting your search criteria."
                : "You don't have any KRAs assigned yet. Contact your administrator to get started."}
            </p>
            {(searchTerm || statusFilter !== "all" || priorityFilter !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setPriorityFilter("all");
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
