// src/pages/AdminTemplatesPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Stack,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import api from '../services/api';

export default function AdminTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error, setError] = useState('');

  const fetchTemplates = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const resp = await api.get('/gallery/admin');
      setTemplates(resp.data.templates);
    } catch (err) {
      console.error('Şablon yükleme hatası:', err);
      setError('Şablonlar yüklenirken bir hata oluştu.');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async id => {
    if (!window.confirm('Bu şablonu gerçekten silmek istiyor musunuz?')) return;
    try {
      const res = await api.delete(`/gallery/admin/${id}`);
      if (res.data.success) {
        fetchTemplates();
      } else {
        setError(res.data.message || 'Silme başarısız oldu.');
      }
    } catch (err) {
      console.error('Silme hatası:', err);
      setError(err.response?.data?.message || err.message || 'Silme sırasında bir hata oluştu.');
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5">Admin: CV Şablonları</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <Button variant="contained" component={Link} to="/stats">Ziyaretçi Sayacı</Button>
          <Button variant="contained" component={Link} to="/admin/announcements">Duyuru Yönetimi</Button>
          <Button variant="contained" component={Link} to="/admin/users">Kullanıcı Yönetimi</Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/gallery', { replace: true })}
          >
            Kullanıcı Şablonları
          </Button>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/admin/templates/create')}
        >
          Yeni Şablon
        </Button>
      </Stack>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Paper variant="outlined">
        <List disablePadding>
          {templates.map(t => (
            <React.Fragment key={t._id}>
              <ListItem
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      edge="end"
                      color="primary"
                      onClick={() => navigate(`/admin/templates/edit/${t._id}`)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={() => handleDelete(t._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemText
                  primary={t.title}
                  secondary={`Slug: ${t.slug}`}
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
          {/* Eğer şablon yoksa ve yüklenmiyorsa, kullanıcıya bilgi ver */}
          {!loading && templates.length === 0 && error && (
            <ListItem>
              <ListItemText primary={error} />
            </ListItem>
          )}

          {/* Eğer şablon yoksa ve yüklenmiyorsa, kullanıcıya bilgi ver */}

          {!loading && templates.length === 0 && !error && (
            <ListItem>
              <ListItemText primary="Henüz kayıtlı şablon yok." />
            </ListItem>
          )}

          {loading && (
            <ListItem>
              <ListItemText primary="Yükleniyor…" />
            </ListItem>
          )}
        </List>
      </Paper>
    </Box>
  );
}
