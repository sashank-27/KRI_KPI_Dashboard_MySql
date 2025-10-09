// Utility function to get JWT token from cookies
export function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(cookie => 
    cookie.trim().startsWith('jwtToken=')
  );
  
  if (tokenCookie) {
    const token = tokenCookie.split('=')[1];
    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime) {
        console.log('Token has expired, clearing cookie');
        document.cookie = 'jwtToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        return null;
      }
      return token;
    } catch (err) {
      console.log('Invalid token format, clearing cookie');
      document.cookie = 'jwtToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      return null;
    }
  }
  
  return null;
}

// Utility function to get auth headers
export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// Utility function to get current user from JWT token
export function getCurrentUser(): { id: string; email: string; role: string } | null {
  const token = getAuthToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role
    };
  } catch (err) {
    console.error('Error parsing JWT token:', err);
    return null;
  }
}

// Utility function to check if user is authenticated
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

// Utility function to logout user
export function logout(): void {
  // Clear the JWT token cookie
  document.cookie = 'jwtToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  
  // Redirect to login page
  window.location.href = '/login';
}

// Utility function to redirect to login if not authenticated
export function requireAuth(): void {
  if (!isAuthenticated()) {
    window.location.href = '/login';
  }
}

// Utility function to check if user is admin or superadmin
export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user ? (user.role === 'admin' || user.role === 'superadmin') : false;
}

// Utility function to check if user is superadmin
export function isSuperAdmin(): boolean {
  const user = getCurrentUser();
  return user ? user.role === 'superadmin' : false;
}