"use client";

import { useState } from "react";
import { X, Calendar, AlertCircle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NewDailyTask } from "@/lib/types";

interface DailyTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  newTask: NewDailyTask;
  setNewTask: (task: NewDailyTask) => void;
  onCreateTask: () => void;
  isEdit?: boolean;
}

export function DailyTaskModal({
  isOpen,
  onClose,
  newTask,
  setNewTask,
  onCreateTask,
  isEdit = false,
}: DailyTaskModalProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!newTask.task.trim()) {
      newErrors.task = "Task is required";
    }

    if (!newTask.remarks.trim()) {
      newErrors.remarks = "Remarks are required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onCreateTask();
    }
  };

  const handleInputChange = (field: keyof NewDailyTask, value: string) => {
    setNewTask({ ...newTask, [field]: value });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <ClipboardList className="h-5 w-5 text-emerald-600" />
            {isEdit ? "Edit Daily Task" : "Daily Task Input"}
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            {isEdit ? "Update the daily task details" : "Log your daily tasks and track progress"}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task */}
          <div className="space-y-2">
            <Label htmlFor="task" className="text-sm font-medium">
              Task <span className="text-red-500">*</span>
            </Label>
            <Input
              id="task"
              placeholder="Enter task description"
              value={newTask.task}
              onChange={(e) => handleInputChange("task", e.target.value)}
              className={errors.task ? "border-red-500" : ""}
            />
            {errors.task && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.task}
              </p>
            )}
          </div>

          {/* SR-ID */}
          <div className="space-y-2">
            <Label htmlFor="srId" className="text-sm font-medium">
              SR-ID
            </Label>
            <Input
              id="srId"
              placeholder="Enter Service Request ID"
              value={newTask.srId}
              onChange={(e) => handleInputChange("srId", e.target.value)}
              className={errors.srId ? "border-red-500" : ""}
            />
            {errors.srId && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.srId}
              </p>
            )}
          </div>

          {/* Client Details */}
          <div className="space-y-2">
            <Label htmlFor="clientDetails" className="text-sm font-medium">
              Client Details
            </Label>
            <Input
              id="clientDetails"
              placeholder="Enter client details"
              value={newTask.clientDetails || ""}
              onChange={(e) => handleInputChange("clientDetails", e.target.value)}
              className={errors.clientDetails ? "border-red-500" : ""}
            />
            {errors.clientDetails && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.clientDetails}
              </p>
            )}
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks" className="text-sm font-medium">
              Remarks <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="remarks"
              placeholder="Enter remarks..."
              value={newTask.remarks}
              onChange={(e) => handleInputChange("remarks", e.target.value)}
              className={`min-h-[100px] resize-none ${errors.remarks ? "border-red-500" : ""}`}
            />
            {errors.remarks && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.remarks}
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium">
              Status
            </Label>
            <Select
              value={newTask.status}
              onValueChange={(value) => handleInputChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in-progress">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    In Progress
                  </div>
                </SelectItem>
                <SelectItem value="closed">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Closed
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium">
              Date
            </Label>
            <div className="relative">
              <Input
                id="date"
                type="date"
                value={formatDateForInput(newTask.date)}
                onChange={(e) => handleInputChange("date", e.target.value)}
                className={errors.date ? 'border-red-500' : ''}
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.date && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.date}
              </p>
            )}
          </div>



          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
            >
              {isEdit ? "Update Task" : "Submit Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
