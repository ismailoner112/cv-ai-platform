import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { endpoints } from '../services/api'; // api servisini import et

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Çerezden token okuma fonksiyonu
const getCookieValue = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true); // Başlangıçta yükleniyor

  // Kullanıcının oturum durumunu kontrol et
  const checkAuthStatus = useCallback(async () => {
    try {
      // Önce çerezden token kontrolü yap
      const token = getCookieValue('token');
      
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await endpoints.auth.verify(); // Backend verify endpointini çağır
      if (response.data.isAuthenticated) {
        setIsAuthenticated(true);
        setUser(response.data.user); // Kullanıcı bilgilerini state'e kaydet
      } else {
        setIsAuthenticated(false);
        setUser(null);
        // Token geçersizse çerezi temizle
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      // Hata durumunda da çerezi temizle
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    } finally {
      setLoading(false);
    }
  }, []);

  // Bileşen mount olduğunda oturum durumunu kontrol et
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Giriş fonksiyonu
  const login = async (email, password) => {
    try {
      const response = await endpoints.auth.login({ email, password });
      if (response.data.success) {
        setIsAuthenticated(true);
        setUser(response.data.user); // Kullanıcı bilgilerini kaydet
        return { success: true, user: response.data.user };
      } else {
        setIsAuthenticated(false);
        setUser(null);
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('Login failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      return { success: false, message: error.response?.data?.message || 'Giriş başarısız oldu.' };
    }
  };

  // Çıkış fonksiyonu
  const logout = useCallback(async () => {
    try {
      await endpoints.auth.logout(); // Backend logout endpointini çağır
      // Çerezi temizle
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      // Hata olsa bile frontend state'ini ve çerezi temizle
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  const contextValue = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    checkAuthStatus, // Durumu manuel kontrol etmek için
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}; 