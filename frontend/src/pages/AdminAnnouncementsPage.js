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

  // İş ilanlarını çeken fonksiyon
  const handleScrapeJobs = async () => {
    setScraping(true)
    try {
      // api.js üzerinden iş ilanlarını çekme rotasını çağır
      const res = await jobs.scrape({ source: scrapeSource, keyword: scrapeKeyword })
      if (res.data.success) {
        showNotification(res.data.message || 'İş ilanları başarıyla çekildi.', 'success')
        fetchAnns() // Yeni ilanlar çekildikten sonra duyuruları yeniden çek
      } else {
        showNotification(res.data.message || 'İş ilanları çekilirken hata oluştu.', 'error')
      }
    } catch (err) {
      console.error('İş ilanı çekme hatası:', err)
      showNotification('İş ilanları çekilirken bir hata oluştu.', 'error')
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
        <Typography variant="h6" gutterBottom>
          Yeni İş İlanları Çek
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Kaynak</InputLabel>
              <Select
                value={scrapeSource}
                onChange={e => setScrapeSource(e.target.value)}
                label="Kaynak"
                disabled={scraping}
              >
                <MenuItem value="">Tümü (Desteklenen)</MenuItem>
                <MenuItem value="kariyernet">Kariyer.net</MenuItem>
                <MenuItem value="linkedin">LinkedIn</MenuItem>
                {/* Add other supported sources here */}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={8} md={6}>
             <Autocomplete
                freeSolo
                options={suggestedKeywords}
                value={scrapeKeyword}
                onInputChange={(_event, newValue) => { setScrapeKeyword(newValue); }}
                onChange={(_event, newValue) => { if (newValue) setScrapeKeyword(newValue); else setScrapeKeyword(''); }}
                disabled={scraping}
                fullWidth
                size="small"
                renderInput={(params) => <TextField {...params} label="Anahtar Kelime" placeholder="Örn: React Developer" />}
              />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="contained"
              onClick={handleScrapeJobs}
              disabled={scraping || !scrapeSource || !scrapeKeyword.trim()}
              fullWidth
              startIcon={scraping ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            >
              {scraping ? 'Çekiliyor...' : 'İş İlanlarını Çek'}
            </Button>
          </Grid>
        </Grid>
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
