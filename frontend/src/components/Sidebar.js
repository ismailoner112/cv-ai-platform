// src/components/Sidebar.js
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import UploadIcon from '@mui/icons-material/Upload';
import { Link } from 'react-router-dom'

import BarChartIcon from '@mui/icons-material/BarChart';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import ChatIcon from '@mui/icons-material/Chat';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import DescriptionIcon  from '@mui/icons-material/Description';
import AnnouncementIcon from '@mui/icons-material/Announcement';

const menuItems = [
  { text: 'Yeni Analiz', icon: <AddIcon />, path: '/analysis' },
  { text: 'Geçmiş Analizler', icon: <HistoryIcon />, path: '/history' },
  { text: 'Sohbet Et', icon: <ChatIcon />, path: '/chat' },
  { text: 'İstatistikler', icon: <BarChartIcon />, path: '/stats' },
  { text: 'Galeri', icon: <PhotoLibraryIcon />,    path: '/gallery' },
  { text: 'Galeri Yükle', icon: <UploadIcon />, path: '/gallery/admin' },
  { text: 'Duyurular',          icon: <AnnouncementIcon />,      path: '/announcements' },
  { text: 'Duyuru Yönetimi',    icon: <ManageAccountsIcon />,     path: '/announcements/admin' },
 { text: 'Yeni Duyuru',       icon: <AddIcon />,            path: '/announcements/admin/create' },
 { text: 'Şablon İndir',     icon: <PhotoLibraryIcon />, path: '/gallery' },
 { text: 'Şablon Yönetimi',  icon: <DescriptionIcon />,    path: '/gallery/admin' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <Drawer variant="permanent" sx={{ width: 240, flexShrink: 0 }}>
      <Toolbar />
      <List>
        <ListItem button component={Link} to="/stats">
          <ListItemText primary="İstatistikler" />
        </ListItem>
        {menuItems.map(({ text, icon, path }) => (
          <ListItemButton
            key={text}
            selected={pathname === path}
            onClick={() => navigate(path)}
          >
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText primary={text} />
          </ListItemButton>
          
        ))}
      </List>
    </Drawer>
  );
}
