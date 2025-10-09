"use client";

import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import {
  Layers,
  Plus,
  Users,
  Share2,
  MoreHorizontal,
  PanelLeft,
  ArrowUpDown,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Department, User } from "@/lib/types";
import { DepartmentModal } from "@/components/modals/DepartmentModal";
import { getAuthHeaders, requireAuth } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DepartmentManagementProps {
  departments: Department[];
  setDepartments: (departments: Department[]) => void;
  createDeptOpen: boolean;
  setCreateDeptOpen: (open: boolean) => void;
  newDeptName: string;
  setNewDeptName: (name: string) => void;
  users: User[];
}

export function DepartmentManagement({
  departments,
  setDepartments,
  createDeptOpen,
  setCreateDeptOpen,
  newDeptName,
  setNewDeptName,
  users,
}: DepartmentManagementProps) {
  const [editDeptOpen, setEditDeptOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteDeptOpen, setDeleteDeptOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);

  // Function to get member count for a department
  const getMemberCount = (departmentId: string) => {
    return users.filter(user => {
      const userDeptId = typeof user.department === 'string' 
        ? user.department 
        : user.department?.id;
      return userDeptId === departmentId;
    }).length;
  };

  // Fetch departments from backend
  useEffect(() => {
    fetch(`${getApiBaseUrl()}/api/departments`, {
      headers: getAuthHeaders(),
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            console.log('Unauthorized access, redirecting to login');
            requireAuth();
            return;
          }
          throw new Error(`Failed to fetch departments: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        // Ensure data is an array
        setDepartments(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to fetch departments in DepartmentManagement", err);
        setDepartments([]);
      });
  }, [setDepartments]);

  // Create department
  const handleCreateDepartment = async () => {
    if (newDeptName.trim()) {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/departments`, {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({ name: newDeptName }),
        });
        if (res.ok) {
          const created = await res.json();
          setDepartments([...departments, created]);
          setCreateDeptOpen(false);
          setNewDeptName("");
        } else {
          if (res.status === 401) {
            console.log('Unauthorized access, redirecting to login');
            requireAuth();
            return;
          }
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to create department: ${res.status} ${res.statusText}`);
        }
      } catch (err) {
        console.error("Failed to create department", err);
        alert(`Failed to create department: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  // Edit department
  const handleEditDepartment = (dept: Department) => {
    setEditingDept(dept);
    setEditDeptOpen(true);
  };

  // Update department
  const handleUpdateDepartment = async (updatedDept: Department) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/departments/${updatedDept.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ name: updatedDept.name }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDepartments(
          departments.map((dept: Department) =>
            dept.id === updated.id ? updated : dept
          )
        );
        setEditDeptOpen(false);
        setEditingDept(null);
      } else {
        if (res.status === 401) {
          console.log('Unauthorized access, redirecting to login');
          requireAuth();
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update department: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.error("Failed to update department", err);
      alert(`Failed to update department: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Delete department
  const handleDeleteDepartment = (dept: Department) => {
    setDeptToDelete(dept);
    setDeleteDeptOpen(true);
  };

  const confirmDeleteDepartment = async () => {
    if (deptToDelete) {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/departments/${deptToDelete.id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
          credentials: "include",
        });
        if (res.ok) {
          setDepartments(
            departments.filter(
              (dept: Department) => dept.id !== deptToDelete.id
            )
          );
          setDeleteDeptOpen(false);
          setDeptToDelete(null);
        } else {
          if (res.status === 401) {
            console.log('Unauthorized access, redirecting to login');
            requireAuth();
            return;
          }
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to delete department: ${res.status} ${res.statusText}`);
        }
      } catch (err) {
        console.error("Failed to delete department", err);
        alert(`Failed to delete department: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  return (
    <>
      <section className="space-y-4 mt-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-3xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 p-8 text-white"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Department Management</h2>
              <p className="max-w-[600px] text-white/80">
                Create, manage, and view all your departments in one place.
              </p>
            </div>
            <Button
              className="rounded-2xl bg-white text-blue-700 hover:bg-white/90"
              onClick={() => setCreateDeptOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Department
            </Button>
          </div>
        </motion.div>
      </section>

  <section className="space-y-4 mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">All Departments</h2>
          <div className="flex gap-2">
            {/* Removed Filter and Sort buttons */}
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b">
            <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
              <div className="col-span-6">Department</div>
              <div className="col-span-3">Members</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>
          
          {/* Department List */}
          <div className="divide-y divide-gray-100">
            {Array.isArray(departments) && departments.length > 0 ? departments.map((dept, idx) => (
              <div
                key={dept.id}
                className="px-6 py-4 hover:bg-gray-50/50 transition-colors duration-200"
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Department Info */}
                  <div className="col-span-6 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      <Layers className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">{dept.name}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="mr-1 h-3 w-3" />
                        {getMemberCount(dept.id)} {getMemberCount(dept.id) === 1 ? 'member' : 'members'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Members Count */}
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">
                        {getMemberCount(dept.id)} active
                      </span>
                    </div>
                  </div>
                  
                  {/* Created Date */}
                  <div className="col-span-2">
                    <span className="text-sm text-gray-600">
                      {formatDate(dept.createdAt || "").split(',')[0]}
                    </span>
                  </div>
                  
                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-gray-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => handleEditDepartment(dept)}
                          className="cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Department
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteDepartment(dept)}
                          className="text-red-600 cursor-pointer focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Department
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )) : (
              <div className="px-6 py-8 text-center text-gray-500">
                <Layers className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No departments found</p>
                <p className="text-sm">Create your first department to get started.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <DepartmentModal
        isOpen={createDeptOpen}
        onClose={() => setCreateDeptOpen(false)}
        newDeptName={newDeptName}
        setNewDeptName={setNewDeptName}
        onCreateDepartment={handleCreateDepartment}
      />

      {editingDept && (
        <DepartmentModal
          isOpen={editDeptOpen}
          onClose={() => {
            setEditDeptOpen(false);
            setEditingDept(null);
          }}
          newDeptName={editingDept.name}
          setNewDeptName={(name) => {
            setEditingDept({
              ...editingDept,
              name,
            });
          }}
          onCreateDepartment={() => {
            if (editingDept) {
              handleUpdateDepartment(editingDept);
            }
          }}
          isEdit={true}
        />
      )}

      <AlertDialog open={deleteDeptOpen} onOpenChange={setDeleteDeptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              department <strong>{deptToDelete?.name}</strong> and all its
              associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteDepartment}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

