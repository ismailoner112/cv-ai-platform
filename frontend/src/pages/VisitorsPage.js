import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { visitors } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import io from 'socket.io-client';
import {
  Box,
  Button,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  useTheme,
  Chip,
} from '@mui/material';
import { PeopleOutline as OnlineIcon } from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function VisitorsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    const socket = io(API_URL, {
      transports: ['websocket'],
      withCredentials: true,
    });

    socket.on('onlineUsers', (count) => {
      setOnlineUsers(count);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    visitors
      .getStats()
      .then((res) => {
        setStats(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching visitor stats:', err);
        setError(err);
        setLoading(false);
      });
  }, []);

  const generalStatsData = stats
    ? [
        { name: 'Toplam Ziyaret', Sayi: stats.totalVisits },
        { name: 'Son 24 Saat Tekil', Sayi: stats.unique24 },
        { name: 'Son 7 Gün Tekil', Sayi: stats.unique7d },
        { name: 'Son 30 Gün Tekil', Sayi: stats.unique30d },
      ]
    : [];

  const pageStatsData = stats
    ? stats.pageStats.map((page) => ({
        name: page.page,
        'Toplam Ziyaret': page.visits,
        'Tekil Ziyaretçi': page.uniqueVisits,
      }))
    : [];

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
          Ziyaretçi İstatistikleri
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Web sitesi ziyaretçi aktivitesi ve istatistikleri
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ my: 4 }}>
          İstatistikler yüklenirken bir hata oluştu: {error.message}
        </Alert>
      ) : (
        <Grid container spacing={4}>
          {/* Online Users */} {/* Keeping online users display here for visibility */}
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Chip
                icon={<OnlineIcon />}
                label={`Online Kullanıcı Sayısı: ${onlineUsers}`}
                color="primary"
                variant="outlined"
                sx={{ fontSize: '1.1rem', p: 2, height: 'auto' }}
              />
            </Box>
          </Grid>

          {/* General Stats */}
          {stats && ( // Check if stats is not null
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Genel İstatistikler
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={generalStatsData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Sayi" fill={theme.palette.primary.main} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Page Stats */}
          {stats && ( // Check if stats is not null
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Sayfa Bazlı İstatistikler
                  </Typography>
                  {stats.pageStats.length === 0 ? (
                    <Typography variant="body1" color="text.secondary" align="center">
                      Henüz sayfa istatistiği yok.
                    </Typography>
                  ) : (
                    <Box sx={{ height: 400 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={pageStatsData}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Toplam Ziyaret" fill={theme.palette.secondary.main} />
                          <Bar dataKey="Tekil Ziyaretçi" fill={theme.palette.warning.main} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

       {/* Moved Home link here, other admin links are in Layout */}
       <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/dashboard', { replace: true })}
          >
            Ana Sayfaya Git
          </Button>
        </Box>
    </Container>
  );
}

export default VisitorsPage; 