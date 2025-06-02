// src/pages/GalleryPages.js
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Container,
  useTheme,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Sort as SortIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { gallery } from '../services/api';

export default function GalleryPages() {
  const theme = useTheme();
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAtDesc');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const params = {
          searchTerm,
          sortBy,
        };
        const res = await gallery.list(params);
        setItems(res.data.items);
      } catch (error) {
        console.error('Error fetching gallery items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [searchTerm, sortBy]);

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 6 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          align="center"
          sx={{
            fontWeight: 'bold',
            color: 'primary.main',
            mb: 2,
          }}
        >
          CV Sablonlari
        </Typography>
        <Typography
          variant="subtitle1"
          align="center"
          color="text.secondary"
          sx={{ mb: 4 }}
        >
          Profesyonel CV sablonlarini inceleyin ve kariyeriniz icin en uygun olani secin
        </Typography>

        {/* Search and Sort */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
            alignItems: 'center',
            mb: 4,
            flexWrap: 'wrap',
          }}
        >
          <TextField
            label="Baslik Ara"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
            }}
            sx={{
              minWidth: 300,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />

          <FormControl
            variant="outlined"
            size="small"
            sx={{
              minWidth: 200,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          >
            <InputLabel>Siralama</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="Siralama"
              startAdornment={<SortIcon sx={{ color: 'text.secondary', mr: 1 }} />}
            >
              <MenuItem value="createdAtDesc">En Yeni (Once)</MenuItem>
              <MenuItem value="createdAtAsc">En Eski (Once)</MenuItem>
              <MenuItem value="titleAsc">Basliga Gore (A-Z)</MenuItem>
              <MenuItem value="titleDesc">Basliga Gore (Z-A)</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Gallery Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <Typography>Yukleniyor...</Typography>
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', my: 4 }}>
            <Typography color="text.secondary">
              Henuz sablon yuklenmemis veya arama kriterlerinize uygun sonuc bulunamadi.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {items.map((item) => (
              <Grid item key={item._id} xs={12} sm={6} md={4} lg={3}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[4],
                    },
                  }}
                >
                  {item.filename && (
                    <CardMedia
                      component="img"
                      height="200"
                      image={`${process.env.REACT_APP_API_URL}/uploads/gallery/${item.filename}`}
                      alt={item.title}
                      sx={{
                        objectFit: 'cover',
                        borderBottom: `1px solid ${theme.palette.divider}`,
                      }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="h6"
                      component="h3"
                      gutterBottom
                      sx={{
                        fontWeight: 'medium',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 2,
                      }}
                    >
                      {item.description || 'Aciklama yok.'}
                    </Typography>
                    {item.tags && item.tags.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                        {item.tags.map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: 1 }}
                          />
                        ))}
                      </Box>
                    )}
                  </CardContent>
                  <Box
                    sx={{
                      p: 2,
                      pt: 0,
                      display: 'flex',
                      gap: 1,
                      justifyContent: 'center',
                    }}
                  >
                    {item.filename && (
                      <>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityIcon />}
                          component="a"
                          href={`${process.env.REACT_APP_API_URL}/uploads/gallery/${item.filename}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ borderRadius: 2 }}
                        >
                          Goruntule
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<DownloadIcon />}
                          component="a"
                          href={`${process.env.REACT_APP_API_URL}/uploads/gallery/${item.filename}`}
                          download
                          sx={{ borderRadius: 2 }}
                        >
                          Indir
                        </Button>
                      </>
                    )}
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
}
