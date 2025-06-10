// src/pages/AdminAnnouncementsPage.js

import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Container,
  Paper,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Chip,
  Pagination,
  Stack,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  AttachMoney as AttachMoneyIcon,
  Stars as StarsIcon,
  CheckCircleOutline as PublishedIcon,
  HighlightOff as DraftIcon,
  History as HistoryIcon,
  Public as PublicIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import { useNavigate, Link } from 'react-router-dom'
import { announcements, jobs } from '../services/api'
import { toast } from 'react-toastify'

// Önerilen Anahtar Kelimeler Listesi
const suggestedKeywords = [
  'React',
  'Node.js',
  'MongoDB',
  'Full Stack Developer',
  'Yazılım Mühendisi',
  'JavaScript Developer',
  'Web Developer',
  'React Node.js',
  'Full Stack JavaScript',
  'MongoDB Backend Developer',
  'Python Developer',
  'Java Developer',
  'C# Developer',
  'Mobil Geliştirici',
  'DevOps Mühendisi',
  'Sistem Yöneticisi',
  'Veritabanı Yöneticisi',
  'Ağ Mühendisi',
  'Siber Güvenlik Uzmanı',
  'Test Mühendisi',
  'Analist Programcı',
  'Veri Bilimci',
  'Makine Öğrenmesi Mühendisi',
  'Yapay Zeka Mühendisi',
  'Bulut Mimarı',
  'Frontend Developer',
  'Backend Developer',
  'QA Engineer',
  'Proje Yöneticisi (IT)',
  'Scrum Master',
  'İş Analisti (IT)',
  'UI/UX Tasarımcısı',
]

