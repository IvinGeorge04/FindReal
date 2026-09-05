import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Verify authentication status with backend via HttpOnly cookie
  // (Zero tokens are stored in localStorage or browser memory)
  const verifySession = useCallback(async () => {
    try {
      setLoading(true);
      // Try /api/v1/auth/me or fallback to /api/auth/me
      const response = await api.get('/v1/auth/me');
      const currentUser = response.data?.data?.user || response.data?.user || null;
      setUser(currentUser);
      setAuthError('');
    } catch (err) {
      setUser(null);
      // 401 is expected when user is unauthenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  /**
   * Login User
   * Dispatches credentials to backend; session cookie set automatically by browser
   */
  const login = async (email, password) => {
    try {
      setAuthError('');
      const response = await api.post('/v1/auth/login', { email, password });
      const authenticatedUser = response.data?.data?.user || response.data?.user;
      setUser(authenticatedUser);
      return { success: true, user: authenticatedUser };
    } catch (err) {
      const message = err.response?.data?.error?.message || err.message || 'Login failed';
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  /**
   * Register User
   */
  const register = async (name, email, password) => {
    try {
      setAuthError('');
      const response = await api.post('/v1/auth/register', { name, email, password });
      const newUser = response.data?.data?.user || response.data?.user;
      setUser(newUser);
      return { success: true, user: newUser };
    } catch (err) {
      const message = err.response?.data?.error?.message || err.message || 'Registration failed';
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  /**
   * Logout User
   * Clears HttpOnly cookie on backend and wipes client auth state
   */
  const logout = async () => {
    try {
      await api.post('/v1/auth/logout');
    } catch (err) {
      // Clean up client state regardless of network response
    } finally {
      setUser(null);
      setAuthError('');
    }
  };

  const value = {
    user,
    loading,
    authError,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    verifySession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
