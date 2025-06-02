import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  useTheme,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Announcement as AnnouncementIcon,
  Chat as ChatIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { stats } from '../services/api';
import { useNotification } from '../context/NotificationContext';

const StatCard = ({ title, value, icon, trend, color }) => {
  const theme = useTheme();
  const isPositive = trend > 0;

  return (
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
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}15`,
              borderRadius: '50%',
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isPositive ? (
              <TrendingUpIcon color="success" fontSize="small" />
            ) : (
              <TrendingDownIcon color="error" fontSize="small" />
            )}
            <Typography
              variant="body2"
              color={isPositive ? 'success.main' : 'error.main'}
              sx={{ fontWeight: 'medium' }}
            >
              {Math.abs(trend)}% {isPositive ? 'artış' : 'azalış'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const RecentActivityItem = ({ title, description, time, icon }) => {
  return (
    <ListItem>
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText
        primary={title}
        secondary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {description}
            </Typography>
            <Chip
              icon={<AccessTimeIcon />}
              label={time}
              size="small"
              variant="outlined"
              sx={{ height: 20 }}
            />
          </Box>
        }
      />
    </ListItem>
  );
};

export default function StatsPage() {
  const theme = useTheme();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    totalUsers: 0,
    totalAnalyses: 0,
    totalAnnouncements: 0,
    totalChats: 0,
    userTrend: 0,
    analysisTrend: 0,
    announcementTrend: 0,
    chatTrend: 0,
    recentActivities: [],
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await stats.getStats();
        setStatsData(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
        showNotification('İstatistikler yüklenemedi', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [showNotification]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 'bold',
            color: 'primary.main',
          }}
        >
          İstatistikler
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Sistem genelindeki aktivite ve kullanım istatistikleri
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* İstatistik Kartları */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Toplam Kullanıcı"
            value={statsData.totalUsers}
            icon={<PeopleIcon sx={{ color: theme.palette.primary.main }} />}
            trend={statsData.userTrend}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Toplam Analiz"
            value={statsData.totalAnalyses}
            icon={<AssessmentIcon sx={{ color: theme.palette.success.main }} />}
            trend={statsData.analysisTrend}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Toplam İlan"
            value={statsData.totalAnnouncements}
            icon={<AnnouncementIcon sx={{ color: theme.palette.warning.main }} />}
            trend={statsData.announcementTrend}
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Toplam Sohbet"
            value={statsData.totalChats}
            icon={<ChatIcon sx={{ color: theme.palette.info.main }} />}
            trend={statsData.chatTrend}
            color={theme.palette.info.main}
          />
        </Grid>

        {/* Son Aktiviteler */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Son Aktiviteler
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List>
                {statsData.recentActivities.map((activity, index) => (
                  <React.Fragment key={index}>
                    <RecentActivityItem
                      title={activity.title}
                      description={activity.description}
                      time={activity.time}
                      icon={
                        activity.type === 'user' ? (
                          <PeopleIcon color="primary" />
                        ) : activity.type === 'analysis' ? (
                          <AssessmentIcon color="success" />
                        ) : activity.type === 'announcement' ? (
                          <AnnouncementIcon color="warning" />
                        ) : (
                          <ChatIcon color="info" />
                        )
                      }
                    />
                    {index < statsData.recentActivities.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
} 