export default function AdminAnnouncementsPage() {
  const navigate = useNavigate()
  const [anns, setAnns]       = useState([])
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [scrapeKeyword, setScrapeKeyword] = useState('')
  const [scrapeSource, setScrapeSource] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [announcementToDelete, setAnnouncementToDelete] = useState(null)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState('success')

  // Pagination and Filtering for Display (Optional - can be added later)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [filterKeyword, setFilterKeyword] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterPublished, setFilterPublished] = useState('') // 'true', 'false', ''

  const [debugLoading, setDebugLoading] = useState(false)
  const [debugResults, setDebugResults] = useState(null)

  const showNotification = (message, severity) => {
    setSnackbarMessage(message)
    setSnackbarSeverity(severity)
    setSnackbarOpen(true)
  }

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return
    }
    setSnackbarOpen(false)
  }

  // Sunucudan tüm duyuruları çeken fonksiyon
  const fetchAnns = async () => {
    setLoading(true)
    try {
      // api.js üzerinden duyuruları çekiyoruz
      const res = await announcements.list()
      if (res.data.success) {
        // Duyuruları yayın tarihine göre azalan sırada sıralıyoruz
        const sortedAnns = res.data.announcements.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
        setAnns(sortedAnns)
      } else {
        console.error('Sunucudan beklenmeyen cevap:', res.data)
        showNotification(res.data.message || 'Duyurular yüklenemedi', 'error')
        setAnns([])
      }
    } catch (err) {
      console.error('Duyuruları çekerken hata:', err)
      showNotification('Duyuruları çekerken hata oluştu', 'error')
      setAnns([])
    } finally {
      setLoading(false)
    }
  }

  // Sayfa ilk render olduğunda fetchAnns'i çağır
  useEffect(() => {
    fetchAnns()
  }, []) // Boş bağımlılık dizisi sadece ilk renderda çalışmasını sağlar

  const handleDeleteClick = (announcement) => {
    setAnnouncementToDelete(announcement)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!announcementToDelete) return

    try {
      // api.js üzerinden duyuruyu sil
      const res = await announcements.delete(announcementToDelete._id)
      if (res.data.success) {
        // Silinen duyuruyu state'ten çıkar
        showNotification('Duyuru başarıyla silindi', 'success')
        setAnns((prev) => prev.filter((x) => x._id !== announcementToDelete._id))
      } else {
        showNotification(res.data.message || 'Silme işlemi başarısız.', 'error')
      }
    } catch (err) {
      console.error('Silme işlemi sırasında hata:', err)
      showNotification('Silme işlemi sırasında hata oluştu.', 'error')
    } finally {
      setDeleteDialogOpen(false)
      setAnnouncementToDelete(null)
    }
  }

  // Enhanced debug functions with better error handling
  const handleTestKariyer = async () => {
    setDebugLoading(true);
    setDebugResults(null);
    try {
      toast.info('🧪 Kariyer.net testi başlatılıyor...');
      const response = await jobs.testKariyer();
      console.log('Test Kariyer response:', response.data);
      
      if (response.data.success) {
        setDebugResults({
          type: 'kariyer',
          success: true,
          data: response.data.data || response.data,
          message: response.data.message || 'Kariyer.net testi başarılı'
        });
        toast.success(`✅ Kariyer.net: ${response.data.message || 'Test başarılı'}`);
      } else {
        setDebugResults({
          type: 'kariyer',
          success: false,
          message: response.data.message || 'Test başarısız'
        });
        toast.warning(`⚠️ Kariyer.net: ${response.data.message || 'Test başarısız'}`);
      }
    } catch (error) {
      console.error('Kariyer.net test error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Bilinmeyen hata';
      setDebugResults({
        type: 'kariyer',
        success: false,
        message: errorMessage
      });
      toast.error(`❌ Kariyer.net test hatası: ${errorMessage}`);
    } finally {
      setDebugLoading(false);
    }
  };

  const handleTestLinkedin = async () => {
    setDebugLoading(true);
    setDebugResults(null);
    try {
      toast.info('🧪 LinkedIn testi başlatılıyor...');
      const response = await jobs.testLinkedin();
      console.log('Test LinkedIn response:', response.data);
      
      if (response.data.success) {
        setDebugResults({
          type: 'linkedin',
          success: true,
          data: response.data.data || response.data,
          message: response.data.message || 'LinkedIn testi başarılı'
        });
        toast.success(`✅ LinkedIn: ${response.data.message || 'Test başarılı'}`);
      } else {
        setDebugResults({
          type: 'linkedin',
          success: false,
          message: response.data.message || 'Test başarısız'
        });
        toast.warning(`⚠️ LinkedIn: ${response.data.message || 'Test başarısız'}`);
      }
    } catch (error) {
      console.error('LinkedIn test error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Bilinmeyen hata';
      setDebugResults({
        type: 'linkedin',
        success: false,
        message: errorMessage
      });
      toast.error(`❌ LinkedIn test hatası: ${errorMessage}`);
    } finally {
      setDebugLoading(false);
    }
  };

  const handleFullScrapeTest = async () => {
    setDebugLoading(true);
    setDebugResults(null);
    try {
      toast.info('🧪 Full scrape testi başlatılıyor...');
      const response = await jobs.testFullScrape();
      console.log('Full scrape test response:', response.data);
      
      if (response.data.success) {
        setDebugResults({
          type: 'fullscrape',
          success: true,
          data: response.data.data || response.data,
          message: response.data.message || 'Full scrape testi başarılı'
        });
        toast.success(`✅ Full Scrape: ${response.data.message || 'Test başarılı'}`);
      } else {
        setDebugResults({
          type: 'fullscrape',
          success: false,
          message: response.data.message || 'Test başarısız'
        });
        toast.warning(`⚠️ Full Scrape: ${response.data.message || 'Test başarısız'}`);
      }
    } catch (error) {
      console.error('Full scrape test error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Bilinmeyen hata';
      setDebugResults({
        type: 'fullscrape',
        success: false,
        message: errorMessage
      });
      toast.error(`❌ Full scrape test hatası: ${errorMessage}`);
    } finally {
      setDebugLoading(false);
    }
  };

  const handleQuickScrape = async () => {
    setDebugLoading(true);
    setDebugResults(null);
    try {
      const searchTerm = 'react developer';
      toast.info(`🧪 Quick scrape başlatılıyor: "${searchTerm}"...`);
      const response = await jobs.quickScrape(searchTerm);
      console.log('Quick scrape response:', response.data);
      
      if (response.data.success) {
        setDebugResults({
          type: 'quickscrape',
          success: true,
          data: response.data.data || response.data,
          message: response.data.message || 'Quick scrape başarılı'
        });
        toast.success(`✅ Quick Scrape: ${response.data.message || 'Test başarılı'}`);
        
        // Auto-refresh announcements if jobs were found
        if (response.data.data?.jobs?.length > 0) {
          setTimeout(() => {
            fetchAnns();
          }, 2000);
        }
      } else {
        setDebugResults({
          type: 'quickscrape',
          success: false,
          message: response.data.message || 'Test başarısız'
        });
        toast.warning(`⚠️ Quick Scrape: ${response.data.message || 'Test başarısız'}`);
      }
    } catch (error) {
      console.error('Quick scrape error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Bilinmeyen hata';
      setDebugResults({
        type: 'quickscrape',
        success: false,
        message: errorMessage
      });
      toast.error(`❌ Quick scrape hatası: ${errorMessage}`);
    } finally {
      setDebugLoading(false);
    }
  };

  const handleScraperInfo = async () => {
    setDebugLoading(true);
    setDebugResults(null);
    try {
      toast.info('🧪 Scraper bilgileri alınıyor...');
      const response = await jobs.getScraperInfo();
      console.log('Scraper info response:', response.data);
      
      if (response.data.success) {
        setDebugResults({
          type: 'scraperinfo',
          success: true,
          data: response.data.data || response.data,
          message: 'Scraper bilgileri başarıyla alındı'
        });
        toast.success('✅ Scraper bilgileri alındı');
      } else {
        setDebugResults({
          type: 'scraperinfo',
          success: false,
          message: response.data.message || 'Bilgiler alınamadı'
        });
        toast.warning(`⚠️ Scraper Info: ${response.data.message || 'Bilgiler alınamadı'}`);
      }
    } catch (error) {
      console.error('Scraper info error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Bilinmeyen hata';
      setDebugResults({
        type: 'scraperinfo',
        success: false,
        message: errorMessage
      });
      toast.error(`❌ Scraper info hatası: ${errorMessage}`);
    } finally {
      setDebugLoading(false);
    }
  };

  // İş ilanlarını çeken fonksiyon (External Web Scraping)
  const handleScrapeJobs = async () => {
    if (!scrapeSource || !scrapeKeyword.trim()) {
      showNotification('Lütfen kaynak ve anahtar kelime seçiniz.', 'warning')
      return
    }

    setScraping(true)
    try {
      console.log('External web scraping başlatılıyor:', { source: scrapeSource, keyword: scrapeKeyword.trim() })
      
      // API çağrısını doğru formatta yap
      const res = await jobs.scrape({ source: scrapeSource, keyword: scrapeKeyword.trim() })
      
      console.log('External web scraping yanıtı:', res.data)
      
      if (res.data.success) {
        const { data } = res.data
        let message = res.data.message || 'Web sitelerinden ilanlar başarıyla çekildi'
        
        if (data) {
          // Bulunan ilanları detaylarıyla göster
          if (data.results && data.results.length > 0) {
            message += `\n\n📋 Bulunan İlanlar:\n`
            data.results.slice(0, 5).forEach((job, index) => {
              message += `${index + 1}. ${job.company} - ${job.title} (${job.location})\n`
            })
            
            if (data.results.length > 5) {
              message += `... ve ${data.results.length - 5} ilan daha\n`
            }
            
            message += `\n💾 Toplam: ${data.scrapedCount} ilan bulundu`
            message += `\n🆕 Yeni: ${data.createdCount} ilan eklendi`
            message += `\n🔄 Güncellenen: ${data.updatedCount} ilan`
            message += `\n🔍 Kaynak: ${scrapeSource === 'all' ? 'Tüm Kaynaklar' : scrapeSource.toUpperCase()}`
            message += `\n🏷️ Anahtar Kelime: "${scrapeKeyword}"`
          } else {
            message = `"${scrapeKeyword}" anahtar kelimesi için ${scrapeSource === 'all' ? 'hiçbir web sitesinde' : scrapeSource + ' web sitesinde'} ilan bulunamadı.`
          }
        }
        
        showNotification(message, data?.results?.length > 0 ? 'success' : 'info')
        
        // Başarılı scraping sonrası, eğer yeni ilanlar bulunduysa announcements'ı yenile
        if (data?.createdCount > 0) {
          fetchAnns() // Güncel ilanları göstermek için yeniden çek
        }
        
      } else {
        console.error('External web scraping başarısız:', res.data)
        let errorMessage = res.data.message || 'Web sitelerinden ilan çekilirken hata oluştu.'
        showNotification(errorMessage, 'error')
      }
    } catch (err) {
      console.error('External web scraping hatası:', err)
      let errorMessage = 'Web sitelerinden ilan çekilirken bir hata oluştu.'
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.response?.status === 403) {
        errorMessage = 'Bu işlem için yetkiniz bulunmuyor.'
      } else if (err.response?.status === 500) {
        errorMessage = 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyiniz.'
      } else if (err.code === 'NETWORK_ERROR') {
        errorMessage = 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol ediniz.'
      }
      
      showNotification(errorMessage, 'error')
    } finally {
      setScraping(false)
    }
  }

  // Filtered announcements for display
  const filteredAnns = anns.filter(ann => {
    const matchesKeyword = filterKeyword ? 
      ann.title.toLowerCase().includes(filterKeyword.toLowerCase()) ||
      ann.description?.toLowerCase().includes(filterKeyword.toLowerCase()) ||
      ann.company?.toLowerCase().includes(filterKeyword.toLowerCase()) ||
      ann.location?.toLowerCase().includes(filterKeyword.toLowerCase()) : true

    const matchesSource = filterSource ? ann.source === filterSource : true
    const matchesPublished = filterPublished !== '' ? ann.isPublished === (filterPublished === 'true') : true

    return matchesKeyword && matchesSource && matchesPublished
  })

  // Pagination logic
  const paginatedAnns = filteredAnns.slice((page - 1) * rowsPerPage, page * rowsPerPage)
  const pageCount = Math.ceil(filteredAnns.length / rowsPerPage)

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Duyurular Yükleniyor...</Typography> {/* Yüklenme yazısı */}
      </Box>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 'bold',
            color: 'primary.main',
          }}
        >
          Duyuru Yönetimi
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          İş ilanlarını yönetin ve yeni ilanları çekin
        </Typography>
      </Box>

      {/* İş İlanı Çekme Alanı */}
      <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <SearchIcon sx={{ mr: 1, color: 'primary.main' }} />
          Web Scraping - Yeni İş İlanları Çek
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Anahtar kelimeler doğrultusunda farklı iş sitelerinden otomatik ilan çekme
        </Typography>
        
        <Box sx={{ mb: 3, p: 2, bgcolor: 'info.main', color: 'white', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            💡 Kullanım İpuçları:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
            <li>Spesifik teknoloji adları kullanın: "React", "Node.js", "Python"</li>
            <li>Pozisyon adları yazın: "Full Stack Developer", "Frontend Developer"</li>
            <li>Şirket türleri belirtin: "Yazılım Mühendisi", "DevOps Engineer"</li>
            <li>Kombinasyonlar deneyin: "React Node.js", "JavaScript Full Stack"</li>
          </Typography>
        </Box>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Kaynak Seç *</InputLabel>
              <Select
                value={scrapeSource}
                onChange={e => setScrapeSource(e.target.value)}
                label="Kaynak Seç *"
                disabled={scraping}
              >
                <MenuItem value="">-- Kaynak Seçin --</MenuItem>
                <MenuItem value="all">🌐 Tüm Kaynaklar</MenuItem>
                <MenuItem value="kariyernet">🏢 Kariyer.net</MenuItem>
                <MenuItem value="linkedin">💼 LinkedIn</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={8} md={6}>
             <Autocomplete
                freeSolo
                options={suggestedKeywords}
                value={scrapeKeyword}
                onInputChange={(_event, newValue) => { setScrapeKeyword(newValue || ''); }}
                onChange={(_event, newValue) => { setScrapeKeyword(newValue || ''); }}
                disabled={scraping}
                fullWidth
                size="small"
                renderInput={(params) => 
                  <TextField 
                    {...params} 
                    label="Anahtar Kelime *" 
                    placeholder="Örn: React Developer, Full Stack, Python..." 
                    helperText="Önerilerden seçin veya kendi anahtar kelimenizi yazın"
                  />
                }
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box component="li" key={key} {...otherProps}>
                      <Typography variant="body2">{option}</Typography>
                    </Box>
                  );
                }}
              />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
              onClick={handleScrapeJobs}
              disabled={scraping || !scrapeSource || !scrapeKeyword.trim()}
              fullWidth
              startIcon={scraping ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              sx={{ 
                height: '40px',
                background: scraping ? 'grey.400' : 'linear-gradient(45deg, #ff6b35 30%, #f7931e 90%)',
                '&:hover': {
                  background: scraping ? 'grey.400' : 'linear-gradient(45deg, #e55a2b 30%, #e8841b 90%)',
                }
              }}
            >
              {scraping ? 'İşlem Yapılıyor...' : '🌐 Web Scraping'}
            </Button>
            
            <Button
              variant="outlined"
              size="small"
              onClick={handleTestKariyer}
              disabled={scraping}
              sx={{ ml: 1 }}
            >
              🧪 Test
            </Button>
            </Stack>
          </Grid>
        </Grid>

        {/* Enhanced Debug Panel */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
            🔧 Gelişmiş Debug Araçları
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6} sm={3}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                                 onClick={handleTestLinkedin}
                disabled={scraping}
                startIcon={scraping ? <CircularProgress size={16} /> : null}
                sx={{ fontSize: '0.7rem' }}
              >
                💼 Test LinkedIn
              </Button>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={handleFullScrapeTest}
                disabled={scraping}
                startIcon={scraping ? <CircularProgress size={16} /> : null}
                sx={{ fontSize: '0.7rem' }}
              >
                🚀 Full Test
              </Button>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={handleQuickScrape}
                disabled={scraping}
                startIcon={scraping ? <CircularProgress size={16} /> : null}
                sx={{ fontSize: '0.7rem' }}
              >
                ⚡ Quick Scrape
              </Button>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={handleScraperInfo}
                disabled={scraping}
                startIcon={scraping ? <CircularProgress size={16} /> : null}
                sx={{ fontSize: '0.7rem' }}
              >
                Scraper Info
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Duyuru Listesi ve Filtreleme */}
      <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
           <Typography variant="h6">Mevcut Duyurular</Typography>
            <Button
               variant="outlined"
               onClick={() => navigate('/announcements', { replace: true })}
               startIcon={<PublicIcon />}
            >
               Kullanıcı Sayfasına Git
            </Button>
         </Box>

        {/* Filter Inputs */}
        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
           <Grid item xs={12} sm={4}>
               <TextField
                  fullWidth
                  size="small"
                  label="Filtrele: Başlık/Şirket/Lokasyon"
                  value={filterKeyword}
                  onChange={e => setFilterKeyword(e.target.value)}
                  InputProps={{
                     startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.disabled' }} />,
                  }}
               />
           </Grid>
           <Grid item xs={6} sm={4}>
               <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel>Kaynak</InputLabel>
                  <Select
                     value={filterSource}
                     onChange={e => setFilterSource(e.target.value)}
                     label="Kaynak"
                     startAdornment={<FilterListIcon sx={{ mr: 1, color: 'action.disabled' }} />}
                  >
                     <MenuItem value="">Tümü</MenuItem>
                     <MenuItem value="kariyernet">Kariyer.net</MenuItem>
                     <MenuItem value="linkedin">LinkedIn</MenuItem>
                  </Select>
               </FormControl>
           </Grid>
            <Grid item xs={6} sm={4}>
               <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel>Yayın Durumu</InputLabel>
                  <Select
                     value={filterPublished}
                     onChange={e => setFilterPublished(e.target.value)}
                     label="Yayın Durumu"
                     startAdornment={<InfoIcon sx={{ mr: 1, color: 'action.disabled' }} />}
                  >
                     <MenuItem value="">Tümü</MenuItem>
                     <MenuItem value="true">Yayınlandı</MenuItem>
                     <MenuItem value="false">Taslak</MenuItem>
                  </Select>
               </FormControl>
            </Grid>
        </Grid>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredAnns.length === 0 ? (
          <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
            Gösterilecek duyuru bulunamadı.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Başlık</TableCell>
                  <TableCell>Kaynak</TableCell>
                  <TableCell>Yayın Durumu</TableCell>
                   <TableCell>Pozisyon</TableCell>
                   <TableCell>Şirket</TableCell>
                   <TableCell>Lokasyon</TableCell>
                   <TableCell>Çalışma Tipi</TableCell>
                  <TableCell>Yayın Tarihi</TableCell>
                  <TableCell>Anahtar Kelimeler</TableCell>
                  <TableCell align="right">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedAnns.map((ann) => (
                  <TableRow
                    key={ann._id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                         {ann.isPublished ? <PublishedIcon color="success" fontSize="small" sx={{ mr: 0.5 }} /> : <DraftIcon color="warning" fontSize="small" sx={{ mr: 0.5 }} />}
                         {ann.scraped && <Chip label="SCRAPED" size="small" color="info" sx={{ mr: 1, fontSize: '0.7rem', height: '20px' }} />}
                         <Typography variant="body2" fontWeight="medium">{ann.title}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{ann.source}</TableCell>
                    <TableCell>
                       <Chip
                           label={ann.isPublished ? 'Yayınlandı' : 'Taslak'}
                           color={ann.isPublished ? 'success' : 'warning'}
                           size="small"
                       />
                    </TableCell>
                    <TableCell><Typography variant="body2">{ann.position || '-'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{ann.company || '-'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{ann.location || '-'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{ann.jobType || '-'}</Typography></TableCell>
                    <TableCell>{new Date(ann.publishDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {ann.keywords && (
                        <Chip
                          label={ann.keywords.join(', ')}
                          color="primary"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="primary" /* onClick={() => handleEdit(ann)} */ disabled>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteClick(ann)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
        {filteredAnns.length > 0 && (
           <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
               <Pagination
                   count={pageCount}
                   page={page}
                   onChange={(event, value) => setPage(value)}
                   color="primary"
               />
           </Box>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Duyuruyu Sil</DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description">
            {announcementToDelete?.title} başlıklı duyuruyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  )
}
