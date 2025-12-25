"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface ProfileData {
  uid: string;
  email: string;
  username: string;
  name: string;
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
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      setToken(storedToken);
      const decoded = decodeToken(storedToken);
      if (decoded) {
        setUser({ email: decoded.email });
        setUserRole(decoded.role);
        setProfileData({
          uid: decoded.id,
          email: decoded.email,
          username: '',
          name: '',
          avatar: 0,
          role: decoded.role
        });
      }
    }
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/profile`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        setUserRole(data.role);
        setUser({ email: data.email }); // Simplified user object
      } else {
        setProfileData(null);
        // Don't clear user and token on profile fetch failure, as user is set from token
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
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setToken(accessToken);

      const decoded = decodeToken(accessToken);
      if (decoded) {
        setUser({ email: decoded.email });
        setUserRole(decoded.role);
        setProfileData({
          uid: decoded.id,
          email: decoded.email,
          username: '',
          name: '',
          avatar: 0,
          role: decoded.role
        });
      }

      console.log('Login successful, checking auth status');
      await checkAuthStatus(); // Refresh user data
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
          uid: decoded.id,
          email: decoded.email,
          username: '',
          name: '',
          avatar: 0,
          role: decoded.role
        });
      }

      await checkAuthStatus(); // Refresh user data
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
    return token;
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
