// src/hooks/useCsrf.js
import { useState, useEffect } from 'react';
import api from '../services/api';

export function useCsrf() {
  const [token, setToken] = useState(localStorage.getItem('csrfToken'));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!token);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/auth/csrf-token');
        const newToken = response.data.csrfToken;
        localStorage.setItem('csrfToken', newToken);
        setToken(newToken);
        setError(null);
      } catch (err) {
        console.error('CSRF token alınamadı:', err);
        setError('CSRF token alınamadı. Lütfen sayfayı yenileyin.');
      } finally {
        setLoading(false);
      }
    };

    if (!token) {
      fetchToken();
    }
  }, [token]);

  return { token, error, loading };
}
