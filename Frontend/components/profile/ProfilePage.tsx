"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  User,
  Users,
  Mail,
  Building,
  Calendar,
  Edit3,
  Save,
  X,
  Camera,
  Shield,
  Bell,
  Globe,
  Lock,
  Activity,
  Award,
  TrendingUp,
  Clock,
  CheckCircle,
  Star,
  Target,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfilePageProps {
  currentUser: {
    username: string;
    name: string;
    email: string;
    department: string;
    role: string;
    joined: string;
    avatar?: string;
    bio?: string;
    phone?: string;
    location?: string;
    createdBy?: string | { id: string; name: string; email: string };
  };
  onUpdateProfile: (updatedUser: any) => Promise<void>;
}

export function ProfilePage({
  currentUser,
  onUpdateProfile,
}: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(currentUser);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: true,
    weekly: true,
  });
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const { toast } = useToast();

  // Sync editedUser with currentUser when currentUser changes
  useEffect(() => {
    setEditedUser(currentUser);
  }, [currentUser]);

  const handleSave = async () => {
    try {
      // Only save bio and avatar fields
      const updateData = {
        bio: editedUser.bio,
        avatar: editedUser.avatar
      };
      await onUpdateProfile(updateData);
      setIsEditing(false);
      setPreviewImage(null);
    } catch (err) {
      console.error("Failed to update profile", err);
    }
  };

  const handleCancel = () => {
    // Only reset editable fields (bio and avatar) to current user values
    setEditedUser({
      ...editedUser,
      bio: currentUser.bio,
      avatar: currentUser.avatar
    });
    setIsEditing(false);
    setPreviewImage(null);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setIsUploadingImage(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Convert to base64 for now (in production, you'd upload to a file storage service)
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Update the edited user with the new image
      setEditedUser({
        ...editedUser,
        avatar: base64,
      });

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const event = {
          target: { files: [file] }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleImageUpload(event);
      }
    }
  };

  // Mock data for activities and achievements
  const activities = [
    {
      id: 1,
      action: "Completed project review",
      time: "2 hours ago",
      type: "success",
    },
    {
      id: 2,
      action: "Updated department settings",
      time: "1 day ago",
      type: "info",
    },
    {
      id: 3,
      action: "Added new team member",
      time: "3 days ago",
      type: "success",
    },
    {
      id: 4,
      action: "Generated monthly report",
      time: "1 week ago",
      type: "info",
    },
  ];

  const achievements = [
    {
      id: 1,
      title: "Team Leader",
      description: "Led 5+ successful projects",
      icon: Award,
      color: "text-yellow-500",
    },
    {
      id: 2,
      title: "Collaborator",
      description: "Worked with 10+ departments",
      icon: Users,
      color: "text-blue-500",
    },
    {
      id: 3,
      title: "Innovator",
      description: "Implemented 3 new processes",
      icon: Star,
      color: "text-purple-500",
    },
  ];

  const stats = [
    { label: "Projects Completed", value: 12, total: 15, color: "bg-blue-500" },
    { label: "Team Members", value: 8, total: 10, color: "bg-green-500" },
    { label: "Goals Achieved", value: 7, total: 10, color: "bg-purple-500" },
    { label: "Hours Logged", value: 240, total: 300, color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-white/20">
                <AvatarImage
                  src={previewImage ?? editedUser.avatar ?? currentUser.avatar ?? undefined}
                  alt={currentUser.name}
                />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold">
                  {(currentUser.name || "User")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <Button
                  size="icon"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-white text-gray-700 hover:bg-gray-100"
                  onClick={handleCameraClick}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <Skeleton className="w-4 h-4 rounded-full" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{currentUser.name || "User"}</h1>
              <p className="text-white/80 text-lg">
                {currentUser.role || "Member"} • {currentUser.department || "Unknown Department"}
              </p>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-white/20 text-white border-white/30"
                >
                  {currentUser.role || "Member"}
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-white/20 text-white border-white/30"
                >
                  Member since {formatDate(currentUser.joined || "")}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {!isEditing ? (
              <Button
                className="rounded-2xl bg-white text-purple-700 hover:bg-white/90"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  className="rounded-2xl bg-white text-green-700 hover:bg-white/90"
                  onClick={handleSave}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button
                  className="rounded-2xl bg-white text-green-700 hover:bg-white/90"
                  onClick={handleCancel}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Overview Content (was inside TabsContent) */}
      <div className="space-y-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Your personal and professional details. Only bio and profile picture can be edited.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Profile Picture Upload Section - Only show in edit mode */}
                {isEditing && (
                  <div className="space-y-4">
                    <Label>Profile Picture</Label>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div 
                        className="relative cursor-pointer"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={handleCameraClick}
                      >
                        <Avatar className="h-16 w-16 border-2 border-dashed border-gray-300 hover:border-primary transition-colors">
                          <AvatarImage
                            src={previewImage ?? editedUser.avatar ?? currentUser.avatar ?? undefined}
                            alt={currentUser.name}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold">
                            {(currentUser.name || "User")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        {isUploadingImage && (
                          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                            <Skeleton className="w-4 h-4 rounded-full" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 rounded-full transition-colors flex items-center justify-center">
                          <Camera className="h-4 w-4 text-white opacity-0 hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCameraClick}
                            disabled={isUploadingImage}
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            {isUploadingImage ? "Uploading..." : "Change Photo"}
                          </Button>

                          {/* Cancel preview (revert to existing avatar) */}
                          {previewImage && (
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-2xl bg-white text-green-700 hover:bg-white/90"
                              onClick={() => {
                                setPreviewImage(null);
                                setEditedUser({ ...editedUser, avatar: currentUser.avatar });
                              }}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          )}

                          {/* Remove existing avatar - user must Save to persist */}
                          {(editedUser.avatar || currentUser.avatar || previewImage) && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-red-500 text-red-500 hover:bg-red-50"
                                onClick={() => setRemoveDialogOpen(true)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Remove Photo
                              </Button>

                              <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove profile photo?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently remove your profile photo. You can upload a new one later.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={async () => {
                                                const previousAvatar = previewImage ?? editedUser.avatar ?? currentUser.avatar ?? undefined;
                                                try {
                                                  const res = await api.put('/me', { avatar: null });
                                                  const updated = res.data;
                                                  setPreviewImage(null);
                                                  setEditedUser({ ...editedUser, avatar: undefined });
                                                  try { await onUpdateProfile(updated); } catch {}
                                                  toast({
                                                    title: 'Profile photo removed',
                                                    action: previousAvatar ? (
                                                      <ToastAction altText="Undo remove" onClick={async () => {
                                                        try {
                                                          const restoreRes = await api.put('/me', { avatar: previousAvatar });
                                                          const restored = restoreRes.data;
                                                          setEditedUser({ ...editedUser, avatar: previousAvatar });
                                                          try { await onUpdateProfile(restored); } catch {}
                                                          toast({ title: 'Profile photo restored' });
                                                        } catch (err) {
                                                          console.error('Failed to restore photo', err);
                                                          toast({ title: 'Failed to restore photo' });
                                                        }
                                                      }}>
                                                        Undo
                                                      </ToastAction>
                                                    ) : undefined,
                                                  });
                                                } catch (err: any) {
                                                  console.error('Failed to remove photo', err);
                                                  toast({ title: err?.response?.data?.message || 'Failed to remove photo' });
                                                } finally {
                                                  setRemoveDialogOpen(false);
                                                }
                                              }}>Remove</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG or GIF. Max size 5MB. Click avatar or drag & drop to upload.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <p className="text-sm font-medium">{currentUser.name || "No name set"}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <p className="text-sm font-medium">{currentUser.email}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <p className="text-sm font-medium">
                    {currentUser.department}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <p className="text-sm font-medium">{currentUser.role}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  {isEditing ? (
                    <Textarea
                      id="bio"
                      value={editedUser.bio || ""}
                      onChange={(e) =>
                        setEditedUser({ ...editedUser, bio: e.target.value })
                      }
                      placeholder="Tell us about yourself..."
                      className="rounded-xl"
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {currentUser.bio || "No bio available"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
          {/* Quick Info */}
        </div>
      </div>
    </div>
  );
}
