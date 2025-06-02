// src/services/api.js
import axios from 'axios';

// API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Axios instance oluşturma
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// CSRF token yenileme işlemi için flag
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Yeni token alındığında
    if (response.headers['x-new-token']) {
      localStorage.setItem('token', response.headers['x-new-token']);
    }
    
    // Yeni CSRF token alındığında
    if (response.headers['x-csrf-token']) {
      localStorage.setItem('csrfToken', response.headers['x-csrf-token']);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Eğer orijinal istek zaten retry edilmişse hatayı tekrar fırlat
    if (originalRequest._retry) {
        return Promise.reject(error);
    }

    // CSRF token hatası ve daha önce yenileme yapılmamışsa
    if (error.response?.status === 403 &&
        error.response?.data?.error === 'Geçersiz CSRF' &&
        !isRefreshing) {
      
      // Check if the original request was already for the CSRF token endpoint itself
      if (originalRequest.url === '/api/auth/csrf-token') {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Fetch new CSRF token from the correct endpoint
        const response = await api.get('/api/auth/csrf-token');
        const newToken = response.data.csrfToken;
        localStorage.setItem('csrfToken', newToken);
        
        // Tüm bekleyen istekleri işle
        processQueue(null, newToken);
        
        // Orijinal isteği yeni token ile tekrar dene
        originalRequest.headers['X-CSRF-Token'] = newToken;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 401 Unauthorized hatası durumunda
    if (error.response?.status === 401) {
      // Eğer 401 hatası login endpointinden geliyorsa, token yenilemeye çalışma
      if (originalRequest.url.endsWith('/api/auth/login')) {
        // Login hatası doğrudan ele alınmalı, interceptor token yenilememeli
        return Promise.reject(error); // Hatayı doğrudan catch bloğuna ilet
      }

      // Eğer 401 hatası login dışındaki bir yerden geliyorsa (JWT süresi dolmuş olabilir)
      // Token'ı yenilemeyi dene
      if (!isRefreshing) {
        isRefreshing = true;
        originalRequest._retry = true; // Retry flag'ini set et

        // Bekleyen istekleri kuyruğa ekle
        failedQueue.push(new Promise((resolve, reject) => {
          originalRequest._interceptorResolve = resolve;
          originalRequest._interceptorReject = reject;
        }));

        try {
          const response = await api.post('/api/auth/refresh');
          const newToken = response.data.token;
          localStorage.setItem('token', newToken);

          // Kuyruktaki tüm isteklere yeni token ile devam et
          processQueue(null, newToken);

          // Orijinal isteği yeni token ile tekrar dene
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Token yenileme başarısız olursa kuyruktaki tüm istekleri reddet
          processQueue(refreshError, null);
          // Kullanıcıyı çıkış yaptır
          localStorage.removeItem('token');
          localStorage.removeItem('csrfToken');
          // Frontend yönlendirmesini burada yapma, hata catch bloğuna gitsin
          // window.location.href = '/auth';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // Zaten bir token yenileme isteği sürüyorsa, bu isteği kuyruğa ekle
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
      }
    }

    return Promise.reject(error);
  }
);

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // JWT token ekleme
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // CSRF token ekleme
    const csrfToken = localStorage.getItem('csrfToken');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Auth endpoints
  auth: {
    login: async (credentials, config) => {
      try {
        const response = await api.post('/api/auth/login', credentials, config);
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
        if (response.data.csrfToken) {
          localStorage.setItem('csrfToken', response.data.csrfToken);
        }
        return response;
      } catch (error) {
        throw error;
      }
    },

    register: async (userData) => {
      try {
        const response = await api.post('/api/auth/register', userData);
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
        if (response.data.csrfToken) {
          localStorage.setItem('csrfToken', response.data.csrfToken);
        }
        return response;
      } catch (error) {
        throw error;
      }
    },

    logout: async () => {
      try {
        const response = await api.post('/api/auth/logout');
        localStorage.removeItem('token');
        localStorage.removeItem('csrfToken');
        return response;
      } catch (error) {
        throw error;
      }
    },

    verify: async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return { data: { isAuthenticated: false } };
        }

        const response = await api.get('/api/auth/verify');
        return {
          data: {
            isAuthenticated: response.data.success,
            user: response.data.user
          }
        };
      } catch (error) {
        console.error('Auth verification error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('csrfToken');
        return { data: { isAuthenticated: false } };
      }
    },

    // Function to fetch CSRF token
    getCsrfToken: async () => {
      try {
        const response = await api.get('/api/auth/csrf-token');
        // Optionally save to localStorage here as well, although interceptor should handle it
        if (response.data.csrfToken) {
          localStorage.setItem('csrfToken', response.data.csrfToken);
        }
        return response;
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
        throw error;
      }
    },
  },

  // Analysis endpoints
  analysis: {
    analyze: formData => api.post('/api/analysis', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    getHistory: () => api.get('/api/analysis/history'),
    getDetails: id => api.get(`/api/analysis/${id}`),
    deleteAnalysis: id => api.delete(`/api/analysis/${id}`)
  },

  // Chat endpoints
  chat: {
    // Sohbet mesajı gönderme
    sendMessage: (message) => api.post('/api/chat', { message }),
    // Sohbet geçmişini getirme
    getHistory: () => api.get('/api/chat/history'),
    // Yeni sohbet başlatma
    startNewChat: () => api.post('/api/chat/new'),
  },

  // Announcements endpoints
  announcements: {
    getAll:       filters => api.get('/api/announcements', { params: filters }),
    toggleFavorite: id => api.post(`/api/announcements/${id}/favorite`),
    scrape:       (source, keyword) => api.post('/api/jobs/scrape', { source, keyword }),
  },

  // Gallery endpoints
  gallery: {
    // Tüm şablonları listele (Public) - Arama ve sıralama eklendi
    list: async (params = {}) => { // Accept params object
      try {
        // Construct the query string from params
        const queryString = Object.keys(params)
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
          .join('&');
      
        const url = `/api/gallery${queryString ? `?${queryString}` : ''}`; // Add query string if exists

        const response = await api.get(url);
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Yeni şablon yükle (Admin)
    upload: (formData) => api.post('/api/gallery', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    // Şablon detayını getir
    getDetails: (slug) => api.get(`/api/gallery/${slug}`),
    // Şablon sil (Admin)
    delete: (id) => api.delete(`/api/gallery/${id}`),
  },

  // Visitors endpoints
  visitors: {
    // Ziyaretçi istatistiklerini getir
    getStats: () => api.get('/api/visitors/stats'),
  },

  // Users endpoints
  users: {
    // Tüm kullanıcıları listele (Admin)
    list: () => api.get('/api/users'),
    // Kullanıcı detayını getir (Admin)
    getDetails: (id) => api.get(`/api/users/${id}`),
    // Kullanıcıyı güncelle (Admin)
    update: (id, userData) => api.put(`/api/users/${id}`, userData),
    // Kullanıcıyı sil (Admin)
    delete: (id) => api.delete(`/api/users/${id}`),
    // Favorileri getir
    getFavorites: () => api.get('/api/users/favorites'),
    // Favori ekle/sil
    toggleFavorite: (id) => api.post(`/api/users/favorites/${id}`),
    // Favoriden çıkar
    removeFavorite: (id) => api.delete(`/api/users/favorites/${id}`),
  },

  // Jobs endpoints (Yeni eklendi)
  jobs: {
    // İş ilanlarını çek (Admin yetkisi gerekli)
    scrape: (keyword = '') => api.post('/api/jobs/scrape', { keyword }),
  },
};

// Export the API instance and endpoints
export const { auth, analysis, chat, announcements, gallery, visitors, users, jobs } = endpoints;
export default api;
