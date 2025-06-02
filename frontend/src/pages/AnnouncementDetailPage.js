// src/pages/AnnouncementDetailPage.js
import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper
} from '@mui/material'

export default function AnnouncementDetailPage() {
  const { slug } = useParams()
  const [announcement, setAnnouncement] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [isFav, setIsFav]             = useState(false)

  const token = localStorage.getItem('token')

  // 1) Duyuru detayını çek
  useEffect(() => {
    fetch(`/api/announcements/${slug}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Duyuru alınamadı')
        return res.json()
      })
      .then(data => {
        setAnnouncement(data.announcement)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug, token])

  // 2) Favori durumunu çek
  useEffect(() => {
    if (!announcement) return

    fetch('/api/users/favorites', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(d => {
        if (d.success) {
          // populate edildiğinde her fav item içinde _id ve slug var
          setIsFav(d.favorites.some(a => a._id === announcement._id))
        }
      })
      .catch(() => {}) // hata tolere
  }, [announcement, token])

  // 3) Favori ekle/çıkar işlemi
  const toggleFav = async () => {
    try {
      const method = isFav ? 'DELETE' : 'POST'
      const res = await fetch(`/api/users/favorites/${announcement._id}`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const d = await res.json()
      if (d.success) {
        setIsFav(!isFav)
      } else {
        alert(d.message || 'İşlem başarısız')
      }
    } catch (err) {
      console.error(err)
      alert('Sunucu hatası')
    }
  }

  if (loading) {
    return (
      <Box sx={{ p:4, textAlign:'center' }}>
        <CircularProgress />
      </Box>
    )
  }
  if (error) {
    return <Typography color="error">{error}</Typography>
  }
  if (!announcement) {
    return <Typography>Bulunamadı.</Typography>
  }

  return (
    <Box sx={{ p:4, maxWidth:800, mx:'auto' }}>
      <Paper sx={{ p:3, mb:3 }}>
        <Typography variant="h4" gutterBottom>
          {announcement.title}
        </Typography>
        <Typography variant="subtitle2" gutterBottom>
          Yayın Tarihi:{' '}
          {announcement.publishDate
            ? new Date(announcement.publishDate).toLocaleDateString()
            : '—'}
        </Typography>
        <Typography variant="body1" paragraph>
          {announcement.content}
        </Typography>

        <Button
          variant={isFav ? 'contained' : 'outlined'}
          color={isFav ? 'secondary' : 'primary'}
          onClick={toggleFav}
        >
          {isFav ? '⭐ Favorilerden Çıkar' : '☆ Favorilere Ekle'}
        </Button>
      </Paper>
    </Box>
  )
}
