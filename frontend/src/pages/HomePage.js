// src/pages/HomePage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Work as WorkIcon,
  Chat as ChatIcon,
  Image as ImageIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';

const features = [
  {
    title: 'Is Ilanlari',
    description: 'Guncel is ilanlarini kesfedin ve kariyer firsatlarini yakalayin.',
    icon: <WorkIcon sx={{ fontSize: 40 }} />,
    path: '/announcements',
  },
  {
    title: 'Sohbet',
    description: 'Yapay zeka destekli sohbet asistanimizla CV\'nizi gelistirin.',
    icon: <ChatIcon sx={{ fontSize: 40 }} />,
    path: '/chat',
  },
  {
    title: 'Galeri',
    description: 'Profesyonel CV sablonlarini inceleyin ve ilham alin.',
    icon: <ImageIcon sx={{ fontSize: 40 }} />,
    path: '/gallery',
  },
  {
    title: 'Analiz',
    description: 'CV\'nizi analiz edin ve gelistirme onerileri alin.',
    icon: <AnalyticsIcon sx={{ fontSize: 40 }} />,
    path: '/analysis',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Container maxWidth="lg">
      {/* Hero Section */}
      <Box
        sx={{
          pt: 8,
          pb: 6,
          textAlign: 'center',
        }}
      >
        <Typography
          component="h1"
          variant="h2"
          color="primary"
          gutterBottom
          sx={{
            fontWeight: 'bold',
            mb: 2,
          }}
        >
          CV AI ile Kariyerinizi Gelistirin
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Yapay zeka destekli CV asistanimiz ile kariyer yolculugunuzda size rehberlik ediyoruz.
          Is ilanlarini kesfedin, CV\'nizi gelistirin ve kariyer firsatlarini yakalayin.
        </Typography>
      </Box>

      {/* Features Grid */}
      <Grid container spacing={4} sx={{ mb: 8 }}>
        {features.map((feature) => (
          <Grid item key={feature.title} xs={12} sm={6} md={3}>
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
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    mb: 2,
                    color: 'primary.main',
                  }}
                >
                  {feature.icon}
                </Box>
                <Typography gutterBottom variant="h5" component="h2">
                  {feature.title}
                </Typography>
                <Typography color="text.secondary" paragraph>
                  {feature.description}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate(feature.path)}
                  sx={{ mt: 2 }}
                >
                  Kesfet
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Call to Action */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          p: 6,
          borderRadius: 2,
          textAlign: 'center',
          mb: 8,
        }}
      >
        <Typography variant="h4" gutterBottom>
          Hemen Baslayin
        </Typography>
        <Typography variant="body1" paragraph>
          CV AI ile kariyerinizi bir ust seviyeye tasiyin. Ucretsiz hesap olusturun ve tum ozelliklere erisin.
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={() => navigate('/auth')}
          sx={{ mt: 2 }}
        >
          Ucretsiz Hesap Olustur
        </Button>
      </Box>
    </Container>
  );
}
