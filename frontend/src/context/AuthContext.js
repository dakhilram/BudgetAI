import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await authService.getMe();
        setUser(response.data);
        // Check if PIN is set and needs verification
        if (response.data.pin) {
          setIsLocked(true);
        }
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await authService.login({ email, password });
    const { token, user: userData } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    if (userData.pin) {
      setIsLocked(true);
    }
    return userData;
  };

  const register = async (name, email, password) => {
    const response = await authService.register({ name, email, password });
    const { token, user: userData } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsLocked(false);
  };

  const updatePin = async (pin) => {
    await authService.updatePin(pin);
    setUser((prev) => ({ ...prev, pin }));
  };

  const verifyPin = async (pin) => {
    await authService.verifyPin(pin);
    setIsLocked(false);
  };

  const unlockApp = () => {
    setIsLocked(false);
  };

  const lockApp = () => {
    if (user?.pin) {
      setIsLocked(true);
    }
  };

  const upgradeToPro = () => {
    setUser((prev) => ({ ...prev, is_pro: true }));
  };

  const value = {
    user,
    loading,
    isLocked,
    login,
    register,
    logout,
    updatePin,
    verifyPin,
    unlockApp,
    lockApp,
    upgradeToPro,
    isAuthenticated: !!user,
    isPro: user?.is_pro || false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
