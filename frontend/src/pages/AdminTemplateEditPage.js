import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField,
  Button, CircularProgress
} from '@mui/material';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCsrf } from '../hooks/useCsrf';

export default function AdminTemplateEditPage() {
  const { id } = useParams();
  const csrfToken = useCsrf();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/gallery/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setForm({
            title: d.item.title,
            description: d.item.description
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    if (file) formData.append('file', file);
    const res = await fetch(`/api/gallery/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'X-CSRF-Token': csrfToken },
      body: formData
    });
    setLoading(false);
    if (res.ok) navigate('/admin/templates');
    else alert('Güncelleme başarısız');
  };

  if (loading || !form) {
    return <Box sx={{p:4,textAlign:'center'}}><CircularProgress/></Box>;
  }

  return (
    <Box component="form" onSubmit={handleSubmit}
      sx={{ p:4, maxWidth:600, mx:'auto', display:'flex', flexDirection:'column', gap:2 }}
    >
      <Typography variant="h5">✏️ Şablon Düzenle</Typography>

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
        name="title"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        required
      />
      <TextField
        label="Açıklama"
        name="description"
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
      />
      <Button variant="outlined" component="label">
        Yeni PDF Seç
        <input
          hidden
          type="file"
          accept="application/pdf"
          onChange={e => setFile(e.target.files[0])}
        />
      </Button>
      <Button type="submit" variant="contained" disabled={loading}>
        {loading ? <CircularProgress size={24} /> : 'Güncelle'}
      </Button>
    </Box>
  );
}
