/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // 1. Initialize state directly from sessionStorage so it survives reloads
  const [user, setUser] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem('av_user_session');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // 2. Sync state changes to sessionStorage automatically
  useEffect(() => {
    if (user) {
      sessionStorage.setItem('av_user_session', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('av_user_session');
    }
    setIsAuthLoading(false);
  }, [user]);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);