"use client";

import { RealTimeTaskDashboard } from "@/components/dashboard/RealTimeTaskDashboard";
import { useEffect, useState } from "react";
import { getAuthHeaders, requireAuth } from "@/lib/auth";
import { Department, User } from "@/lib/types";
import { getApiBaseUrl } from "@/lib/api";

export default function AdminTasksPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch departments
      const deptRes = await fetch(`${getApiBaseUrl()}/api/departments`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      
      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(Array.isArray(deptData.departments) ? deptData.departments : []);
      }

      // Fetch users
      const userRes = await fetch(`${getApiBaseUrl()}/api/users`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsers(Array.isArray(userData.users) ? userData.users : []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <RealTimeTaskDashboard departments={departments} users={users} />
    </main>
  );
}
