import React, { createContext, useContext, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

const NotificationContext = createContext();

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
    severity: 'info', // 'success', 'error', 'warning', 'info'
    autoHideDuration: 6000, // Varsayılan süre
  });

  const showNotification = (message, severity = 'info', duration = null) => {
    // Mesaj uzunluğuna göre otomatik süre ayarlama
    let autoHideDuration = duration;
    if (!duration) {
      if (message.length > 200) {
        autoHideDuration = 12000; // Uzun mesajlar için 12 saniye
      } else if (message.length > 100) {
        autoHideDuration = 8000; // Orta mesajlar için 8 saniye
      } else {
        autoHideDuration = 6000; // Kısa mesajlar için 6 saniye
      }
    }

    setNotification({
      open: true,
      message,
      severity,
      autoHideDuration,
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={notification.autoHideDuration}
        onClose={hideNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ 
          maxWidth: '500px',
          '& .MuiAlert-message': {
            whiteSpace: 'pre-line', // Multi-line mesajları destekle
            fontSize: '0.9rem',
            lineHeight: '1.4'
          }
        }}
      >
        <Alert 
          onClose={hideNotification} 
          severity={notification.severity}
          variant="filled"
          sx={{ 
            width: '100%',
            boxShadow: 3,
            '& .MuiAlert-icon': {
              alignSelf: 'flex-start',
              marginTop: '2px'
            },
            '& .MuiAlert-message': {
              padding: '8px 0',
              maxHeight: '300px',
              overflowY: 'auto'
            }
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}; 