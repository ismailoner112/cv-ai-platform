// src/services/api.js
import axios from 'axios';

// API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Çerezden token okuma fonksiyonu
const getCookieValue = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

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
    // Yeni token alındığında (backend çerez olarak set eder)
    // Frontend'de özel bir işlem yapmaya gerek yok
    
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
          // Token backend tarafından çerez olarak set edilir, frontend'de özel işlem gerekmez
          
          // Kuyruktaki tüm isteklere devam et
          processQueue(null, null);

          // Orijinal isteği tekrar dene (çerezden token otomatik alınacak)
          return api(originalRequest);
        } catch (refreshError) {
          // Token yenileme başarısız olursa kuyruktaki tüm istekleri reddet
          processQueue(refreshError, null);
          // Çerezi temizle
          document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          localStorage.removeItem('csrfToken');
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
    // JWT token çerezden otomatik olarak gönderilir (withCredentials: true sayesinde)
    // Ek bir işlem gerekmez
    
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
        // Token backend tarafından çerez olarak set edilir
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
        // Token backend tarafından çerez olarak set edilir
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
        // Backend çerezi temizler
        localStorage.removeItem('csrfToken');
        return response;
      } catch (error) {
        throw error;
      }
    },

    verify: async () => {
      try {
        // Çerezden token otomatik olarak gönderilir, frontend kontrolüne gerek yok
        const response = await api.get('/api/auth/verify');
        return {
          data: {
            isAuthenticated: response.data.success,
            user: response.data.user
          }
        };
      } catch (error) {
        console.error('Auth verification error:', error);
        // Sadece CSRF token'ı temizle
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

  // Analysis endpoints - GEMİNİ API kullanarak
  analysis: {
    // Gemini API ile CV ve şirket analizi
    analyze: async (formData) => {
      try {
        const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || "AIzaSyD2vsbO55zUlo0LRyJdqmcRVXTBjkAEXQ4";
        const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
        
        // FormData'dan değerleri al
        const companyUrl = formData.get('companyUrl');
        const cvFile = formData.get('cvFile');
        
        if (!companyUrl && !cvFile) {
          throw new Error('Analiz yapmak için en az bir CV dosyası veya şirket URL\'si gerekli.');
        }

        let analysisPrompt = "Sen bir CV ve şirket analizi uzmanısın. ";
        let parts = [];

        // URL analizi
        if (companyUrl) {
          try {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(companyUrl)}`;
            const urlResponse = await fetch(proxyUrl);
            const data = await urlResponse.json();
            const htmlContent = data.contents;
            
            // HTML içeriğini temizle (basit metin çıkarma)
            const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            const limitedContent = textContent.substring(0, 5000); // İçeriği sınırla
            
            analysisPrompt += `\n\nŞirket Web Sitesi Analizi (${companyUrl}):\n${limitedContent}`;
          } catch (error) {
            console.error('URL fetch error:', error);
            analysisPrompt += `\n\nŞirket URL'si: ${companyUrl} (İçerik alınamadı - CORS hatası)`;
          }
        }

        // PDF dosyası analizi
        if (cvFile && cvFile instanceof File) {
          try {
            // PDF'i base64'e çevir
            const fileBuffer = await cvFile.arrayBuffer();
            const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
            
            // Gemini PDF desteği için inline_data kullan
            parts.push({
              inline_data: {
                mime_type: cvFile.type,
                data: base64Data
              }
            });
            
            analysisPrompt += "\n\nCV Dosyası (PDF) analizi yapılacak.";
          } catch (error) {
            console.error('PDF processing error:', error);
            analysisPrompt += "\n\nCV dosyası işlenemedi.";
          }
        }

        // Analiz promptu
        analysisPrompt += `

Lütfen aşağıdaki analizi yap ve sadece JSON formatında yanıt ver:

1. **Şirket Analizi** (eğer URL verilmişse):
   - Hizmet alanları
   - Ana teknolojiler  
   - Proje tipleri
   - İletişim bilgileri

2. **CV Analizi** (eğer dosya verilmişse):
   - Özet bilgiler
   - Temel yetenekler
   - Deneyim seviyesi
   - Eğitim durumu

3. **Uyumluluk Analizi** (her ikisi de verilmişse):
   - Eşleşme yüzdesi (0-100)
   - İyileştirme önerileri
   - Eksik beceriler

Yanıtını SADECE şu JSON formatında ver:
{
  "summary": "Genel analiz özeti",
  "serviceArea": "Şirket hizmet alanı", 
  "technologies": ["teknoloji1", "teknoloji2"],
  "projects": ["proje tipi1", "proje tipi2"],
  "contactInfo": "İletişim bilgileri",
  "probability": 85,
  "suggestions": ["öneri1", "öneri2", "öneri3"]
}`;

        // Text prompt'u da ekle
        parts.push({
          text: analysisPrompt
        });

        console.log('Sending analysis to Gemini API...');

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: parts
            }]
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Gemini API Error Response:', errorText);
          throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Gemini Analysis Response:', data);
        
        // Gemini API yanıtını işle
        let analysisResult = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analiz yanıtı alınamadı.';
        
        // JSON kısmını çıkart
        const jsonMatch = analysisResult.match(/```json\n([\s\S]*?)```/) || 
                         analysisResult.match(/\{[\s\S]*\}/);
        
        let parsedResult;
        if (jsonMatch) {
          try {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            parsedResult = JSON.parse(jsonStr);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            parsedResult = {
              summary: analysisResult,
              error: 'Yanıt JSON formatında işlenemedi',
              raw: analysisResult
            };
          }
        } else {
          parsedResult = {
            summary: analysisResult,
            error: 'JSON yanıt bulunamadı',
            raw: analysisResult
          };
        }

        // localStorage'a kaydet
        const analysisId = Date.now().toString();
        const newAnalysis = {
          _id: analysisId,
          companyUrl: companyUrl || null,
          filename: cvFile ? cvFile.name : null,
          cvFileName: cvFile ? cvFile.name : null,
          status: 'completed',
          createdAt: new Date().toISOString(),
          ...parsedResult
        };

        const history = JSON.parse(localStorage.getItem('analysisHistory') || '[]');
        history.unshift(newAnalysis);
        localStorage.setItem('analysisHistory', JSON.stringify(history));

        return {
          data: {
            success: true,
            message: 'Analiz tamamlandı',
            analysisId: analysisId
          }
        };

      } catch (error) {
        console.error('Gemini Analysis Error:', error);
        throw error;
      }
    },
    
    // Geçmiş analizler (localStorage'da saklanacak)
    getHistory: () => {
      try {
        const history = JSON.parse(localStorage.getItem('analysisHistory') || '[]');
        return Promise.resolve({ data: { analyses: history } });
      } catch (error) {
        return Promise.resolve({ data: { analyses: [] } });
      }
    },
    
    // Belirli analiz detayı (localStorage'dan)
    getDetails: (id) => {
      try {
        const history = JSON.parse(localStorage.getItem('analysisHistory') || '[]');
        const analysis = history.find(item => item._id === id);
        if (!analysis) {
          throw new Error('Analiz bulunamadı');
        }
        return Promise.resolve({ data: { analysis } });
      } catch (error) {
        return Promise.reject(error);
      }
    },
    
    // Analiz silme (localStorage'dan)
    deleteAnalysis: (id) => {
      try {
        const history = JSON.parse(localStorage.getItem('analysisHistory') || '[]');
        const updatedHistory = history.filter(item => item._id !== id);
        localStorage.setItem('analysisHistory', JSON.stringify(updatedHistory));
        return Promise.resolve({ data: { success: true } });
      } catch (error) {
        return Promise.reject(error);
      }
    }
  },

  // Chat endpoints
  chat: {
    // Gemini API ile sohbet mesajı gönderme
    sendMessage: async (messages) => {
      try {
        // Environment variable'dan API key'i al, yoksa hardcoded kullan
        const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || "AIzaSyD2vsbO55zUlo0LRyJdqmcRVXTBjkAEXQ4";
        const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
        
        // Gemini API formatına uygun mesaj dönüştürme
        const prompt = Array.isArray(messages) && messages.length > 0 
          ? messages[messages.length - 1].text 
          : (typeof messages === 'string' ? messages : '');

        console.log('Sending to Gemini:', prompt);

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Gemini API Error Response:', errorText);
          throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Gemini API Response:', data);
        
        // Gemini API yanıtını işle
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Üzgünüm, yanıt alınamadı.';
        
        return {
          data: {
            reply: reply,
            result: reply
          }
        };
      } catch (error) {
        console.error('Gemini API Error:', error);
        throw error;
      }
    },
    
    // Sohbet geçmişini getirme (şimdilik boş - gerekirse localStorage kullanılabilir)
    getHistory: () => Promise.resolve({ data: [] }),
    
    // Yeni sohbet başlatma
    startNewChat: () => Promise.resolve({ data: { success: true } }),
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
