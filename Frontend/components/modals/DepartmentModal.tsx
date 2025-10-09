"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  newDeptName: string;
  setNewDeptName: (name: string) => void;
  onCreateDepartment: () => void;
  isEdit?: boolean;
}

export function DepartmentModal({
  isOpen,
  onClose,
  newDeptName,
  setNewDeptName,
  onCreateDepartment,
  isEdit = false,
}: DepartmentModalProps) {
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
                {isEdit ? "Edit Department" : "Create Department"}
              </h2>
            </div>
            <form className="space-y-4 text-black">
              <div>
                <label className="block text-sm font-medium mb-1">Department Name</label>
                <Input
                  type="text"
                  placeholder="Enter department name"
                  className="w-full text-black placeholder:text-gray-500"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    onClose();
                    setNewDeptName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="text-white"
                  onClick={(e) => {
                    e.preventDefault();
                    if (newDeptName.trim()) {
                      onCreateDepartment();
                    }
                  }}
                >
                  {isEdit ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
