// src/pages/AdminAnnouncementsEditPage.js
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Box, Typography, TextField, Button,
  FormControlLabel, Checkbox, MenuItem,
  CircularProgress
} from '@mui/material'
import { useCsrf } from '../hooks/useCsrf'

const categories = ['genel','duyuru','haber','etkinlik']

export default function AdminAnnouncementsEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const csrfToken = useCsrf()

  const [form, setForm] = useState(null)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/announcements/id/${id}`, {
      credentials: 'include'
    })
      .then(r=>r.json())
      .then(d => {
        if (d.success) {
          const a = d.announcement
          setForm({
            title: a.title,
            content: a.content,
            isPublished: a.isPublished,
            publishDate: a.publishDate?.split('T')[0] || '',
            expiryDate: a.expiryDate?.split('T')[0] || '',
            category: a.category
          })
        }
      })
      .finally(()=>setLoading(false))
  }, [id])

  if (loading || !form) {
    return <Box sx={{p:4,textAlign:'center'}}><CircularProgress/></Box>
  }

  const handleChange = e => {
    const { name, value, type, checked } = e.target
    setForm(f => ({
      ...f,
      [name]: type==='checkbox' ? checked : value
    }))
  }
  const handleFile = e => {
    if (e.target.files[0]) setFile(e.target.files[0])
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    const body = new FormData()
    Object.entries(form).forEach(([k,v]) => body.append(k, v))
    if (file) body.append('image', file)

    const res = await fetch(`/api/announcements/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'X-CSRF-Token': csrfToken },
      body
    })
    setLoading(false)
    const data = await res.json()
    if (data.success) {
      navigate('/admin/announcements')
    } else {
      alert(data.message)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p:4, maxWidth:600, mx:'auto', display:'flex', flexDirection:'column', gap:2 }}>
      <Typography variant="h5">Duyuru Düzenle</Typography>

      {/* Admin Navigasyon Butonları */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <Button variant="contained" component={Link} to="/stats">Ziyaretçi Sayacı</Button>
        <Button variant="contained" component={Link} to="/admin/gallery">Galeri Yönetimi</Button>
        <Button variant="contained" component={Link} to="/admin/announcements">Duyuru Yönetimi</Button>
        <Button variant="contained" component={Link} to="/admin/users">Kullanıcı Yönetimi</Button>
        <Button variant="contained" component={Link} to="/admin/templates">Şablon Yönetimi</Button>
      </Box>

      <TextField
        label="Başlık" name="title" required
        value={form.title} onChange={handleChange}
      />
      <TextField
        label="İçerik" name="content" required multiline minRows={4}
        value={form.content} onChange={handleChange}
      />
      <FormControlLabel
        control={
          <Checkbox
            name="isPublished" checked={form.isPublished}
            onChange={handleChange}
          />
        }
        label="Yayınla"
      />
      <TextField
        label="Yayın Tarihi" name="publishDate" type="date"
        InputLabelProps={{ shrink:true }}
        value={form.publishDate} onChange={handleChange}
      />
      <TextField
        label="Bitiş Tarihi" name="expiryDate" type="date"
        InputLabelProps={{ shrink:true }}
        value={form.expiryDate} onChange={handleChange}
      />
      <TextField
        select label="Kategori" name="category"
        value={form.category} onChange={handleChange}
      >
        {categories.map(c => (
          <MenuItem value={c} key={c}>{c}</MenuItem>
        ))}
      </TextField>
      <Button variant="outlined" component="label">
        Yeni Görsel Seç
        <input hidden type="file" accept="image/*" onChange={handleFile} />
      </Button>
      <Button type="submit" variant="contained" disabled={loading}>
        {loading ? <CircularProgress size={24}/> : 'Güncelle'}
      </Button>
    </Box>
  )
}
