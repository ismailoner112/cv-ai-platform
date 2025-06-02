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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Sort as SortIcon,
  PictureAsPdf as PdfIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { gallery } from '../services/api';

export default function GalleryPages() {
  const theme = useTheme();
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAtDesc');
  const [loading, setLoading] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
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

  const handleDownload = async (item) => {
    try {
      // API'den download endpoint'ini kullan
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/gallery/download/${item._id}`);
      
      if (!response.ok) {
        throw new Error('İndirme başarısız');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${item.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('İndirme hatası:', error);
      alert('PDF indirilemedi. Lütfen tekrar deneyin.');
    }
  };

  const handleViewPdf = (item) => {
    setSelectedPdf(item);
    setPdfModalOpen(true);
  };

  const handleClosePdfModal = () => {
    setPdfModalOpen(false);
    setSelectedPdf(null);
  };

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
          CV Şablonları
        </Typography>
        <Typography
          variant="subtitle1"
          align="center"
          color="text.secondary"
          sx={{ mb: 4 }}
        >
          Profesyonel CV şablonlarını inceleyin ve kariyeriniz için en uygun olanı seçin
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
            label="Başlık Ara"
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
            <InputLabel>Sıralama</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="Sıralama"
              startAdornment={<SortIcon sx={{ color: 'text.secondary', mr: 1 }} />}
            >
              <MenuItem value="createdAtDesc">En Yeni (Önce)</MenuItem>
              <MenuItem value="createdAtAsc">En Eski (Önce)</MenuItem>
              <MenuItem value="titleAsc">Başlığa Göre (A-Z)</MenuItem>
              <MenuItem value="titleDesc">Başlığa Göre (Z-A)</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Gallery Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <Typography>Yükleniyor...</Typography>
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', my: 4 }}>
            <Typography color="text.secondary">
              Henüz şablon yüklenmemiş veya arama kriterlerinize uygun sonuç bulunamadı.
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
                  {/* PDF Preview */}
                  <Box
                    sx={{
                      height: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.palette.grey[100],
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <PdfIcon 
                      sx={{ 
                        fontSize: 80, 
                        color: theme.palette.error.main,
                        opacity: 0.7 
                      }} 
                    />
                  </Box>
                  
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
                      {item.description || 'Açıklama yok.'}
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
                          onClick={() => handleViewPdf(item)}
                          sx={{ borderRadius: 2 }}
                        >
                          Görüntüle
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownload(item)}
                          sx={{ borderRadius: 2 }}
                        >
                          İndir
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

      {/* PDF Görüntüleme Modal */}
      <Dialog
        open={pdfModalOpen}
        onClose={handleClosePdfModal}
        maxWidth="lg"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            height: '90vh',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {selectedPdf?.title} - PDF Görüntüle
          </Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={handleClosePdfModal}
            aria-label="kapat"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '100%' }}>
          {selectedPdf && (
            <iframe
              src={`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/gallery/view/${selectedPdf._id}`}
              width="100%"
              height="100%"
              style={{ border: 'none', minHeight: '600px' }}
              title={`${selectedPdf.title} PDF Görüntüleyici`}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => handleDownload(selectedPdf)} 
            startIcon={<DownloadIcon />}
            variant="contained"
          >
            İndir
          </Button>
          <Button onClick={handleClosePdfModal}>
            Kapat
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
