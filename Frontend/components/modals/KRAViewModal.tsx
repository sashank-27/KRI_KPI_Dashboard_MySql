"use client";

import { Target, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { KRA } from "@/lib/types";

interface KRAViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  kra: KRA | null;
  onEdit: () => void;
}

export function KRAViewModal({
  isOpen,
  onClose,
  kra,
  onEdit,
}: KRAViewModalProps) {
  if (!kra) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Target className="h-5 w-5 text-purple-600" />
            View KRA Details
          </DialogTitle>
          <DialogDescription>
            Complete details of the Key Result Area
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Responsibility Areas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-700">Responsibility Areas</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border">
              {Array.isArray(kra.responsibilityAreas) && kra.responsibilityAreas.length > 0 ? (
                <ul className="space-y-2">
                  {kra.responsibilityAreas.map((area, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-purple-600 mt-1">•</span>
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No responsibility areas defined</p>
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
              Close
            </Button>
            <Button
              type="button"
              onClick={onEdit}
              className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit KRA
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
