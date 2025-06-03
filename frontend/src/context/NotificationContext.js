import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

const NotificationContext = createContext();

/**
 * Bildirim sistemi hook'u
 * @returns {{
 *  showNotification: (message: string, severity?: 'error'|'warning'|'info'|'success') => void,
 *  showError: (message: string) => void,
 *  showSuccess: (message: string) => void,
 *  showWarning: (message: string) => void,
 *  showInfo: (message: string) => void
 * }}
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
    key: 0
  });

  // useCallback ile fonksiyonları memoize ediyoruz
  const showNotification = useCallback((message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity,
      key: Date.now() // Benzersiz key ile aynı mesajın üst üste gösterilmesini sağlar
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  // Özel bildirim türleri
  const showError = useCallback((message) => {
    showNotification(message, 'error');
  }, [showNotification]);

  const showSuccess = useCallback((message) => {
    showNotification(message, 'success');
  }, [showNotification]);

  const showWarning = useCallback((message) => {
    showNotification(message, 'warning');
  }, [showNotification]);

  const showInfo = useCallback((message) => {
    showNotification(message, 'info');
  }, [showNotification]);

  // Context değeri
  const contextValue = {
    showNotification,
    showError,
    showSuccess,
    showWarning,
    showInfo
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <Snackbar
        key={notification.key}
        open={notification.open}
        autoHideDuration={notification.severity === 'error' ? 10000 : 6000}
        onClose={hideNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          '& .MuiAlert-root': {
            width: '100%',
            maxWidth: '600px',
            whiteSpace: 'pre-line'
          },
          '& .MuiAlert-message': {
            color: notification.severity === 'success' ? 'white' : 'inherit',
            fontSize: '0.9rem',
            lineHeight: 1.4
          },
        }}
      >
        <Alert
          elevation={6}
          variant="filled"
          onClose={hideNotification}
          severity={notification.severity}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};