import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Box,
  Pagination,
  Button,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Link
} from '@mui/material';
import {
  Work as WorkIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  AccessTime as TimeIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';
import { jobsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

const JobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [scrapingGroups, setScrapingGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  
  const itemsPerPage = 12;

  // Load initial data
  useEffect(() => {
    loadJobs();
    loadStats();
    loadScrapingGroups();
  }, [currentPage, selectedGroup]);

  const loadStats = async () => {
    try {
      const statsRes = await jobsAPI.getJobStats();
      if (statsRes.data.success) setStats(statsRes.data.data);
    } catch (error) {
      console.error('İstatistik yükleme hatası:', error);
    }
  };

  const loadScrapingGroups = async () => {
    try {
      console.log('🔍 Scraping grupları yükleniyor...');
      const response = await jobsAPI.getScrapingGroups();
      console.log('📊 Scraping grupları yanıtı:', response.data);
      if (response.data.success) {
        setScrapingGroups(response.data.data);
        console.log('✅ Scraping grupları yüklendi:', response.data.data.length, 'grup');
      } else {
        console.log('❌ Scraping grupları başarısız:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Scraping grupları yükleme hatası:', error);
      console.error('❌ Hata detayı:', error.response?.data);
    }
  };

  const loadJobs = async () => {
    setLoading(true);
    try {
      const searchParams = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy: 'publishDate'
      };

      // Eğer belirli bir grup seçilmişse, o gruptan filtreleme yap
      if (selectedGroup) {
        searchParams.keyword = selectedGroup;
      }

      console.log('📞 API Çağrısı yapılıyor:', searchParams);
      const response = await jobsAPI.searchJobs(searchParams);
      console.log('📬 API Yanıtı:', response.data);
      
      if (response.data.success) {
        setJobs(response.data.data);
        setPagination(response.data.pagination);
        console.log('✅ İş ilanları yüklendi:', response.data.data.length, 'adet');
      } else {
        setJobs([]);
        toast.error('İş ilanları yüklenemedi');
        console.log('❌ API başarısız:', response.data.message);
      }
    } catch (error) {
      console.error('❌ İş ilanları yükleme hatası:', error);
      console.error('❌ Hata detayı:', error.response?.data);
      toast.error('İş ilanları yüklenirken hata oluştu');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };

  const handleGroupClick = (searchTerm) => {
    setSelectedGroup(searchTerm);
    setCurrentPage(1);
  };

  const clearGroupFilter = () => {
    setSelectedGroup(null);
    setCurrentPage(1);
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
            {job.company && job.company !== 'Şirket Adı (Detayda)' && !job.company.includes('(Detayda)') 
              ? job.company 
              : 'Şirket bilgisi mevcut değil'}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" mb={2} gap={0.5}>
          <LocationIcon color="action" fontSize="small" />
          <Typography variant="body2" color="text.secondary">
            {job.location && job.location !== 'Lokasyon (Detayda)' && !job.location.includes('(Detayda)')
              ? job.location 
              : 'Konum bilgisi mevcut değil'}
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

          <Box display="flex" gap={1}>
            <IconButton
              size="small"
              color="primary"
              component={Link}
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ '&:hover': { backgroundColor: 'primary.light', color: 'white' } }}
            >
              <LaunchIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
          <WorkIcon sx={{ mr: 2, fontSize: 'inherit' }} />
          İş İlanları
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Güncel iş fırsatlarını keşfedin
        </Typography>
        
        {/* Selected Group Info */}
        {selectedGroup && (
          <Box mt={2}>
            <Chip
              label={`Seçili Kategori: ${selectedGroup}`}
              color="primary"
              variant="filled"
              onDelete={clearGroupFilter}
              sx={{ fontSize: '1rem', py: 2 }}
            />
          </Box>
        )}
      </Box>

      {/* Stats */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {stats.totalJobs || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Toplam İlan
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="secondary" fontWeight="bold">
                {stats.todayJobs || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bugünkü Yeni İlanlar
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {stats.totalCompanies || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Şirket
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main" fontWeight="bold">
                {stats.totalSources || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Kaynak
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Scraping Groups */}
      {scrapingGroups.length > 0 && !loading && (
        <Card sx={{ mb: 4, p: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            İş İlanı Kategorileri
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Eklenen iş ilanı kategorilerine göz atın:
          </Typography>
          <Grid container spacing={2}>
            {scrapingGroups.map((group, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: selectedGroup === group.searchTerm ? '2px solid' : '1px solid',
                    borderColor: selectedGroup === group.searchTerm ? 'primary.main' : 'divider',
                    backgroundColor: selectedGroup === group.searchTerm ? 'primary.50' : 'background.paper',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                      borderColor: 'primary.main'
                    }
                  }}
                  onClick={() => handleGroupClick(group.searchTerm)}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {group.title}
                    </Typography>
                    <Chip
                      label={`${group.count} ilan`}
                      color="primary"
                      size="small"
                      variant="outlined"
                    />
                    {group.sources && group.sources.length > 0 && (
                      <Box mt={1}>
                        <Typography variant="caption" color="text.secondary">
                          Kaynaklar: {group.sources.join(', ')}
                        </Typography>
                      </Box>
                    )}
                    {group.lastScraped && (
                      <Box mt={1}>
                        <Typography variant="caption" color="text.secondary">
                          Son güncelleme: {formatDistanceToNow(new Date(group.lastScraped), { addSuffix: true, locale: tr })}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Jobs Grid */}
      {!loading && (
        <>
                     {jobs.length === 0 ? (
             <Alert severity="info" sx={{ my: 4 }}>
               <Typography variant="h6" gutterBottom>
                 {selectedGroup ? `"${selectedGroup}" Kategorisinde İş İlanı Bulunamadı` : 'Henüz İş İlanı Bulunamadı'}
               </Typography>
               <Typography>
                 {selectedGroup 
                   ? `Bu kategoride henüz iş ilanı bulunmuyor. Diğer kategorileri deneyebilirsiniz.`
                   : 'Admin tarafından yeni iş ilanları eklendiğinde burada görüntülenecektir.'
                 }
               </Typography>
               {selectedGroup && (
                 <Button
                   variant="outlined"
                   onClick={clearGroupFilter}
                   sx={{ mt: 2 }}
                 >
                   Tüm İlanları Görüntüle
                 </Button>
               )}
             </Alert>
          ) : (
            <>
              <Grid container spacing={3}>
                {jobs.map((job) => (
                  <Grid item xs={12} sm={6} md={4} key={job._id || job.url}>
                    <JobCard job={job} />
                  </Grid>
                ))}
              </Grid>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <Box display="flex" justifyContent="center" mt={4}>
                  <Pagination
                    count={pagination.pages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                  />
                </Box>
              )}
            </>
          )}
        </>
      )}
    </Container>
  );
};

export default JobsPage; 