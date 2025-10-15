"use client";

import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import {
  Target,
  Plus,
  MoreHorizontal,
  PanelLeft,
  ArrowUpDown,
  Edit,
  Trash2,
  Calendar,
  User,
  Building,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KRA, NewKRA, Department, User as UserType } from "@/lib/types";
import { getApiBaseUrl } from "@/lib/api";
import { KRAModal } from "@/components/modals/KRAModal";
import { getAuthHeaders, requireAuth } from "@/lib/auth";
import { useState, useEffect, useCallback } from "react";
import { useSocket, useSocketEvent } from "@/hooks/useSocket";
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

interface KRAManagementProps {
  departments: Department[];
  users: UserType[];
}

export function KRAManagement({ departments, users }: KRAManagementProps) {
  const [kras, setKras] = useState<KRA[]>([]);
  const [createKRAOpen, setCreateKRAOpen] = useState(false);
  const [editKRAOpen, setEditKRAOpen] = useState(false);
  const [editingKRA, setEditingKRA] = useState<KRA | null>(null);
  const [deleteKRAOpen, setDeleteKRAOpen] = useState(false);
  const [kraToDelete, setKraToDelete] = useState<KRA | null>(null);
  const [newKRA, setNewKRA] = useState<NewKRA>({
    responsibilityAreas: "",
    departmentId: "",
    assignedToId: "",
    startDate: "",
    endDate: "",
  });

  // WebSocket setup
  const { socket, isConnected } = useSocket();

  // Fetch KRAs from backend
  const fetchKRAs = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/kras`, {
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
    }
  }, []);

  // Join admin room and fetch KRAs on mount
  useEffect(() => {
    fetchKRAs();
    if (socket) {
      socket.emit('join-admin-room');
    }
    return () => {
      if (socket) {
        socket.emit('leave-admin-room');
      }
    };
  }, [socket, fetchKRAs]);

  // Real-time KRA events
  useSocketEvent(socket, 'kra-created', (kra) => {
    setKras((prev) => [kra, ...prev.filter(k => k.id !== kra.id)]);
  });
  useSocketEvent(socket, 'kra-updated', (kra) => {
    setKras((prev) => prev.map(k => k.id === kra.id ? kra : k));
  });
  useSocketEvent(socket, 'kra-deleted', ({ id }) => {
    setKras((prev) => prev.filter(k => k.id !== id));
  });

  // Create KRA
  const handleCreateKRA = async () => {
    
    if (
      newKRA.responsibilityAreas &&
      newKRA.departmentId &&
      newKRA.assignedToId &&
      newKRA.startDate
    ) {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/kras`, {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify(newKRA),
        });
        if (!res.ok) {
          if (res.status === 401) {

            requireAuth();
            return;
          }
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to create KRA: ${res.status} ${res.statusText}`);
        }
        const createdKRA = await res.json();
        setKras([...kras, createdKRA]);
        setCreateKRAOpen(false);
        setNewKRA({
          responsibilityAreas: "",
          departmentId: "",
          assignedToId: "",
          startDate: "",
          endDate: "",
        });
      } catch (err) {
        console.error("Failed to create KRA", err);
        alert(`Failed to create KRA: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } else {
      console.error("KRA validation failed - missing fields:");
      console.error("Missing fields:", {
        responsibilityAreas: !newKRA.responsibilityAreas,
        departmentId: !newKRA.departmentId,
        assignedToId: !newKRA.assignedToId,
        startDate: !newKRA.startDate
      });
      alert("Please fill in all required fields: Responsibility Areas, Department, Assigned User, and Start Date");
    }
  };

  // Edit KRA
  const handleEditKRA = (kra: KRA) => {
    setEditingKRA(kra);
    setEditKRAOpen(true);
  };

  // Update KRA
  const handleUpdateKRA = async (updatedKRA: KRA) => {
    try {
      // Convert responsibility areas from string to array if needed
      const responsibilityAreas = typeof updatedKRA.responsibilityAreas === 'string'
        ? (updatedKRA.responsibilityAreas as string).split('\n').map((s: string) => s.trim()).filter(Boolean)
        : updatedKRA.responsibilityAreas;

      const dataToSend = {
        ...updatedKRA,
        responsibilityAreas,
      };

      const res = await fetch(`${getApiBaseUrl()}/api/kras/${updatedKRA.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(dataToSend),
      });
      
      if (!res.ok) {
        if (res.status === 401) {

          requireAuth();
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update KRA: ${res.status} ${res.statusText}`);
      }
      
      const updated = await res.json();
      setKras(kras.map((kra) => (kra.id === updated.id ? updated : kra)));
      setEditKRAOpen(false);
      setEditingKRA(null);
    } catch (err) {
      console.error("Failed to update KRA", err);
      alert(`Failed to update KRA: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Delete KRA
  const handleDeleteKRA = (kra: KRA) => {
    setKraToDelete(kra);
    setDeleteKRAOpen(true);
  };

  const confirmDeleteKRA = async () => {
    if (kraToDelete) {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/kras/${kraToDelete.id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
          credentials: "include",
        });
        
        if (!res.ok) {
          if (res.status === 401) {

            requireAuth();
            return;
          }
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to delete KRA: ${res.status} ${res.statusText}`);
        }
        
        setKras(kras.filter((kra) => kra.id !== kraToDelete.id));
        setDeleteKRAOpen(false);
        setKraToDelete(null);
      } catch (err) {
        console.error("Failed to delete KRA", err);
        alert(`Failed to delete KRA: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

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

  return (
    <>
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 p-8 text-white"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">KRA Management</h2>
              <p className="max-w-[600px] text-white/80">
                Create, assign, and manage Key Result Areas for your team members.
              </p>
            </div>
            <Button
              className="rounded-2xl bg-white text-purple-700 hover:bg-white/90"
              onClick={() => setCreateKRAOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create KRA
            </Button>
          </div>
        </motion.div>
      </section>

      <section className="space-y-4 mt-9">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">All KRAs</h2>
          {/* Removed Filter and Sort buttons */}
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b">
            <div className="grid grid-cols-11 gap-4 text-sm font-semibold text-gray-700">
              <div className="col-span-4">Responsibility Areas</div>
              <div className="col-span-2">Assigned To</div>
              <div className="col-span-2">Department</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Start Date</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>
          
          {/* KRA List */}
          <div className="divide-y divide-gray-100">
            {Array.isArray(kras) && kras.length > 0 ? kras.map((kra, idx) => (
              <div
                key={kra.id}
                className="px-6 py-4 hover:bg-gray-50/50 transition-colors duration-200"
              >
                <div className="grid grid-cols-11 gap-4 items-center">
                  {/* KRA Info */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      <Target className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">
                          {kra.responsibilityAreas && kra.responsibilityAreas.length > 0
                            ? kra.responsibilityAreas[0]
                            : 'No responsibility area'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {kra.responsibilityAreas.length} responsibility areas
                        </p>
                      </div>
                  </div>
                  
                  {/* Assigned To */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700 truncate">
                        {typeof kra.assignedTo === 'string' 
                          ? kra.assignedTo 
                          : kra.assignedTo?.name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Department */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700 truncate">
                        {typeof kra.department === 'string' 
                          ? kra.department 
                          : kra.department?.name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  

                  
                  {/* Status */}
                  <div className="col-span-1">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(kra.status)}
                      <Badge 
                        variant="secondary"
                        className={`text-xs ${getStatusColor(kra.status)}`}
                      >
                        {kra.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Start Date */}
                  <div className="col-span-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {formatDate(kra.startDate).split(',')[0]}
                      </span>
                    </div>
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
                          onClick={() => handleEditKRA(kra)}
                          className="cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit KRA
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteKRA(kra)}
                          className="text-red-600 cursor-pointer focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete KRA
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )) : (
              <div className="px-6 py-8 text-center text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No KRAs found</p>
                <p className="text-sm">Create your first KRA to get started.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <KRAModal
        isOpen={createKRAOpen}
        onClose={() => setCreateKRAOpen(false)}
          newKRA={newKRA}
          setNewKRA={setNewKRA}
          departments={departments}
          users={users}
          onCreateKRA={handleCreateKRA}
      />

      {editingKRA && (
        <KRAModal
          isOpen={editKRAOpen}
          onClose={() => {
            setEditKRAOpen(false);
            setEditingKRA(null);
          }}
          newKRA={{
            responsibilityAreas: Array.isArray(editingKRA.responsibilityAreas)
              ? editingKRA.responsibilityAreas.join('\n')
              : editingKRA.responsibilityAreas || '',
            departmentId: typeof editingKRA.department === 'string' 
              ? editingKRA.department 
              : editingKRA.department?.id || '',
            assignedToId: typeof editingKRA.assignedTo === 'string' 
              ? editingKRA.assignedTo 
              : editingKRA.assignedTo?.id || '',
            startDate: editingKRA.startDate || '',
            endDate: editingKRA.endDate || '',
          }}
          setNewKRA={(updatedKRA) => {
            setEditingKRA({
              ...editingKRA,
              departmentId: updatedKRA.departmentId,
              assignedToId: updatedKRA.assignedToId,
              startDate: updatedKRA.startDate,
              endDate: updatedKRA.endDate,
              // Store the string version temporarily for editing
              responsibilityAreas: updatedKRA.responsibilityAreas as unknown as string[],
            });
          }}
          departments={departments}
          users={users}
          onCreateKRA={() => {
            if (editingKRA) {
              handleUpdateKRA(editingKRA);
            }
          }}
          isEdit={true}
        />
      )}

      <AlertDialog open={deleteKRAOpen} onOpenChange={setDeleteKRAOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the KRA and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteKRA}
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
