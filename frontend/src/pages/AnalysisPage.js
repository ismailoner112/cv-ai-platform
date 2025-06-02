// src/pages/AnalysisPage.js

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  Box,
  Paper,
  Button,
  Divider,
  CircularProgress,
  Container,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  ListItemButton,
  FormControl,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  useTheme,
} from '@mui/material'
import {
  Add as AddIcon,
  History as HistoryIcon,
  Chat as ChatIcon,
  Delete as DeleteIcon,
  Announcement as AnnouncementIcon,
  Business as BusinessIcon,
  Assessment as AssessmentIcon,
  Menu as MenuIcon,
  Image as ImageIcon,
  Upload as UploadIcon,
  Link as LinkIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
} from '@mui/icons-material'
import { useNotification } from '../context/NotificationContext'
import { analysis } from '../services/api'
import './AnalysisPage.css'

const drawerWidth = 260

export default function AnalysisPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { showNotification } = useNotification()

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode]             = useState('new')      // 'new' | 'history'
  const [history, setHistory]       = useState([])
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)

  // Form & feedback
  const [file, setFile]            = useState(null)
  const [companyUrl, setCompanyUrl] = useState('')
  const [loading, setLoading]        = useState(false)
  const [formErrors, setFormErrors] = useState({})

  // Delete dialog
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [analysisToDelete, setAnalysisToDelete] = useState(null)

  // Loading states
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isAnalysisDetailsLoading, setIsAnalysisDetailsLoading] = useState(false);

  // Sidebar toggle handler
  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // 1) Geçmiş analizleri yükleme fonksiyonunu useCallback ile sarmaladık
  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const response = await analysis.getHistory()
      setHistory(response.data.analyses || [])
    } catch (error) {
      console.error('Analiz geçmişi yüklenemedi:', error)
      showNotification('Analiz geçmişi yüklenemedi', 'error')
      setHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [showNotification])

  // 2) Geçmiş analiz seçme fonksiyonunu useCallback ile sarmaladık
  const handleSelectAnalysis = useCallback(async id => {
    setIsAnalysisDetailsLoading(true);
    setSelectedAnalysis(null);
    try {
      const response = await analysis.getDetails(id);
      setSelectedAnalysis(response.data.analysis);
      setMode('history');
    } catch (error) {
      console.error('Detay yükleme hatası:', error);
      showNotification('Analiz detayları yüklenemedi', 'error');
      setSelectedAnalysis(null);
    } finally {
       setIsAnalysisDetailsLoading(false);
    }
  }, [showNotification, setMode]);

  // 3) Bileşen mount olduğunda bir kez çağır ve geçmişi yükle
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // 4) Mode 'new' olduğunda formu sıfırla
  useEffect(() => {
    if (mode === 'new') {
      setFile(null)
      setCompanyUrl('')
      setSelectedAnalysis(null)
      setFormErrors({})
    }
  }, [mode])

   // Update selected analysis if history changes and the selected one is updated (e.g. status changes)
   useEffect(() => {
    if (selectedAnalysis) {
      const updatedAnalysis = history.find(item => item._id === selectedAnalysis._id);
      if (updatedAnalysis && (updatedAnalysis.status !== selectedAnalysis.status || updatedAnalysis.status !== 'completed')) {
         if (updatedAnalysis.status !== 'pending') {
           handleSelectAnalysis(updatedAnalysis._id);
        } else {
           setSelectedAnalysis(updatedAnalysis);
        }
      }
    }
  }, [history, selectedAnalysis, handleSelectAnalysis]);

  // 5) CV dosyası seçimi
  const handleFileChange = e => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        showNotification('Lütfen PDF dosyası yükleyin', 'error')
        setFile(null);
        return
      }
      setFile(selectedFile)
    } else {
      setFile(null);
    }
    if (formErrors.file) {
      setFormErrors(prev => ({ ...prev, file: '' }));
    }
  }

  const handleUrlChange = e => {
    setCompanyUrl(e.target.value);
    if (formErrors.companyUrl) {
      setFormErrors(prev => ({ ...prev, companyUrl: '' }));
    }
  }

  const validateNewAnalysisForm = () => {
    const errors = {};
    if (!companyUrl.trim() && !file) {
      errors.general = 'Lütfen analiz yapmak için bir Firma URL\'si veya CV dosyası sağlayın.';
    }
    if (companyUrl.trim() && !/^((https?|ftp):\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(companyUrl)) {
      errors.companyUrl = 'Lütfen geçerli bir URL girin.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 6) Yeni analiz başlat
  const handleSubmit = async e => {
    e.preventDefault()

    if (!validateNewAnalysisForm()) {
      return;
    }

    setLoading(true)
    const formData = new FormData()
    if (companyUrl.trim()) {
       formData.append('companyUrl', companyUrl.trim());
    }
    if (file) {
      formData.append('cvFile', file);
    }

    try {
      const response = await analysis.analyze(formData)

      showNotification(response.data.message || 'Analiz isteği gönderildi.', 'info');
      setFile(null);
      setCompanyUrl('');
      setMode('history');
      loadHistory();

    } catch (error) {
      console.error('Analiz isteği hatası:', error)
      const errorMessage = error.response?.data?.message || 'Analiz isteği gönderilirken bir hata oluştu';
      showNotification(errorMessage, 'error')
      if (errorMessage.includes('API Key bulunamadı')) {
         showNotification('Lütfen Gemini API Key\'inizi profilinize ekleyin.', 'warning');
      }
    } finally {
      setLoading(false)
    }
  }

  // 7) Silme işlemi
  const confirmDelete = id => {
    setAnalysisToDelete(id)
    setOpenDeleteDialog(true)
  }
  const handleDelete = async () => {
    setOpenDeleteDialog(false)
    if (!analysisToDelete) return
    try {
      await analysis.deleteAnalysis(analysisToDelete)
      showNotification('Analiz başarıyla silindi', 'success')
      loadHistory()
      if (selectedAnalysis?._id === analysisToDelete) {
        setSelectedAnalysis(null)
      }
    } catch (error) {
      console.error('Silme hatası:', error)
      showNotification('Analiz silinirken bir hata oluştu', 'error')
    } finally {
      setAnalysisToDelete(null)
    }
  }

  // Helper to render analysis results (handling potential errors or missing data)
  const renderAnalysisDetails = (analysisData) => {
    if (isAnalysisDetailsLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}><CircularProgress size={24} /></Box>;
    }

    const hasCoreDetails = analysisData?.serviceArea || analysisData?.projects || analysisData?.technologies || analysisData?.contactInfo || analysisData?.summary;

    if (!analysisData || (!hasCoreDetails && analysisData.probability === undefined && analysisData.suggestions === undefined && !analysisData.error && !analysisData.raw)) {
         return (
           <Box sx={{
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             mt: 3
           }}>
             <AnnouncementIcon sx={{ mr: 1, color: 'red' }} />
             <Typography variant="body1" sx={{ color: 'red' }}>Analiz detayları mevcut değil veya yüklenemedi.</Typography>
           </Box>
         );
    }

    if (analysisData.error) {
      return <Alert severity="error">Analiz hatası: {analysisData.error}</Alert>;
    }
    if (analysisData.raw) {
       return (
          <Box>
             <Alert severity="warning">API yanıtı işlenemedi, ham veri gösteriliyor:</Alert>
             <Paper sx={{ p: 2, mt: 2, overflowX: 'auto' }}>
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                   {JSON.stringify(analysisData.raw, null, 2)}
                </Typography>
             </Paper>
          </Box>
       );
    }

    return (
      <Stack spacing={2} sx={{ mt: 3 }}>
         {analysisData.error && (
             <Alert severity="error">Hata: {analysisData.error}</Alert>
         )}

         {analysisData.summary && (
            <Paper elevation={1} sx={{ p: 2 }}>
               <Typography variant="h6">Özet</Typography>
               <Typography variant="body1">{analysisData.summary}</Typography>
            </Paper>
         )}

         {(analysisData.probability !== undefined && analysisData.probability !== null) && (
             <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="h6">Eşleşme Olasılığı</Typography>
                <Typography variant="body1">{analysisData.probability}%</Typography>
             </Paper>
         )}

         {analysisData.suggestions && analysisData.suggestions.length > 0 && (
            <Paper elevation={1} sx={{ p: 2 }}>
               <Typography variant="h6">İyileştirme Önerileri</Typography>
               <List dense>
                  {analysisData.suggestions.map((item, index) => (
                     <ListItem key={index}>
                         <ListItemIcon><AssessmentIcon /></ListItemIcon>
                         <ListItemText primary={item} />
                     </ListItem>
                  ))}
               </List>
            </Paper>
         )}

         {analysisData.serviceArea && (
            <Paper elevation={1} sx={{ p: 2 }}>
               <Typography variant="h6">Hizmet Alanı</Typography>
               <Typography variant="body1">{analysisData.serviceArea}</Typography>
            </Paper>
         )}

         {analysisData.technologies && analysisData.technologies.length > 0 && (
            <Paper elevation={1} sx={{ p: 2 }}>
               <Typography variant="h6">Teknolojiler</Typography>
               <Typography variant="body1">{analysisData.technologies.join(', ')}</Typography>
            </Paper>
         )}

         {analysisData.projects && analysisData.projects.length > 0 && (
            <Paper elevation={1} sx={{ p: 2 }}>
               <Typography variant="h6">Projeler</Typography>
               <List dense>
                  {analysisData.projects.map((project, index) => (
                     <ListItem key={index}>
                         <ListItemIcon><BusinessIcon /></ListItemIcon>
                         <ListItemText primary={project} />
                     </ListItem>
                  ))}
               </List>
            </Paper>
         )}

         {analysisData.contactInfo && (
            <Paper elevation={1} sx={{ p: 2 }}>
               <Typography variant="h6">İletişim Bilgileri</Typography>
               <Typography variant="body1">{analysisData.contactInfo}</Typography>
            </Paper>
         )}

      </Stack>
    );
  };

  const renderNewAnalysisForm = () => (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Yeni Analiz
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {formErrors.general && (
              <Alert severity="error">{formErrors.general}</Alert>
            )}

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                CV Dosyası
              </Typography>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                fullWidth
                sx={{ mb: 1 }}
              >
                {file ? file.name : 'CV Dosyası Seç'}
                <input
                  type="file"
                  hidden
                  accept=".pdf"
                  onChange={handleFileChange}
                />
              </Button>
              {file && (
                <Typography variant="caption" color="text.secondary">
                  Seçilen dosya: {file.name}
                </Typography>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Firma URL'si
              </Typography>
              <TextField
                fullWidth
                placeholder="https://example.com"
                value={companyUrl}
                onChange={handleUrlChange}
                error={!!formErrors.companyUrl}
                helperText={formErrors.companyUrl}
                InputProps={{
                  startAdornment: <LinkIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                }}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <AssessmentIcon />}
            >
              {loading ? 'Analiz Başlatılıyor...' : 'Analizi Başlat'}
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );

  const renderHistory = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Analiz Geçmişi
        </Typography>
        {isHistoryLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : history.length === 0 ? (
          <Alert severity="info">Henüz analiz yapılmamış.</Alert>
        ) : (
          <Stack spacing={2}>
            {history.map((item) => (
              <Paper
                key={item._id}
                variant="outlined"
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={() => handleSelectAnalysis(item._id)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1">
                      {item.companyUrl || item.filename}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <Chip
                    label={item.status.toUpperCase()}
                    color={
                      item.status === 'completed'
                        ? 'success'
                        : item.status === 'failed'
                        ? 'error'
                        : 'warning'
                    }
                    size="small"
                  />
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Sidebar */}
      <Drawer
        variant="persistent"
        open={sidebarOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { 
            width: drawerWidth, 
            boxSizing: 'border-box', 
            top: 0,
            height: '100vh',
            overflowY: 'auto',
            transition: 'width 0.3s ease-in-out'
          }, 
        }}
      >
        <Box sx={{ height: 64, display: 'flex', alignItems: 'center', px: 2, bgcolor: '#111059', color: '#CCFF00' }}>
           <IconButton
             onClick={handleDrawerToggle}
             sx={{ mr: 2, color: 'inherit' }}
           >
             <MenuIcon />
           </IconButton>
           <Typography variant="h6" sx={{ flexGrow: 1, color: 'inherit' }}>CV_AI</Typography>
        </Box>
        <Divider />
        <List>
          <ListItemButton selected={mode === 'new'} onClick={() => setMode('new')}>
            <ListItemIcon><AddIcon /></ListItemIcon>
            <ListItemText primary="Yeni Analiz" />
          </ListItemButton>
           <ListItemButton selected={mode === 'history'} onClick={() => setMode('history')}>
             <ListItemIcon><HistoryIcon /></ListItemIcon>
             <ListItemText primary="Geçmiş Analizler" />
          </ListItemButton>
          {isHistoryLoading ? (
             <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}><CircularProgress size={24} /></Box>
          ) : history.length > 0 ? (
             history.map((item) => (
              <ListItemButton
                key={item._id}
                selected={selectedAnalysis?._id === item._id}
                onClick={() => handleSelectAnalysis(item._id)}
              >
                <ListItemText
                  primary={`Analiz: ${item.date ? new Date(item.date).toLocaleDateString() : 'Tarih Bilgisi Yok'}`}
                  secondary={`CV: ${item.fileName || 'N/A'}, Şirket: ${item.companyName || 'N/A'}`}
                />
                <ListItemSecondaryAction>
                    <IconButton edge="end" aria-label="delete" onClick={() => confirmDelete(item._id)}>
                        <DeleteIcon />
                    </IconButton>
                </ListItemSecondaryAction>
              </ListItemButton>
            ))
          ) : (
             <Typography variant="body2" color="text.secondary" sx={{ px: 2, mt: 2 }}>Henüz geçmiş analiz yok.</Typography>
          )}
           <ListItemButton onClick={() => navigate('/chat')}>
             <ListItemIcon><ChatIcon /></ListItemIcon>
             <ListItemText primary="Sohbet" secondary="AI ile sohbet" />
          </ListItemButton>
           <ListItemButton onClick={() => navigate('/gallery')}>
             <ListItemIcon><ImageIcon /></ListItemIcon>
             <ListItemText primary="Galeri" secondary="Görsel Analizler" />
          </ListItemButton>
        </List>
      </Drawer>

      {/* Sidebar kapalıyken görünecek buton */}
      {!sidebarOpen && (
         <Box sx={{ position: 'fixed', top: 10, left: 10, zIndex: 1200 }}>
            <IconButton
              onClick={handleDrawerToggle}
              color="primary"
            >
              <MenuIcon />
            </IconButton>
         </Box>
      )}

      {/* Ana İçerik Alanı */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: sidebarOpen ? `${drawerWidth}px` : 0,
          width: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%',
          mt: '64px',
          overflowY: 'auto',
          transition: 'margin-left 0.3s ease-in-out, width 0.3s ease-in-out'
        }}
      >
        <Container maxWidth="md">
          {formErrors.general && (
             <Alert severity="error" sx={{
               mb: 3,
               //'& .MuiAlert-icon': { color: 'red' }, // Sx üzerinden denedik, çalışmadıysa CSS kullanalım
               //'& .MuiAlert-message': { color: 'red' }, // Sx üzerinden denedik, çalışmadıysa CSS kullanalım
             }} className="analysis-error-alert">
               {formErrors.general}
             </Alert>
          )}

          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              {mode === 'new' ? (
                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => setMode('history')}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Geçmiş Analizler
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setMode('new')}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Yeni Analiz
                </Button>
              )}
              {mode === 'history' && renderHistory()}
            </Grid>

            <Grid item xs={12} md={8}>
              {mode === 'new' ? renderNewAnalysisForm() : renderAnalysisDetails(selectedAnalysis)}
            </Grid>
          </Grid>

          <Dialog
            open={openDeleteDialog}
            onClose={() => setOpenDeleteDialog(false)}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle id="alert-dialog-title">{"Analizi Silmeyi Onayla"}</DialogTitle>
            <DialogContent>
              <Typography id="alert-dialog-description">
                Bu analizi kalıcı olarak silmek istediğinizden emin misiniz?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDeleteDialog(false)}>İptal</Button>
              <Button onClick={handleDelete} autoFocus color="error">
                Sil
              </Button>
            </DialogActions>
          </Dialog>

        </Container>
      </Box>
    </Box>
  )
}
