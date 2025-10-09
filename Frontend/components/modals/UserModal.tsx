"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Department, NewUser } from "@/lib/types";
import { useState } from "react";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  newUser: NewUser;
  setNewUser: (user: NewUser) => void;
  departments: Department[];
  onAddUser: () => void;
  isEdit?: boolean;
  onResetPassword?: (userId: string, newPassword: string) => void;
  editingUserId?: string;
  isAdmin?: boolean;
}

export function UserModal({
  isOpen,
  onClose,
  newUser,
  setNewUser,
  departments,
  onAddUser,
  isEdit = false,
  onResetPassword,
  editingUserId,
  isAdmin = false,
}: UserModalProps) {
  // Local state for reset password in edit mode
  const [resetPassword, setResetPassword] = useState("");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 relative">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-center text-black">
                {isEdit ? "Edit User" : "Add User"}
              </h2>
            </div>
            <form className="space-y-4 text-black">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Username
                </label>
                <Input
                  type="text"
                  placeholder="Enter username"
                  className="w-full text-black placeholder:text-gray-500"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  disabled={isEdit}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  type="text"
                  placeholder="Enter name"
                  className="w-full text-black placeholder:text-gray-500"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  placeholder="Enter email"
                  className="w-full text-black placeholder:text-gray-500"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                />
              </div>
              {!isEdit && (
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <Input
                    type="password"
                    placeholder="Enter password"
                    className="w-full text-black placeholder:text-gray-500"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Department
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all duration-150 text-base"
                    value={newUser.departmentId}
                    onChange={(e) =>
                      setNewUser({ ...newUser, departmentId: e.target.value })
                    }
                  >
                    <option value="" disabled>
                      Select department
                    </option>
                    {departments.map((dept) => (
                      <option
                        key={dept.id}
                        value={dept.id}
                        className="hover:bg-blue-50"
                      >
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <ChevronDown className="h-5 w-5" />
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all duration-150 text-base"
                    value={newUser.role || ""}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                  >
                    <option value="" disabled>
                      Select role
                    </option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <ChevronDown className="h-5 w-5" />
                  </span>
                </div>
              </div>
              
              {isEdit && isAdmin && onResetPassword && editingUserId && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-3 text-black">Reset Password</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1">New Password</label>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      className="w-full text-black placeholder:text-gray-500"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (resetPassword && editingUserId) {
                          onResetPassword(editingUserId, resetPassword);
                          setResetPassword("");
                        }
                      }}
                      disabled={!resetPassword}
                    >
                      Reset Password
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    setNewUser({
                      username: "",
                      name: "",
                      email: "",
                      password: "",
                      departmentId: "",
                      role: "",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="text-white"
                  onClick={(e) => {
                    e.preventDefault();
                    if (
                      newUser.username &&
                      newUser.name &&
                      newUser.email &&
                      (isEdit || newUser.password) &&
                      newUser.departmentId &&
                      newUser.role
                    ) {
                      onAddUser();
                    }
                  }}
                >
                  {isEdit ? "Update" : "Add"}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
