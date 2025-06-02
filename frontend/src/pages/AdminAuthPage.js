import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  useTheme,
  InputAdornment,
  IconButton,
  Divider,
  Alert,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';

const AdminAuthPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [csrfToken, setCsrfToken] = useState('');

  // Admin kimlik bilgileri artık backend'de kontrol ediliyor
  // const ADMIN_EMAIL = 'adminuser@gmail.com';
  // const ADMIN_PASSWORD = 'adminuser';

  useEffect(() => {
    // Fetch CSRF token when component mounts
    const fetchCsrfToken = async () => {
      try {
        const response = await auth.getCsrfToken();
        setCsrfToken(response.data.csrfToken);
        console.log('CSRF Token fetched:', response.data.csrfToken);
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
        showNotification('CSRF token yüklenemedi. Lütfen sayfayı yenileyin.', 'error');
      }
    };
    fetchCsrfToken();
  }, [showNotification]); // Added showNotification to dependency array

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'E-posta zorunludur';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi girin';
    }
    
    if (!formData.password) {
      newErrors.password = 'Şifre zorunludur';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm() || !csrfToken) { // Ensure form is valid and CSRF token is available
       if (!csrfToken) {
          showNotification('CSRF token hala yüklenmedi. Lütfen bekleyin veya sayfayı yenileyin.', 'error');
       }
       return; // Stop if form is invalid or token is missing
    }
    
    setLoading(true);
    try {
      // Pass CSRF token in headers for the login request
      const response = await auth.login({
        email: formData.email,
        password: formData.password
      }, { headers: { 'X-CSRF-Token': csrfToken } }); // Include CSRF token in headers
      
      // Backend başarılı yanıt döndürürse (rol admin olsa da olmasa da)
      if (response.data.success) {
          // Frontend sadece backend'in verdiği role göre yönlendirme yapacak
          if (response.data.user?.role === 'admin') {
               showNotification('Admin Girişi başarılı', 'success');
               navigate('/stats'); // Adminler için varsayılan yönlendirme
          } else {
               // Admin giriş sayfasından normal kullanıcı girişi yapılırsa
               showNotification('Kullanıcı Girişi başarılı', 'success');
               navigate('/analysis'); // Kullanıcılar için varsayılan yönlendirme
          }

      } /* Backend hata döndürürse catch bloğu çalışır */
    } catch (error) {
      console.error('Auth error:', error);
      // The interceptor will handle 403 CSRF errors and retry
      // Other errors (like 401 invalid credentials) will be caught here.
      showNotification(
        error.response?.data?.message || 'Bir hata oluştu',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: 2,
          background: theme.palette.background.paper,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <AdminIcon
            sx={{
              fontSize: 48,
              color: 'primary.main',
              mb: 2,
            }}
          />
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 'bold',
              color: 'primary.main',
            }}
          >
            Admin Girişi
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Yönetici hesabınızla giriş yapın
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="E-posta"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              fullWidth
              label="Şifre"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                textTransform: 'none',
                fontWeight: 'medium',
                fontSize: '1.1rem',
                mt: 1,
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Giriş Yap'
              )}
            </Button>
          </Box>
        </form>

        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            veya
          </Typography>
        </Divider>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Kullanıcı olarak giriş yapmak ister misiniz?
          </Typography>
          <Button
            onClick={() => navigate('/auth')}
            sx={{
              textTransform: 'none',
              fontWeight: 'medium',
              mt: 1,
            }}
          >
            Kullanıcı Girişi
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AdminAuthPage; 