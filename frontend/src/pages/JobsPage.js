import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Button,
  CircularProgress,
  Alert,
  Autocomplete,
  Stack,
  IconButton,
  Link
} from '@mui/material';
import {
  Search as SearchIcon,
  Work as WorkIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  AccessTime as TimeIcon,
  Visibility as ViewIcon,
  Launch as LaunchIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';
import { jobsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

const JobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [keywords, setKeywords] = useState({ popular: [], trending: [] });
  const [categories, setCategories] = useState({ sources: [], locations: [], companies: [] });
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [sortBy, setSortBy] = useState('publishDate');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  
  const itemsPerPage = 12;

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load jobs when filters change
  useEffect(() => {
    if (searchTerm || selectedSource || selectedLocation || selectedCompany) {
      searchJobs();
    } else {
      loadRecentJobs();
    }
  }, [searchTerm, selectedSource, selectedLocation, selectedCompany, sortBy, currentPage]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [statsRes, keywordsRes, categoriesRes] = await Promise.all([
        jobsAPI.getJobStats(),
        jobsAPI.getPopularKeywords(),
        jobsAPI.getJobCategories()
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (keywordsRes.data.success) setKeywords(keywordsRes.data.data);
      if (categoriesRes.data.success) setCategories(categoriesRes.data.data);

      await loadRecentJobs();
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      toast.error('Sayfa verileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentJobs = async () => {
    try {
      const response = await jobsAPI.getRecentJobs(itemsPerPage);
      if (response.data.success) {
        setJobs(response.data.data);
        setPagination({
          page: 1,
          limit: itemsPerPage,
          total: response.data.total,
          pages: Math.ceil(response.data.total / itemsPerPage)
        });
      }
    } catch (error) {
      console.error('Son ilanlar yükleme hatası:', error);
      toast.error('İş ilanları yüklenirken hata oluştu');
    }
  };

  const searchJobs = async () => {
    setSearchLoading(true);
    try {
      const params = {
        keyword: searchTerm,
        source: selectedSource,
        location: selectedLocation,
        company: selectedCompany,
        sortBy,
        page: currentPage,
        limit: itemsPerPage
      };

      // Remove empty parameters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await jobsAPI.searchJobs(params);
      
      if (response.data.success) {
        setJobs(response.data.data);
        setPagination(response.data.pagination);
      } else {
        toast.error('Arama sonucu bulunamadı');
        setJobs([]);
      }
    } catch (error) {
      console.error('Arama hatası:', error);
      toast.error('Arama işlemi sırasında hata oluştu');
      setJobs([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    searchJobs();
  };

  const handleKeywordClick = (keyword) => {
    setSearchTerm(keyword);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSource('');
    setSelectedLocation('');
    setSelectedCompany('');
    setCurrentPage(1);
    loadRecentJobs();
  };

  const JobCard = ({ job }) => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {job.title}
          </Typography>
          <Chip 
            label={job.source} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        </Box>

        <Box display="flex" alignItems="center" mb={1} gap={0.5}>
          <BusinessIcon color="action" fontSize="small" />
          <Typography variant="body2" color="text.secondary">
            {job.company}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" mb={2} gap={0.5}>
          <LocationIcon color="action" fontSize="small" />
          <Typography variant="body2" color="text.secondary">
            {job.location}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {job.description}
        </Typography>

        {job.keywords && job.keywords.length > 0 && (
          <Box mb={2}>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              {job.keywords.slice(0, 4).map((keyword, index) => (
                <Chip
                  key={index}
                  label={keyword}
                  size="small"
                  variant="outlined"
                  color="secondary"
                  onClick={() => handleKeywordClick(keyword)}
                  sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                />
              ))}
              {job.keywords.length > 4 && (
                <Chip
                  label={`+${job.keywords.length - 4}`}
                  size="small"
                  variant="outlined"
                  color="default"
                />
              )}
            </Stack>
          </Box>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center" mt="auto">
          <Box display="flex" alignItems="center" gap={1}>
            <TimeIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(new Date(job.publishDate), { addSuffix: true, locale: tr })}
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            {job.views > 0 && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <ViewIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {job.views}
                </Typography>
              </Box>
            )}
            
            <IconButton
              component={Link}
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              color="primary"
            >
              <LaunchIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
          <WorkIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          İş İlanları
        </Typography>
        
        {/* Stats */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h5" color="primary.main" fontWeight="bold">
                {stats.totalJobs || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Toplam İlan
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h5" color="success.main" fontWeight="bold">
                {stats.todayJobs || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bugün
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h5" color="info.main" fontWeight="bold">
                {stats.totalCompanies || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Şirket
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h5" color="warning.main" fontWeight="bold">
                {stats.totalSources || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Kaynak
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSearch}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Anahtar Kelime"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Kaynak</InputLabel>
                <Select
                  value={selectedSource}
                  label="Kaynak"
                  onChange={(e) => setSelectedSource(e.target.value)}
                >
                  <MenuItem value="">Tümü</MenuItem>
                  {categories.sources.map((source) => (
                    <MenuItem key={source.source} value={source.source}>
                      {source.source} ({source.count})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <Autocomplete
                options={categories.locations.map(loc => loc.location)}
                value={selectedLocation}
                onChange={(e, newValue) => setSelectedLocation(newValue || '')}
                renderInput={(params) => (
                  <TextField {...params} label="Konum" />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Sırala</InputLabel>
                <Select
                  value={sortBy}
                  label="Sırala"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="publishDate">Tarihe Göre</MenuItem>
                  <MenuItem value="title">Başlığa Göre</MenuItem>
                  <MenuItem value="company">Şirkete Göre</MenuItem>
                  <MenuItem value="views">Görüntülenmeye Göre</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <Stack direction="row" spacing={1}>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={searchLoading}
                  startIcon={searchLoading ? <CircularProgress size={16} /> : <SearchIcon />}
                >
                  Ara
                </Button>
                <Button
                  variant="outlined"
                  onClick={clearFilters}
                  disabled={searchLoading}
                >
                  Temizle
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Card>

      {/* Popular Keywords */}
      {keywords.trending && keywords.trending.length > 0 && (
        <Card sx={{ p: 2, mb: 3 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <TrendingIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight="600">
              Popüler Anahtar Kelimeler
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {keywords.trending.slice(0, 15).map((item, index) => (
              <Chip
                key={index}
                label={`${item.keyword} (${item.count})`}
                variant="outlined"
                color="primary"
                onClick={() => handleKeywordClick(item.keyword)}
                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'primary.50' } }}
              />
            ))}
          </Stack>
        </Card>
      )}

      {/* Job Listings */}
      {jobs.length === 0 && !searchLoading ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography>
            {searchTerm || selectedSource || selectedLocation || selectedCompany
              ? 'Arama kriterlerinize uygun iş ilanı bulunamadı.'
              : 'Henüz hiç iş ilanı yok.'}
          </Typography>
        </Alert>
      ) : (
        <>
          <Grid container spacing={3}>
            {jobs.map((job) => (
              <Grid item xs={12} sm={6} lg={4} key={job._id}>
                <JobCard job={job} />
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={pagination.pages}
                page={pagination.page}
                onChange={(e, page) => setCurrentPage(page)}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}

      {searchLoading && (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      )}
    </Container>
  );
};

export default JobsPage; 