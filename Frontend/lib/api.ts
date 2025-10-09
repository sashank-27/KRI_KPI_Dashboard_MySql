// Returns the API base URL depending on the environment (localhost or network)
export function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    // If running on localhost, use localhost backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    // Otherwise, use the network backend URL from env or fallback to current host
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    // Fallback: use the same host as frontend but port 5000
    return `${window.location.protocol}//${hostname}:5000`;
  }
  // SSR fallback
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
}

// API client with axios-like interface
export const api = {
  get: async (url: string) => {
    try {
      const token = localStorage.getItem('token');
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
        const error: any = new Error(errorData.message || `HTTP ${response.status}`);
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
      const token = localStorage.getItem('token');
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
        const error: any = new Error(errorData.message || `HTTP ${response.status}`);
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
      const token = localStorage.getItem('token');
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
        const error: any = new Error(errorData.message || `HTTP ${response.status}`);
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
      const token = localStorage.getItem('token');
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
        const error: any = new Error(errorData.message || `HTTP ${response.status}`);
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
};
