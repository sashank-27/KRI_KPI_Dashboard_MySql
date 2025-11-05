"use client";

import { useState } from "react";
import { TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DailyTask } from "@/lib/types";
import { getApiBaseUrl } from "@/lib/api";
import { getAuthHeaders } from "@/lib/auth";
import { toast } from "sonner";

interface AddProgressModalProps {
  isOpen: boolean;
  onClose: (refreshTask?: boolean) => void;
  task: DailyTask | null;
}

export function AddProgressModal({ isOpen, onClose, task }: AddProgressModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [progressDescription, setProgressDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!task) {
      toast.error("No task selected");
      return;
    }

    if (!progressDescription.trim()) {
      setError("Please describe your progress");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/daily-tasks/${task.id}/progress`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          progressDescription: progressDescription.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add progress");
      }

      toast.success("Progress update added successfully!");
      
      // Reset form
      setProgressDescription("");
      setDate(new Date().toISOString().split('T')[0]);
      
      onClose(true); // Close modal and signal to refresh
    } catch (error: any) {
      console.error("Error adding progress:", error);
      toast.error(error.message || "Failed to add progress");
      setError(error.message || "Failed to add progress");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setProgressDescription("");
      setDate(new Date().toISOString().split('T')[0]);
      setError("");
      onClose();
    }
  };

  if (!task) return null;

  // Calculate days in progress
  const daysInProgress = task.createdAt 
    ? Math.ceil((new Date().getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Daily Progress Update
          </DialogTitle>
          <DialogDescription>
            Record your progress for today on this task
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Info Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border space-y-2">
            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-medium">Task</p>
              <p className="text-sm text-gray-900 font-medium">{task.task}</p>
            </div>
            {task.srId && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-medium">SR-ID</p>
                <p className="text-sm font-mono text-gray-900">{task.srId}</p>
              </div>
            )}
            {daysInProgress > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <p className="text-xs text-orange-600 font-medium">
                  Task in progress for {daysInProgress} {daysInProgress === 1 ? 'day' : 'days'}
                </p>
              </div>
            )}
          </div>

          {/* Date Input */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium">
              Date
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                disabled={loading}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Progress Description */}
          <div className="space-y-2">
            <Label htmlFor="progressDescription" className="text-sm font-medium">
              What did you do today? <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="progressDescription"
              value={progressDescription}
              onChange={(e) => {
                setProgressDescription(e.target.value);
                setError("");
              }}
              placeholder="Describe your progress, what you accomplished, challenges faced, etc."
              rows={6}
              disabled={loading}
              className={error ? "border-red-500" : ""}
              required
            />
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Be specific about your accomplishments, blockers, or next steps
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Saving..." : "Save Progress"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
