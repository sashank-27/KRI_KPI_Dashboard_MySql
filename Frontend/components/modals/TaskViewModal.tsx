"use client";

import React, { useEffect, useState } from "react";
import {
  Eye,
  Calendar,
  User,
  Building,
  Clock,
  AlertCircle,
  Tag,
  FileText,
  TrendingUp,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import { DailyTask } from "@/lib/types";
import { formatDate, getTaskDuration } from "@/lib/utils";
import { getApiBaseUrl } from "@/lib/api";
import { getAuthHeaders } from "@/lib/auth";

interface TaskProgress {
  id: number;
  date: string;
  progressDescription: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface TaskViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: DailyTask | null;
}

export function TaskViewModal({
  isOpen,
  onClose,
  task,
}: TaskViewModalProps) {
  const [progressHistory, setProgressHistory] = useState<TaskProgress[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      fetchProgressHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, isOpen]);

  const fetchProgressHistory = async () => {
    if (!task) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/daily-tasks/${task.id}/progress`,
        {
          headers: getAuthHeaders(),
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProgressHistory(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch progress history:", response.status);
        setProgressHistory([]);
      }
    } catch (error) {
      console.error("Error fetching progress history:", error);
      // Set empty array on error so UI shows "no progress" instead of loading
      setProgressHistory([]);
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "closed":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTaskDurationDisplay = (task: DailyTask) => {
    if (task.status === "closed" && task.closedAt && task.createdAt) {
      return getTaskDuration(task.createdAt, task.closedAt);
    }
    return "In Progress";
  };

  const timeString = (iso?: string) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-medium">
            <Eye className="h-5 w-5 text-gray-600" />
            Task Details
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Complete information about this task
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-1">
          {/* Basic info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-700">Task Description</h3>
              </div>
              <div className="bg-white rounded-md p-3 border border-gray-100">
                <p className="text-sm text-gray-800 leading-relaxed">{task.task}</p>
              </div>
            </div>

            {task.srId && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-700">SR-ID</h3>
                </div>
                <div className="bg-gray-50 rounded-md p-2 border border-gray-100">
                  <p className="text-sm font-mono text-gray-700">{task.srId}</p>
                </div>
              </div>
            )}

            {task.clientDetails && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-700">Client Details</h3>
                </div>
                <div className="bg-gray-50 rounded-md p-2 border border-gray-100">
                  <p className="text-sm text-gray-700">{task.clientDetails}</p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-700">Remarks</h3>
              </div>
              <div className="bg-white rounded-md p-3 border border-gray-100">
                <p className="text-sm text-gray-800 leading-relaxed">{task.remarks}</p>
              </div>
            </div>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-2 text-gray-500">
                <User className="h-4 w-4" />
                <span className="font-medium text-gray-600">Assigned To</span>
              </div>
              <p className="text-gray-800 mt-1">
                {typeof task.user === "string" ? task.user : task.user?.name || "Unknown"}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-gray-500">
                <Building className="h-4 w-4" />
                <span className="font-medium text-gray-600">Department</span>
              </div>
              <p className="text-gray-800 mt-1">
                {typeof task.department === "string" ? task.department : task.department?.name || "Unknown"}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar className="h-4 w-4" />
                <span className="font-medium text-gray-600">Date</span>
              </div>
              <p className="text-gray-800 mt-1">{formatDate(task.date).split(",")[0]}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-gray-500">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium text-gray-600">Status</span>
              </div>
              <div className="mt-1">
                <Badge className={getStatusColor(task.status || "in-progress")}>
                  {task.status || "in-progress"}
                </Badge>
              </div>
            </div>

            {task.status === "closed" && task.closedAt && task.createdAt && (
              <div className="col-span-2">
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium text-gray-600">Duration</span>
                </div>
                <p className="text-gray-800 mt-1">{getTaskDurationDisplay(task)}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-700">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {task.tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* TIMELINE - Only show if there's progress history OR task is still in-progress */}
          {(progressHistory && progressHistory.length > 0) || task.status !== "closed" ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Progress Timeline</h3>
              </div>

              {loading ? (
                <div className="bg-gray-50 rounded-md p-3 border border-gray-100 text-center">
                  <p className="text-sm text-gray-500">Loading progress history...</p>
                </div>
              ) : progressHistory && progressHistory.length > 0 ? (
                <div className="space-y-4">
                  {/* Task Started */}
                  {task.createdAt && (
                    <div className="flex gap-3 group">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5"></div>
                        <div className="w-px h-full bg-gray-200 mt-1"></div>
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">Task Started</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{formatDate(task.createdAt).split(",")[0]}</span>
                          <span className="text-xs text-gray-500">{timeString(task.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Progress Updates */}
                  {[...progressHistory].slice().reverse().map((progress, index) => (
                    <div key={progress.id} className="flex gap-3 group">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5"></div>
                        <div className="w-px h-full bg-gray-200 mt-1"></div>
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">Progress Update #{index + 1}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{formatDate(progress.date).split(",")[0]}</span>
                          <span className="text-xs text-gray-500">{timeString(progress.createdAt)}</span>
                        </div>
                        <div className="mt-2 pl-3 border-l-2 border-gray-200">
                          <p className="text-sm text-gray-700 mb-1">"{progress.progressDescription}"</p>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="w-3 h-3" />
                            <span>by {progress.user?.name || "Unknown"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Task Completed */}
                  {task.status === "closed" && task.closedAt && (
                    <div className="flex gap-3 group">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0 mt-1.5"></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">Task Completed</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{formatDate(task.closedAt).split(",")[0]}</span>
                          <span className="text-xs text-gray-500">{timeString(task.closedAt)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-md p-6 border border-gray-100 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-600 font-medium">User didn't add any progress yet</p>
                    <p className="text-xs text-gray-500">Progress updates will appear here once added</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
