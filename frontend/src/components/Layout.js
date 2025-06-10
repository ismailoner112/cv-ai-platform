// src/components/Layout.js
import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { AppBar, Toolbar, IconButton, Typography, Box, Badge, Menu, MenuItem } from '@mui/material'
import Sidebar from './Sidebar'
import { io } from 'socket.io-client'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Work as WorkIcon,
  Chat as ChatIcon,
  Image as ImageIcon,
  Analytics as AnalyticsIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'

const drawerWidth = 260

const menuItems = [
  { text: 'Ana Sayfa', icon: <HomeIcon />, path: '/dashboard' },
  { text: 'Duyurular', icon: <WorkIcon />, path: '/announcements' },
  { text: 'İş İlanları', icon: <WorkIcon />, path: '/jobs' },
  { text: 'Sohbet', icon: <ChatIcon />, path: '/chat' },
  { text: 'Galeri', icon: <ImageIcon />, path: '/gallery' },
  { text: 'Analiz', icon: <AnalyticsIcon />, path: '/analysis' },
]

const adminMenuItems = [
  { text: 'İlan Yönetimi', icon: <WorkIcon />, path: '/admin/announcements' },
  { text: 'Kullanıcı Yönetimi', icon: <PersonIcon />, path: '/admin/users' },
  { text: 'Şablon Yönetimi', icon: <ImageIcon />, path: '/admin/templates' },
  { text: 'Ziyaretçi İstatistikleri', icon: <AnalyticsIcon />, path: '/stats' },
]

export default function Layout() {
  const [onlineCount, setOnlineCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  useEffect(() => {
    // Backend Socket.IO sunucusuna bağlan
    const socket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001', {
      transports: ['websocket'],
      withCredentials: true
    })

    // 'onlineUsers' event'ini dinle
    socket.on('onlineUsers', count => {
      setOnlineCount(count)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/auth')
      handleProfileMenuClose()
    } catch (error) {
      console.error('Logout error:', error)
      // Logout başarısız olsa bile auth sayfasına yönlendir
      navigate('/auth')
      handleProfileMenuClose()
    }
  }

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="h6" noWrap component="div">
          {user?.role === 'admin' ? 'Admin Panel' : 'CV AI'}
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path)
                if (isMobile) setMobileOpen(false)
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      {user?.role === 'admin' && (
        <>
          <Divider />
          <List>
            <ListItem>
              <ListItemIcon>
                <AdminIcon />
              </ListItemIcon>
              <ListItemText primary="Admin Menüsü" />
            </ListItem>
            {adminMenuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => {
                    navigate(item.path)
                    if (isMobile) setMobileOpen(false)
                  }}
                >
                  <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === location.pathname)?.text || 
             adminMenuItems.find(item => item.path === location.pathname)?.text || 
             'CV AI'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {user?.name} {user?.surname}
            </Typography>
            <IconButton
              color="inherit"
              onClick={handleProfileMenuOpen}
              sx={{ p: 0 }}
            >
              <AccountCircleIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Çıkış Yap
        </MenuItem>
      </Menu>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar /> {/* This creates space for the AppBar */}
        <Outlet />
      </Box>
    </Box>
  )
}
