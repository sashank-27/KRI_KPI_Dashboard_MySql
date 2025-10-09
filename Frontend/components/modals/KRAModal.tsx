"use client";

import { useState } from "react";
import { X, Calendar, User, Building, Target, AlertCircle } from "lucide-react";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { NewKRA, Department, User as UserType } from "@/lib/types";

interface KRAModalProps {
  isOpen: boolean;
  onClose: () => void;
  newKRA: NewKRA;
  setNewKRA: (kra: NewKRA) => void;
  departments: Department[];
  users: UserType[];
  onCreateKRA: () => void;
  isEdit?: boolean;
}

export function KRAModal({
  isOpen,
  onClose,
  newKRA,
  setNewKRA,
  departments,
  users,
  onCreateKRA,
  isEdit = false,
}: KRAModalProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newKRA.responsibilityAreas.trim()) {
      newErrors.responsibilityAreas = "Responsibility areas are required";
    }
    if (!newKRA.departmentId) {
      newErrors.departmentId = "Department is required";
    }
    if (!newKRA.assignedToId) {
      newErrors.assignedToId = "Assigned user is required";
    }
    if (!newKRA.startDate) {
      newErrors.startDate = "Start date is required";
    }
    // Validate date range
    if (newKRA.startDate && newKRA.endDate) {
      const startDate = new Date(newKRA.startDate);
      const endDate = new Date(newKRA.endDate);
      if (endDate <= startDate) {
        newErrors.endDate = "End date must be after start date";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onCreateKRA();
    }
  };

  const handleInputChange = (field: keyof NewKRA, value: string) => {
    setNewKRA({ ...newKRA, [field]: value });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const formatDateForInput = (dateString: string) => {
    // Handle null, undefined, or empty values
    if (!dateString || dateString === 'null' || dateString === 'undefined') {
      return "";
    }
    
    try {
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date string provided:", dateString);
        return "";
      }
      
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>

      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Target className="h-5 w-5 text-purple-600" />
            {isEdit ? "Edit KRA" : "Create New KRA"}
          </DialogTitle>
          <DialogDescription>
            Enter the required details to create a new KRA.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">


          {/* Responsibility Areas */}
          <div className="space-y-2">
            <Label htmlFor="responsibilityAreas" className="text-sm font-medium">
              Responsibility Area <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="responsibilityAreas"
              placeholder="Enter responsibility areas as bullet points&#10;• First responsibility&#10;• Second responsibility&#10;• Third responsibility"
              value={newKRA.responsibilityAreas}
              onChange={(e) => handleInputChange("responsibilityAreas", e.target.value)}
              className={`min-h-[100px] resize-none ${errors.responsibilityAreas ? "border-red-500" : ""}`}
            />
            <p className="text-xs text-gray-500">
              Enter each responsibility area on a new line starting with •
            </p>
            {errors.responsibilityAreas && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.responsibilityAreas}
              </p>
            )}
          </div>

          {/* Department and Assigned To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department" className="text-sm font-medium">
                Department <span className="text-red-500">*</span>
              </Label>
              <Select
                value={newKRA.departmentId}
                onValueChange={(value) => handleInputChange("departmentId", value)}
              >
                <SelectTrigger className={errors.departmentId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400" />
                        {dept.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.departmentId && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.departmentId}
                </p>
              )}
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <Label htmlFor="assignedTo" className="text-sm font-medium">
                Assigned To <span className="text-red-500">*</span>
              </Label>
              <Select
                value={newKRA.assignedToId}
                onValueChange={(value) => handleInputChange("assignedToId", value)}
              >
                <SelectTrigger className={errors.assignedToId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {user.name || user.email}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.assignedToId && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.assignedToId}
                </p>
              )}
            </div>
          </div>

          {/* Start Date and End Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-sm font-medium">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="startDate"
                  type="date"
                  value={formatDateForInput(newKRA?.startDate || "")}
                  onChange={(e) => handleInputChange("startDate", e.target.value)}
                  className={errors.startDate ? "border-red-500" : ""}
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {errors.startDate && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.startDate}
                </p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-sm font-medium">
                End Date
              </Label>
              <div className="relative">
                <Input
                  id="endDate"
                  type="date"
                  value={formatDateForInput(newKRA?.endDate || "")}
                  onChange={(e) => handleInputChange("endDate", e.target.value)}
                  className={errors.endDate ? "border-red-500" : ""}
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {errors.endDate && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.endDate}
                </p>
              )}
            </div>
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
              className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isEdit ? "Update KRA" : "Create KRA"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
