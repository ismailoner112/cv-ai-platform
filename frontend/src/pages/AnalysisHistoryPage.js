// src/pages/AnalysisHistoryPage.js
import React, { useState, useRef } from 'react';
import {
  Box, Drawer, List, ListItem, ListItemText,
  IconButton, Typography, Paper, Button
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const drawerWidth = 240;

const AnalysisHistoryPage = () => {
  // örnek veri
  const [history, setHistory] = useState([
    {
      id: 1,
      date: '19.05.2025 18:19:14',
      companyAnalysis: ['Hizmet A', 'Hizmet B'],
      cvAnalysis: ['JS', 'CSS'],
      matchScore: 85,
      recommendations: ['Öneri 1', 'Öneri 2']
    },
    // .. diğer geçmiş analizler
  ]);

  const [selected, setSelected] = useState(null);
  const detailRef = useRef(null);

  const handleDownload = () => {
    if (!detailRef.current) return;
    html2canvas(detailRef.current).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`analysis-${selected.date}.pdf`);
    });
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* SideBar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' }
        }}
      >
        <Typography variant="h6" sx={{ m: 2 }}>Geçmiş Analizler</Typography>
        <List>
          {history.map(item => (
            <ListItem
              button
              key={item.id}
              selected={selected?.id === item.id}
              onClick={() => setSelected(item)}
            >
              <ListItemText primary={item.date} />
              <IconButton edge="end" onClick={() => {/* düzenle/sil logic */}}>
                <MoreVertIcon />
              </IconButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* İçerik */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {selected ? (
          <Paper ref={detailRef} sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h5" gutterBottom>
              Analiz Detayı: {selected.date}
            </Typography>

            <Typography variant="h6">Firma Analizi</Typography>
            <Typography>{selected.companyAnalysis.join(', ')}</Typography>

            <Typography variant="h6" sx={{ mt: 2 }}>CV Analizi</Typography>
            <Typography>{selected.cvAnalysis.join(', ')}</Typography>

            <Typography variant="h6" sx={{ mt: 2 }}>
              Eşleşme Skoru: {selected.matchScore}%
            </Typography>

            <Typography variant="h6" sx={{ mt: 2 }}>Öneriler</Typography>
            <List>
              {selected.recommendations.map((rec, i) => (
                <ListItem key={i} sx={{ pl: 0 }}>
                  <ListItemText primary={`• ${rec}`} />
                </ListItem>
              ))}
            </List>

            <Button
              variant="contained"
              color="primary"
              onClick={handleDownload}
              sx={{ mt: 3 }}
            >
              PDF İndir
            </Button>
          </Paper>
        ) : (
          <Typography variant="h6" align="center" sx={{ mt: 10 }}>
            Soldan bir analiz seçin
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default AnalysisHistoryPage;
