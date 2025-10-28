import { getAuthToken } from '@/lib/auth';

// Returns the API base URL depending on the environment (localhost or network)
export function getApiBaseUrl() {
  // SSR safety check
  if (typeof window === 'undefined') {
    // SSR fallback - use environment variable or default to localhost
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  }
  
  const { hostname, protocol } = window.location;
  
  // If environment variable is set to a specific value (not 'auto'), use it
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL !== 'auto') {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // If running on localhost or 127.0.0.1, use localhost backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  
  // For network access, auto-detect and use the same IP with port 5000
  // This handles cases where frontend is accessed via network IP
  return `${protocol}//${hostname}:5000`;
}

// Function to test if backend is reachable at a given URL
export async function testBackendConnection(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/api/server-status`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Enhanced function to auto-detect the best backend URL
export async function detectBestBackendUrl(): Promise<string> {
  const candidates = [];
  
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    
    // Add environment URL if set
    if (process.env.NEXT_PUBLIC_API_URL) {
      candidates.push(process.env.NEXT_PUBLIC_API_URL);
    }
    
    // Add localhost URLs
    candidates.push('http://localhost:5000', 'http://127.0.0.1:5000');
    
    // Add network IP URL (same as frontend)
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      candidates.push(`${protocol}//${hostname}:5000`);
    }
  } else {
    // SSR - only try environment or localhost
    candidates.push(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
  }
  
  // Test each candidate URL
  for (const url of candidates) {
    if (await testBackendConnection(url)) {
      return url;
    }
  }
  
  // Fallback to default
  console.warn('⚠️ No backend detected, using default URL');
  return getApiBaseUrl();
}

// API client with axios-like interface
export const api = {
  get: async (url: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${getApiBaseUrl()}${url}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        const error: any = new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
        error.response = { data: errorData, status: response.status };
        throw error;
      }
      return response.json().then(data => ({ data }));
    } catch (error: any) {
      // Handle network errors or other fetch failures
      if (!error.response) {
        const networkError: any = new Error(error.message || 'Network error. Please check your connection and ensure the backend server is running.');
        networkError.response = { 
          data: { message: networkError.message },
          status: 0
        };
        throw networkError;
      }
      throw error;
    }
  },

  post: async (url: string, data?: any) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${getApiBaseUrl()}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        const error: any = new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
        error.response = { data: errorData, status: response.status };
        throw error;
      }
      return response.json().then(data => ({ data }));
    } catch (error: any) {
      if (!error.response) {
        const networkError: any = new Error(error.message || 'Network error');
        networkError.response = { 
          data: { message: networkError.message },
          status: 0
        };
        throw networkError;
      }
      throw error;
    }
  },

  put: async (url: string, data?: any) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${getApiBaseUrl()}${url}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        const error: any = new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
        error.response = { data: errorData, status: response.status };
        throw error;
      }
      return response.json().then(data => ({ data }));
    } catch (error: any) {
      if (!error.response) {
        const networkError: any = new Error(error.message || 'Network error');
        networkError.response = { 
          data: { message: networkError.message },
          status: 0
        };
        throw networkError;
      }
      throw error;
    }
  },

  delete: async (url: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${getApiBaseUrl()}${url}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        const error: any = new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
        error.response = { data: errorData, status: response.status };
        throw error;
      }
      return response.json().then(data => ({ data }));
    } catch (error: any) {
      if (!error.response) {
        const networkError: any = new Error(error.message || 'Network error');
        networkError.response = { 
          data: { message: networkError.message },
          status: 0
        };
        throw networkError;
      }
      throw error;
    }
  },

  // Change password API function
  changePassword: async (currentPassword: string, newPassword: string) => {
    return api.put('/api/me/change-password', {
      currentPassword,
      newPassword
    });
  },
};
