import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('doc_qa_token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      if (token) {
        try {
          const me = await api.getMe();
          if (me) {
            setUser(me);
          } else {
            logout();
          }
        } catch {
          logout();
        }
      } else {
        // Automatically login with demo user for seamless zero-barrier experience
        try {
          const res = await api.demoLogin();
          setToken(res.access_token);
          localStorage.setItem('doc_qa_token', res.access_token);
          setUser(res.user);
        } catch (e) {
          console.warn('Demo login init failed:', e);
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    setToken(res.access_token);
    localStorage.setItem('doc_qa_token', res.access_token);
    setUser(res.user);
    return res.user;
  };

  const register = async (email, password, username = '') => {
    const res = await api.register(email, password, username);
    setToken(res.access_token);
    localStorage.setItem('doc_qa_token', res.access_token);
    setUser(res.user);
    return res.user;
  };

  const demoLogin = async () => {
    const res = await api.demoLogin();
    setToken(res.access_token);
    localStorage.setItem('doc_qa_token', res.access_token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('doc_qa_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        demoLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
