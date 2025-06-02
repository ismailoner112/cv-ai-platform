// src/pages/AdminTemplateCreatePage.js
import React, { useState } from 'react';
import {
  Box, Typography, TextField,
  Button, CircularProgress
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { useCsrf } from '../hooks/useCsrf';

export default function AdminTemplateCreatePage() {
  const csrfToken = useCsrf();
  const navigate  = useNavigate();
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile]               = useState(null);
  const [loading, setLoading]         = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!title.trim() || !file) {
      return alert('Başlık ve PDF dosyası gerekli');
    }

    setLoading(true);
    const form = new FormData();
    form.append('title',       title.trim());
    form.append('description', description);
    form.append('file',        file);

   // JWT token'ı localStorage'dan al
   const token = localStorage.getItem('token');

    const res = await fetch('/api/gallery', {
      method:      'POST',
      credentials: 'include',
      headers: {
       'Authorization': `Bearer ${token}`,
        'X-CSRF-Token':    csrfToken
      },
      body: form
    });

    setLoading(false);

    if (res.ok) {
      navigate('/admin/templates');
    } else {
      const err = await res.json();
      alert(err.message || 'Yükleme başarısız');
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
      />
      <Button variant="outlined" component="label">
        PDF Seç
        <input
          hidden
          type="file"
          accept="application/pdf"
          onChange={e => setFile(e.target.files[0])}
        />
      </Button>
      <Button type="submit" variant="contained" disabled={loading}>
        {loading ? <CircularProgress size={24}/> : 'Yükle'}
      </Button>
    </Box>
  );
}
