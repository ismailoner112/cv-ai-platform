// src/pages/FavoritesPage.js
import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { authAPI, analysisAPI, chatAPI, announcementsAPI, visitorAPI } from '../services/api'

export default function FavoritesPage() {
  const [favs, setFavs] = useState([]);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // src/pages/FavoritesPage.js
useEffect(() => {
  fetch('/api/users/favorites', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(d => {
      if (d.success) setFavs(d.favorites);
      else setFavs([]);
    });
}, [token]);


  return (
    <Box p={4}>
      <Typography variant="h5" gutterBottom>⭐ Favori Duyurularınız</Typography>
      {favs.length===0
        ? <Typography>Henüz favori eklemediniz.</Typography>
        : (
          <Grid container spacing={2}>
            {favs.map(a => (
              <Grid item key={a._id} xs={12} sm={6} md={4}>
                <Card onClick={()=>navigate(`/announcements/${a.slug}`)} sx={{cursor:'pointer'}}>
                  <CardContent>
                    <Typography variant="subtitle1">{a.title}</Typography>
                    <Typography variant="body2">
                      {new Date(a.publishDate).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )
      }
    </Box>
  );
}
