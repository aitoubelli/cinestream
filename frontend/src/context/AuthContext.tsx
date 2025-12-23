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

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/profile`, {
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        setUserRole(data.role);
        setUser({ email: data.email }); // Simplified user object
      } else {
        setProfileData(null);
        setUserRole(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setProfileData(null);
      setUserRole(null);
      setUser(null);
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
        credentials: 'include',
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
        credentials: 'include', // Include cookies
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
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
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      setUserRole(null);
      setProfileData(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
