// src/pages/ChatPage.js
import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  IconButton,
  Drawer,
  Divider,
  ListItemButton,
  Alert,
  ListItemIcon,
  Container,
  useTheme,
  Avatar
} from '@mui/material'
import {
    ArrowBack as ArrowBackIcon,
    Send as SendIcon,
    Announcement as AnnouncementIcon,
    SmartToy as BotIcon,
    Person as PersonIcon
} from '@mui/icons-material'
import { chat } from '../services/api'
import './ChatPage.css'

const drawerWidth = 260

const ChatPage = () => {
  const navigate = useNavigate()
  const theme = useTheme()
  const [messages, setMessages] = useState([
    { text: 'Merhaba! Size nasıl yardımcı olabilirim?', sender: 'ai' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const [mode, setMode] = useState('new')
  const [chatHistory, setChatHistory] = useState([])
  const [selectedOldChat, setSelectedOldChat] = useState(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (input.trim() === '' || loading) return

    const userMessage = { text: input, sender: 'user' }
    setMessages(prevMessages => [...prevMessages, userMessage])
    setInput('')
    setLoading(true)

    console.log('Sending message to AI:', input)

    try {
      const res = await chat.sendMessage([{ text: userMessage.text }]);
      const reply = res.data.reply || res.data.result || '...'
      const aiMessage = { text: reply, sender: 'ai' }

      setMessages(prevMessages => [...prevMessages, aiMessage])
    } catch (err) {
      console.error('Error sending message:', err)
      setMessages(prevMessages => [...prevMessages, { text: 'Üzgünüm, mesaj gönderilirken bir hata oluştu.', sender: 'ai' }])
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (event) => {
    setInput(event.target.value)
  }

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const handleModeChange = (newMode) => {
    setMode(newMode)
    if (newMode === 'new') {
      setMessages([{ text: 'Merhaba! Size nasıl yardımcı olabilirim?', sender: 'ai' }])
      setSelectedOldChat(null)
    } else if (newMode === 'history'){
      console.log('Loading chat history...')
      setChatHistory([]);
      setSelectedOldChat(null)
    }
  }

  const renderMainContent = () => {
    if (mode === 'new') {
      return (
        <Container maxWidth="md" sx={{ height: '100%', py: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h4" gutterBottom align="center" color="primary" sx={{ mb: 4 }}>
              AI ile Sohbet
            </Typography>

            <Paper
              elevation={3}
              sx={{
                flexGrow: 1,
                overflowY: 'auto',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                mb: 2,
                bgcolor: 'background.default',
              }}
            >
              <List sx={{ flexGrow: 1 }}>
                {messages.map((msg, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      padding: '8px 0',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        maxWidth: '70%',
                        gap: 1,
                      }}
                    >
                      {msg.sender === 'ai' && (
                        <Avatar
                          sx={{
                            bgcolor: 'primary.main',
                            width: 32,
                            height: 32,
                          }}
                        >
                          <BotIcon />
                        </Avatar>
                      )}
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: msg.sender === 'user' ? '20px 20px 0 20px' : '20px 20px 20px 0',
                          bgcolor: msg.sender === 'user' ? 'primary.main' : 'grey.100',
                          color: msg.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          boxShadow: 1,
                        }}
                      >
                        <Typography variant="body1">{msg.text}</Typography>
                      </Box>
                      {msg.sender === 'user' && (
                        <Avatar
                          sx={{
                            bgcolor: 'secondary.main',
                            width: 32,
                            height: 32,
                          }}
                        >
                          <PersonIcon />
                        </Avatar>
                      )}
                    </Box>
                  </ListItem>
                ))}
                {loading && (
                  <ListItem sx={{ justifyContent: 'flex-start', padding: '8px 0' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 2,
                        borderRadius: '20px 20px 20px 0',
                        bgcolor: 'grey.100',
                        boxShadow: 1,
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: 'primary.main',
                          width: 32,
                          height: 32,
                        }}
                      >
                        <BotIcon />
                      </Avatar>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      <Typography variant="body1">Yapay zeka yanıtlıyor...</Typography>
                    </Box>
                  </ListItem>
                )}
                <div ref={messagesEndRef} />
              </List>
            </Paper>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'background.paper',
                p: 2,
                borderRadius: 2,
                boxShadow: 1,
              }}
            >
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Mesajınızı yazın..."
                value={input}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                disabled={loading}
                multiline
                maxRows={4}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleSend}
                disabled={loading || input.trim() === ''}
                sx={{
                  minWidth: 48,
                  height: 48,
                  borderRadius: 2,
                }}
              >
                {loading ? <CircularProgress size={24} /> : <SendIcon />}
              </Button>
            </Box>
          </Box>
        </Container>
      )
    } else if (mode === 'history') {
      if (selectedOldChat) {
        return (
          <Paper elevation={3} sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <IconButton onClick={() => setSelectedOldChat(null)} sx={{ mr: 1 }}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h6">{selectedOldChat.title}</Typography>
            </Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}><CircularProgress size={24} /></Box>
            ) : selectedOldChat.error ? (
              <Alert severity="error">{selectedOldChat.error}</Alert>
            ) : (
              <List sx={{ flexGrow: 1 }}>
                {selectedOldChat.messages?.map((msg, index) => (
                  <ListItem key={index} sx={{ justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', padding: '4px 0' }}>
                    <Box sx={{
                      maxWidth: '70%%',
                      p: 1.5,
                      borderRadius: msg.sender === 'user' ? '15px 15px 0 15px' : '15px 15px 15px 0',
                      bgcolor: msg.sender === 'user' ? '#e0e0e0' : '#111059',
                      color: msg.sender === 'user' ? '#000' : '#fff',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}>
                      <Typography variant="body1">{msg.text}</Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        )
      } else {
        return (
          <Paper elevation={3} sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', mb: 2 }}>
            <Typography variant="h6" gutterBottom>Geçmiş Sohbetler</Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}><CircularProgress size={24} /></Box>
            ) : chatHistory.length > 0 ? (
              <List>
                {chatHistory.map((chatItem) => (
                  <ListItemButton key={chatItem.id}>
                    <ListItemText primary={chatItem.title} secondary={`Tarih: ${chatItem.date}`} />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Typography variant="body1" align="center">Henüz sohbet yapılmamış</Typography>
            )}
          </Paper>
        )
      }
    }
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box'
          }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
            <IconButton
              onClick={() => navigate('/analysis')}
              sx={{ mr: 1 }}
              aria-label="back to analysis"
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">Sohbetler</Typography>
          </Box>
          <Divider />
          <List>
            <ListItemButton onClick={() => handleModeChange('new')}>
              <ListItemText primary="Yeni Sohbet" />
            </ListItemButton>
            <ListItemButton onClick={() => handleModeChange('history')}>
              <ListItemText primary="Geçmiş Sohbetler" />
            </ListItemButton>
            <ListItemButton onClick={() => navigate('/announcements')}>
              <ListItemIcon><AnnouncementIcon /></ListItemIcon>
              <ListItemText primary="Duyurular" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {renderMainContent()}
      </Box>
    </Box>
  )
}

export default ChatPage
