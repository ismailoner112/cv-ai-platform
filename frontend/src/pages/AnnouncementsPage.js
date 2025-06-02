// src/pages/AnnouncementsPage.js
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Grid, /* Card, CardContent, */ Typography,
  TextField, Button, FormControl, InputLabel, Select,
  MenuItem, Pagination, Box, Chip, IconButton,
  CircularProgress, Alert,
  Drawer, List, ListItemText, ListItemIcon, Divider,
  ListItemButton, Card, CardContent, ListItem,
  Autocomplete, Container, useTheme
} from '@mui/material'
import {
  /* Search as SearchIcon, */
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Chat as ChatIcon,
  Image as ImageIcon,
  Work as WorkIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  School as SchoolIcon,
  Star as StarIcon,
  Business as BusinessIcon
  /* History as HistoryIcon, Announcement as AnnouncementIcon, Menu as MenuIcon */ // Removed unused imports
} from '@mui/icons-material'
import { useNotification } from '../context/NotificationContext'
import { announcements } from '../services/api'

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
]; // Copied from AdminAnnouncementsPage.js

const sources = [
  { value: 'kariyer', label: 'Kariyer.net' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
];

const salaryRanges = [
  { value: '0-5000', label: '0 - 5.000 TL' },
  { value: '5000-10000', label: '5.000 - 10.000 TL' },
  { value: '10000-15000', label: '10.000 - 15.000 TL' },
  { value: '15000-20000', label: '15.000 - 20.000 TL' },
  { value: '20000+', label: '20.000 TL ve üzeri' },
];

const experienceLevels = [
  { value: '0-1', label: '0-1 Yıl' },
  { value: '1-3', label: '1-3 Yıl' },
  { value: '3-5', label: '3-5 Yıl' },
  { value: '5-10', label: '5-10 Yıl' },
  { value: '10+', label: '10+ Yıl' },
];

const educationLevels = [
  { value: 'lise', label: 'Lise' },
  { value: 'onlisans', label: 'Ön Lisans' },
  { value: 'lisans', label: 'Lisans' },
  { value: 'yukseklisans', label: 'Yüksek Lisans' },
  { value: 'doktora', label: 'Doktora' },
];

const drawerWidth = 260;

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [announcementsList, setAnnouncementsList] = useState([])
  const [loading, setLoading]             = useState(false)
  const [scraping, setScraping]           = useState(false)
  const [filters, setFilters]             = useState({
    source: '', /* type: 'iş-ilanı', search: '', */ page: 1, limit: 10 // Simplified filters
  })
  const [pagination, setPagination]       = useState({ total: 0, pages: 1 })
  const { showError, showSuccess }        = useNotification()
  const [keyword, setKeyword] = useState(''); // Add keyword state

  // Yeni filtre state'leri
  const [salaryFilter, setSalaryFilter] = useState(''); // Maaş filtresi
  const [experienceFilter, setExperienceFilter] = useState(''); // Deneyim filtresi
  const [educationFilter, setEducationFilter] = useState(''); // Eğitim filtresi
  const [skillsFilter, setSkillsFilter] = useState(''); // Yetenek filtresi (şimdilik tek input)

  // const [sidebarOpen, setSidebarOpen] = useState(false); // Removed unused state

  const loadAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch announcements from DB with current filters including keyword and new filters
      const res = await announcements.getAll({
        ...filters,
        type: 'iş-ilanı',
        keyword: keyword,
        // Yeni filtreleri ekle
        salary: salaryFilter,
        experience: experienceFilter,
        education: educationFilter,
        skills: skillsFilter,
      });
      setAnnouncementsList(res.data.announcements)
      setPagination(res.data.pagination)
    } catch (err) {
      console.error(err)
      showError('İlanlar yüklenirken hata oluştu.')
    } finally {
      setLoading(false)
    }
  }, [filters, showError, showSuccess, keyword, salaryFilter, experienceFilter, educationFilter, skillsFilter])

  useEffect(() => {
    // Component yüklendiğinde ilanları getir
    loadAnnouncements()
    // filters, loadAnnouncements veya keyword değiştiğinde tekrar yükle
  }, [filters, loadAnnouncements, keyword, salaryFilter, experienceFilter, educationFilter, skillsFilter])

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }))
  }

  const handlePageChange = (_e, page) => {
    setFilters(prev => ({ ...prev, page }))
  }

  // Yeni filtre state'leri için handle fonksiyonları
  const handleSalaryFilterChange = (e) => {
    setSalaryFilter(e.target.value);
    // setFilters(prev => ({ ...prev, salary: e.target.value, page: 1 })); // Direkt filters state'ini güncellemek yerine ayrı state kullanıyoruz
  };

  const handleExperienceFilterChange = (e) => {
    setExperienceFilter(e.target.value);
    // setFilters(prev => ({ ...prev, experience: e.target.value, page: 1 }));
  };

  const handleEducationFilterChange = (e) => {
    setEducationFilter(e.target.value);
    // setFilters(prev => ({ ...prev, education: e.target.value, page: 1 }));
  };

  const handleSkillsFilterChange = (e) => {
    setSkillsFilter(e.target.value);
    // setFilters(prev => ({ ...prev, skills: e.target.value, page: 1 }));
  };

  // This function now just triggers loading announcements from DB with current filters
  const handleListSavedJobs = () => {
    loadAnnouncements();
  };

  const handleScrape = async () => {
    try {
      setScraping(true)
      // Anahtar kelime olmadan sadece kaynağa göre scrape yap
      const res = await announcements.scrape(filters.source, '') // Send empty keyword
      showSuccess(res.data.message)
      // Scraping sonrası listeyi yeniden yükle
      loadAnnouncements()
    } catch (err) {
      console.error(err)
      showError('İlanlar çekilirken hata oluştu.')
    } finally {
      setScraping(false)
    }
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          Is Ilanlari
        </Typography>

        {/* Filters */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  options={suggestedKeywords}
                  value={keyword}
                  onChange={(_, newValue) => setKeyword(newValue || '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Anahtar Kelime"
                      placeholder="Pozisyon, teknoloji veya beceri ara..."
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Kaynak</InputLabel>
                  <Select
                    value={filters.source}
                    label="Kaynak"
                    onChange={(e) => handleFilterChange('source', e.target.value)}
                  >
                    <MenuItem value="">Tümü</MenuItem>
                    {sources.map((source) => (
                      <MenuItem key={source.value} value={source.value}>
                        {source.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Maaş Aralığı</InputLabel>
                  <Select
                    value={salaryFilter}
                    label="Maaş Aralığı"
                    onChange={(e) => setSalaryFilter(e.target.value)}
                  >
                    <MenuItem value="">Tümü</MenuItem>
                    {salaryRanges.map((range) => (
                      <MenuItem key={range.value} value={range.value}>
                        {range.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Deneyim</InputLabel>
                  <Select
                    value={experienceFilter}
                    label="Deneyim"
                    onChange={(e) => setExperienceFilter(e.target.value)}
                  >
                    <MenuItem value="">Tümü</MenuItem>
                    {experienceLevels.map((level) => (
                      <MenuItem key={level.value} value={level.value}>
                        {level.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Eğitim</InputLabel>
                  <Select
                    value={educationFilter}
                    label="Eğitim"
                    onChange={(e) => setEducationFilter(e.target.value)}
                  >
                    <MenuItem value="">Tümü</MenuItem>
                    {educationLevels.map((level) => (
                      <MenuItem key={level.value} value={level.value}>
                        {level.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : announcementsList.length === 0 ? (
          <Alert severity="info" sx={{ my: 4 }}>
            Arama kriterlerinize uygun ilan bulunamadı.
          </Alert>
        ) : (
          <>
            <Grid container spacing={3}>
              {announcementsList.map((announcement) => (
                <Grid item key={announcement._id} xs={12}>
                  <Card
                    sx={{
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[4],
                      },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" component="h2">
                          {announcement.title}
                        </Typography>
                        <IconButton>
                          {announcement.favorite ? (
                            <FavoriteIcon color="error" />
                          ) : (
                            <FavoriteBorderIcon />
                          )}
                        </IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                        <Chip
                          icon={<BusinessIcon />}
                          label={announcement.company}
                          variant="outlined"
                        />
                        <Chip
                          icon={<LocationIcon />}
                          label={announcement.location}
                          variant="outlined"
                        />
                        {announcement.salary && (
                          <Chip
                            icon={<MoneyIcon />}
                            label={announcement.salary}
                            variant="outlined"
                          />
                        )}
                        {announcement.education && (
                          <Chip
                            icon={<SchoolIcon />}
                            label={announcement.education}
                            variant="outlined"
                          />
                        )}
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {announcement.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Pagination */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={pagination.pages}
                page={filters.page}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          </>
        )}
      </Box>
    </Container>
  );
}
