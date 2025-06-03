// src/pages/AuthPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { endpoints } from '../services/api'; // API servisini sadece register için kullan
import { useAuth } from '../context/AuthContext'; // AuthContext'i ekle
import { useNotification } from '../context/NotificationContext';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Tab,
  Tabs,
  CircularProgress,
  useTheme,
  InputAdornment,
  IconButton,
  Divider,
  Stack,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import './AuthPage.css';

const AuthPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { login } = useAuth(); // AuthContext'ten login fonksiyonunu al
  
  // State management
  // 0: Kullanıcı Girişi, 1: Kullanıcı Kayıt
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  // Admin kimlik bilgileri burada artık gerekli değil, admin girişi ayrı sayfada
  // const ADMIN_EMAIL = 'adminuser@gmail.com';
  // const ADMIN_PASSWORD = 'adminuser';

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setErrors({});
    // Sekme değiştiğinde form verilerini sıfırla
    setFormData({
      name: '',
      surname: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (activeTab === 1) { // Kullanıcı Kayıt tabı
      if (!formData.name.trim()) newErrors.name = 'Ad zorunludur';
      if (!formData.surname.trim()) newErrors.surname = 'Soyad zorunludur';
    }
    
    // Kullanıcı Girişi (0) ve Kullanıcı Kayıt (1) için e-posta formatı kontrolü
    if (!formData.email.trim()) {
      newErrors.email = 'E-posta zorunludur';
    } else if ((activeTab === 0 || activeTab === 1) && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi girin';
    }
    
    if (!formData.password) {
      newErrors.password = 'Şifre zorunludur';
    } else if (activeTab === 1 && formData.password.length < 6) { // Kayıt için minimum şifre uzunluğu
       newErrors.password = 'Şifre en az 6 karakter olmalıdır';
    }
    
    if (activeTab === 1 && formData.password !== formData.confirmPassword) { // Kayıt için şifre tekrarı kontrolü
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      if (activeTab === 0) { // Kullanıcı Girişi
        const result = await login(formData.email, formData.password);
        
        if (result.success) {
          // Kullanıcının rolüne göre farklı mesaj göster
          if (result.user?.role === 'admin') {
            showNotification('Admin Girişi başarılı', 'success');
            navigate('/stats'); // Adminler için varsayılan yönlendirme
          } else {
            showNotification('Kullanıcı Girişi başarılı', 'success');
            navigate('/dashboard'); // Kullanıcılar için varsayılan yönlendirme
          }
        } else {
          showNotification(result.message || 'Giriş başarısız', 'error');
        }
      } else if (activeTab === 1) { // Kullanıcı Kayıt
         const response = await endpoints.auth.register({
           name: formData.name,
           surname: formData.surname,
           email: formData.email,
           password: formData.password
         });
         
         if (response.data.success) {
           showNotification('Kayıt başarılı', 'success');
           // Kayıt sonrası otomatik login yap
           const loginResult = await login(formData.email, formData.password);
           if (loginResult.success) {
             // Rolüne göre yönlendirme yap
             if (loginResult.user?.role === 'admin') {
               navigate('/stats');
             } else {
               navigate('/dashboard');
             }
           }
         }
      
      } /* Admin Girişi kısmı kaldırıldı */
    } catch (error) {
      console.error('Auth error:', error);
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
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 'bold',
              color: 'primary.main',
            }}
          >
            CV AI
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {activeTab === 0
              ? 'Hesabınıza giriş yapın'
              : 'Yeni bir hesap oluşturun'}
          </Typography>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            centered
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 'medium',
                minWidth: 120,
              },
            }}
          >
            <Tab label="Giriş Yap" />
            <Tab label="Kayıt Ol" />
          </Tabs>
        </Box>

        <form onSubmit={handleSubmit}>
          {/* Ad ve Soyad alanları sadece Kullanıcı Kayıt sekmesinde görünecek */}
          {activeTab === 1 && (
            <>
              <TextField
                fullWidth
                label="Ad"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Soyad"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                error={!!errors.surname}
                helperText={errors.surname}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </>
          )}
          
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
          
          {/* Şifre Tekrar alanı sadece Kullanıcı Kayıt sekmesinde görünecek */}
          {activeTab === 1 && (
            <TextField
              fullWidth
              label="Şifre Tekrar"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? (
                        <VisibilityOffIcon />
                      ) : (
                        <VisibilityIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}
          
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{
              py: 1.5,
              textTransform: 'none',
              fontWeight: 'medium',
              fontSize: '1.1rem',
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : activeTab === 0 ? (
              'Giriş Yap'
            ) : (
              'Kayıt Ol'
            )}
          </Button>
        </form>
        
        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            veya
          </Typography>
        </Divider>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {activeTab === 0
              ? 'Hesabınız yok mu?'
              : 'Zaten hesabınız var mı?'}
          </Typography>
          <Button
            onClick={() => setActiveTab(activeTab === 0 ? 1 : 0)}
            sx={{
              textTransform: 'none',
              fontWeight: 'medium',
              mt: 1,
            }}
          >
            {activeTab === 0 ? 'Kayıt Ol' : 'Giriş Yap'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AuthPage;
