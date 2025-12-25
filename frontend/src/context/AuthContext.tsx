"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface ProfileData {
  userId: string;
  email: string;
  username: string;
  fullName: string;
  avatar: number;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: any | null;
  userRole: 'user' | 'admin' | null;
  profileData: ProfileData | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserRole: () => Promise<void>;
  refreshProfileData: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const decodeToken = (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  };

  // Check if user is logged in on mount
  useEffect(() => {
    console.log('Debug: NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
    const storedToken = localStorage.getItem('accessToken');
    console.log('Debug: Stored token exists:', !!storedToken);
    if (storedToken) {
      setToken(storedToken);
      const decoded = decodeToken(storedToken);
      if (decoded) {
        setUser({ email: decoded.email });
        setUserRole(decoded.role);
        setProfileData({
          userId: decoded.id,
          email: decoded.email,
          username: '',
          fullName: '',
          avatar: 0,
          role: decoded.role
        });
      }
      // Pass the token directly to checkAuthStatus since state update is async
      checkAuthStatus(storedToken);
    } else {
      checkAuthStatus(null);
    }
  }, []);

  const checkAuthStatus = async (overrideToken?: string | null) => {
    const currentToken = overrideToken !== undefined ? overrideToken : localStorage.getItem('accessToken');
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
        console.log('Debug: Sending Authorization header:', headers['Authorization']);
      } else {
        console.log('Debug: No token available for profile fetch');
      }
      console.log('Debug: Fetching profile from:', `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/profile`);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/profile`, {
        headers,
      });
      console.log('Debug: Profile fetch response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Debug: Setting profileData to:', data);
        setProfileData(data);
        setUserRole(data.role);
        setUser({ email: data.email }); // Simplified user object
      } else {
        if (response.status === 401) {
          // Token is invalid, clear it
          setToken(null);
          setUser(null);
          setUserRole(null);
          setProfileData(null);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        } else {
          setProfileData(null);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setProfileData(null);
      setUserRole(null);
      setUser(null);
      setToken(null);
      localStorage.removeItem('accessToken');
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    console.log('Starting loginWithEmail');
    try {
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`;
      console.log('Fetching login endpoint:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      console.log('Fetch completed, response status:', response.status, 'ok:', response.ok);
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Login failed, response body:', errorText);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Login failed, response body:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText };
        }
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      const { accessToken, refreshToken } = data;
      console.log('Login successful, setting tokens');
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      console.log('Tokens set in localStorage');
      setToken(accessToken);

      const decoded = decodeToken(accessToken);
      if (decoded) {
        setUser({ email: decoded.email });
        setUserRole(decoded.role);
        setProfileData({
          userId: decoded.id,
          email: decoded.email,
          username: '',
          fullName: '',
          avatar: 0,
          role: decoded.role
        });
      }

      console.log('Login successful, checking auth status');
      await checkAuthStatus(accessToken); // Refresh user data
      console.log('Auth status checked');
    } catch (error) {
      console.error("Error signing in with email:", error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, password: string, name?: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();
      const { accessToken, refreshToken } = data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setToken(accessToken);

      const decoded = decodeToken(accessToken);
      if (decoded) {
        setUser({ email: decoded.email });
        setUserRole(decoded.role);
        setProfileData({
          userId: decoded.id,
          email: decoded.email,
          username: '',
          fullName: '',
          avatar: 0,
          role: decoded.role
        });
      }

      await checkAuthStatus(accessToken); // Refresh user data
    } catch (error) {
      console.error("Error registering with email:", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    // For now, just log - password reset not implemented in auth-service
    console.log('Password reset not implemented yet');
  };

  const refreshProfileData = useCallback(async () => {
    await checkAuthStatus();
  }, []);

  const refreshUserRole = async () => {
    return refreshProfileData();
  };

  const logout = async () => {
    try {
      // Optionally call logout endpoint, but since tokens are client-managed, just clear local
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setToken(null);
      setUser(null);
      setUserRole(null);
      setProfileData(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    return localStorage.getItem('accessToken');
  };

  const value = {
    user,
    userRole,
    profileData,
    loading,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    logout,
    refreshUserRole,
    refreshProfileData,
    getIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
