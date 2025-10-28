"use client";

import { motion } from "framer-motion";
import {
  Plus,
  MoreHorizontal,
  PanelLeft,
  ArrowUpDown,
  Edit,
  Trash2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { User, NewUser, Department } from "@/lib/types";
import { getApiBaseUrl } from "@/lib/api";
import { UserModal } from "@/components/modals/UserModal";
import { getAuthHeaders, getAuthToken, requireAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
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

interface UserManagementProps {
  users: User[];
  setUsers: (users: User[]) => void;
  createUserOpen: boolean;
  setCreateUserOpen: (open: boolean) => void;
  newUser: NewUser;
  setNewUser: (user: NewUser) => void;
  departments: Department[];
  onCreateUser: (user: Omit<User, "id">) => void;
  onUpdateUser: (id: string, user: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
}

export function UserManagement({
  users,
  setUsers,
  createUserOpen,
  setCreateUserOpen,
  newUser,
  setNewUser,
  departments,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}: UserManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if current user is admin
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setIsAdmin(payload.role === 'admin');
      } catch (err) {
        console.error('Error parsing token:', err);
      }
    }
  }, []);

  // Reset user password
  const handleResetPassword = async (userId: string, newPassword: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/users/${userId}/reset-password`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ newPassword }),
      });
      
      if (!res.ok) {
        if (res.status === 401) {

          requireAuth();
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to reset password: ${res.status} ${res.statusText}`);
      }
      // Use toast notification instead of alert
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', message: 'Password reset successfully!' } }));
      }
    } catch (err) {
      console.error("Failed to reset password", err);
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message: `Failed to reset password: ${err instanceof Error ? err.message : 'Unknown error'}` } }));
      }
    }
  };

  // Add user (POST)
  const handleAddUser = async () => {
    
    if (
      newUser.username &&
      newUser.name &&
      newUser.email &&
      newUser.password &&
      newUser.departmentId &&
      newUser.role
    ) {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/users`, {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            username: newUser.username,
            name: newUser.name,
            email: newUser.email,
            password: newUser.password,
            departmentId: newUser.departmentId,
            role: newUser.role,
            joined: new Date().toISOString(),
          }),
        });
        if (!res.ok) {
          if (res.status === 401) {

            requireAuth();
            return;
          }
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to create user: ${res.status} ${res.statusText}`);
        }
        // Optionally refetch users or update local state
        const createdUser = await res.json();
        setUsers([
          ...users,
          {
            id: createdUser.id || Math.random().toString(),
            username: createdUser.username ?? newUser.username,
            name: createdUser.name ?? newUser.name,
            email: createdUser.email ?? newUser.email,
            department: createdUser.department ?? departments.find(d => d.id === newUser.departmentId),
            role: createdUser.role ?? newUser.role,
            joined: createdUser.joined ?? new Date().toISOString(),
            createdBy: createdUser.createdBy,
          },
        ]);
        setCreateUserOpen(false);
        setNewUser({
          username: "",
          name: "",
          email: "",
          password: "",
          departmentId: "",
          role: "",
        });
      } catch (err) {
        console.error("Failed to create user", err);
        alert(`Failed to create user: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } else {
      console.error("Validation failed - missing fields:");
      console.error("Missing fields:", {
        username: !newUser.username,
        name: !newUser.name,
        email: !newUser.email,
        password: !newUser.password,
        departmentId: !newUser.departmentId,
        role: !newUser.role
      });
      alert("Missing required fields: username, name, email, password, role, departmentId");
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserOpen(true);
  };

  // Update user (PUT)
  const handleUpdateUserLocal = async (updatedUser: User) => {
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/users/${updatedUser.id}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify(updatedUser),
        }
      );
      if (!res.ok) {
        if (res.status === 401) {

          requireAuth();
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update user: ${res.status} ${res.statusText}`);
      }
      const updatedUserResponse = await res.json();
      setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUserResponse : u)));
    } catch (err) {
      console.error("Failed to update user", err);
      alert(`Failed to update user: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    setEditUserOpen(false);
    setEditingUser(null);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteUserOpen(true);
  };

  // Delete user (DELETE)
  const confirmDeleteUser = async () => {
    if (userToDelete) {
      try {
        const res = await fetch(
          `${getApiBaseUrl()}/api/users/${userToDelete.id}`,
          {
            method: "DELETE",
            headers: getAuthHeaders(),
            credentials: "include",
          }
        );
        if (!res.ok) {
          if (res.status === 401) {

            requireAuth();
            return;
          }
          const errorText = await res.text();
          throw new Error("Failed to delete user: " + errorText);
        }
        // Optionally update local state or refetch users
        setUsers(users.filter((u) => u.id !== userToDelete.id));
      } catch (err) {
        console.error("Failed to delete user", err);
      }
      setDeleteUserOpen(false);
      setUserToDelete(null);
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    
    // Search in user name
    const matchesName = user.name?.toLowerCase().includes(query);
    
    // Search in username
    const matchesUsername = user.username?.toLowerCase().includes(query);
    
    // Search in email
    const matchesEmail = user.email?.toLowerCase().includes(query);
    
    // Search in role
    const matchesRole = user.role?.toLowerCase().includes(query);
    
    // Search in department
    const departmentName = typeof user.department === 'string' 
      ? user.department 
      : user.department?.name || '';
    const matchesDepartment = departmentName.toLowerCase().includes(query);
    
    return matchesName || matchesUsername || matchesEmail || matchesRole || matchesDepartment;
  });

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
              <h2 className="text-3xl font-bold">User Management</h2>
              <p className="max-w-[600px] text-white/80">
                Manage users, roles, and access for your organization.
              </p>
            </div>
            <Button
              className="rounded-2xl bg-white text-blue-700 hover:bg-white/90"
              onClick={() => setCreateUserOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </motion.div>

        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">All users</h2>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, email, role, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b">
            <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
              <div className="col-span-4">User</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Created By</div>
              <div className="col-span-1">Joined</div>
            </div>
          </div>
          
          {/* User List */}
          <div className="divide-y divide-gray-100">
            {filteredUsers.length > 0 ? filteredUsers.map((user, idx) => (
              <div
                key={user.id || user.username || idx}
                className="px-6 py-4 hover:bg-gray-50/50 transition-colors duration-200"
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* User Info */}
                  <div className="col-span-4 flex items-center gap-3">
                    <Avatar className="h-11 w-11 ring-2 ring-gray-100">
                      <AvatarImage src={user.avatar || undefined} alt="User" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold text-sm">
                        {(user.name ?? user.email ?? "U")
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">
                        {user.name ?? user.email ?? "Unnamed"}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {typeof user.department === "string"
                          ? user.department
                          : user.department?.name ?? "No department"}
                      </p>
                    </div>
                  </div>
                  
                  {/* Email */}
                  <div className="col-span-3">
                    <p className="text-sm text-gray-700 truncate">{user.email}</p>
                  </div>
                  
                  {/* Role */}
                  <div className="col-span-2">
                    <Badge 
                      variant={user.role === 'admin' || user.role === 'superadmin' ? 'default' : 'secondary'}
                      className={user.role === 'superadmin'
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : user.role === 'admin' 
                        ? 'bg-blue-100 text-blue-800 border-blue-200' 
                        : 'bg-gray-100 text-gray-700 border-gray-200'
                      }
                    >
                      {user.role}
                    </Badge>
                  </div>
                  
                  {/* Created By */}
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 truncate">
                      {user.createdBy 
                        ? (typeof user.createdBy === 'string' 
                            ? user.createdBy 
                            : user.createdBy.name || user.createdBy.email || 'Unknown')
                        : 'System'}
                    </p>
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
                        {!(user.isSuperAdmin || user.role === 'superadmin') && (
                          <DropdownMenuItem onClick={() => handleEditUser(user)} className="cursor-pointer">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                        )}
                        {!(user.isSuperAdmin || user.role === 'superadmin') && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600 cursor-pointer focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        )}
                        {(user.isSuperAdmin || user.role === 'superadmin') && (
                          <DropdownMenuItem disabled className="text-gray-400 cursor-not-allowed">
                            <Edit className="mr-2 h-4 w-4" />
                            Protected User
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )) : (
              <div className="px-6 py-8 text-center text-gray-500">
                <Plus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                {searchQuery ? (
                  <>
                    <p className="text-lg font-medium">No users found</p>
                    <p className="text-sm">Try adjusting your search criteria.</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium">No users found</p>
                    <p className="text-sm">Add your first user to get started.</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <UserModal
        isOpen={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        newUser={newUser}
        setNewUser={setNewUser}
        departments={departments}
        onAddUser={handleAddUser}
      />

      {editingUser && (
        <UserModal
          isOpen={editUserOpen}
          onClose={() => {
            setEditUserOpen(false);
            setEditingUser(null);
          }}
          newUser={{
            username: editingUser.username ?? "",
            name: editingUser.name ?? "",
            email: editingUser.email ?? "",
            password: "",
            departmentId:
              typeof editingUser.department === "string"
                ? editingUser.department
                : editingUser.department?.id ?? "",
            role: (editingUser.role as "user" | "admin" | "superadmin") ?? "user",
          }}
          setNewUser={(updatedUser) => {
            setEditingUser({
              ...editingUser,
              ...updatedUser,
              role: ["user", "admin", "superadmin"].includes(updatedUser.role)
                ? (updatedUser.role as "user" | "admin" | "superadmin")
                : "user",
            });
          }}
          departments={departments}
          onAddUser={() => {
            if (editingUser) {
              handleUpdateUserLocal(editingUser);
            }
          }}
          isEdit={true}
          onResetPassword={handleResetPassword}
          editingUserId={editingUser.id}
          isAdmin={isAdmin}
        />
      )}

      <AlertDialog open={deleteUserOpen} onOpenChange={setDeleteUserOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              user <strong>{userToDelete?.name}</strong> from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
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
