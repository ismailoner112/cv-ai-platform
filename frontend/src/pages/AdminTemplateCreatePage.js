// src/pages/AdminTemplateCreatePage.js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField,
  Button, CircularProgress, Alert
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { useCsrf } from '../hooks/useCsrf';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export default function AdminTemplateCreatePage() {
  const { token: csrfToken } = useCsrf();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Authentication check
  useEffect(() => {
    console.log('AdminTemplateCreatePage auth check:', {
      authLoading,
      isAuthenticated,
      userRole: user?.role,
      csrfToken: !!csrfToken
    });
    
    if (!authLoading && (!isAuthenticated || user?.role !== 'admin')) {
      showNotification('Bu sayfaya erişim için admin yetkisi gereklidir.', 'error');
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, user, navigate, showNotification, csrfToken]);

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Yetki Kontrol Ediliyor...</Typography>
      </Box>
    );
  }

  // Don't render if user is not authenticated or not admin
  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    
    if (!title.trim() || !file) {
      setError('Başlık ve PDF dosyası gerekli');
      return;
    }

    if (file.type !== 'application/pdf') {
      setError('Sadece PDF formatında dosya yükleyebilirsiniz');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError('Dosya boyutu 10MB\'dan büyük olamaz');
      return;
    }

    if (!csrfToken) {
      setError('CSRF token bulunamadı. Lütfen sayfayı yenileyin.');
      return;
    }

    setLoading(true);
    
    try {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('description', description);
      form.append('file', file);

      console.log('PDF yükleme başlıyor...', {
        title: title.trim(),
        description,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        userRole: user?.role,
        hasCSRF: !!csrfToken
      });

      const res = await fetch('/api/gallery', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': csrfToken
        },
        body: form
      });

      const data = await res.json();
      console.log('Sunucu yanıtı:', data);

      if (res.ok && data.success) {
        console.log('PDF başarıyla yüklendi');
        showNotification('Şablon başarıyla yüklendi!', 'success');
        navigate('/admin/templates');
      } else {
        console.error('Yükleme hatası:', data);
        const errorMessage = data.message || 'Yükleme başarısız';
        setError(errorMessage);
        showNotification(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Network hatası:', error);
      const errorMessage = 'Ağ hatası oluştu. Lütfen tekrar deneyin.';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      console.log('Seçilen dosya:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      });
      setFile(selectedFile);
      setError(''); // Dosya seçildiğinde hatayı temizle
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p:4,
        maxWidth:600,
        mx:'auto',
        display:'flex',
        flexDirection:'column',
        gap:2
      }}
    >
      <Typography variant="h5">➕ Yeni CV Şablonu Yükle</Typography>

      {/* Admin Navigasyon Butonları */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <Button variant="contained" component={Link} to="/stats">Ziyaretçi Sayacı</Button>
        <Button variant="contained" component={Link} to="/admin/gallery">Galeri Yönetimi</Button>
        <Button variant="contained" component={Link} to="/admin/announcements">Duyuru Yönetimi</Button>
        <Button variant="contained" component={Link} to="/admin/users">Kullanıcı Yönetimi</Button>
        <Button variant="contained" component={Link} to="/admin/templates">Şablon Yönetimi</Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        label="Şablon Başlığı"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
      />
      <TextField
        label="Açıklama (isteğe bağlı)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        multiline
        rows={3}
      />
      <Box>
        <Button variant="outlined" component="label" fullWidth>
          {file ? `PDF Seçildi: ${file.name}` : 'PDF Seç'}
          <input
            hidden
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
          />
        </Button>
        {file && (
          <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
            Dosya boyutu: {(file.size / 1024 / 1024).toFixed(2)} MB
          </Typography>
        )}
      </Box>
      <Button 
        type="submit" 
        variant="contained" 
        disabled={loading || !title.trim() || !file}
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={24}/> : 'Yükle'}
      </Button>
    </Box>
  );
}
