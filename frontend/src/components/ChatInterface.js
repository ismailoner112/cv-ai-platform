// src/components/ChatInterface.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Divider,
  List,
  ListItem,
  TextField,
  Button,
  CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NewspaperIcon from '@mui/icons-material/Newspaper';

export default function ChatInterface({ messages, loading, onSend }) {
  const [input, setInput] = useState('');
  const navigate = useNavigate();
  const endRef = useRef(null);

  // Yeni mesaj geldiğinde otomatik scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = e => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    onSend(text);
    setInput('');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Üst bar */}
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            CV_AI Sohbet
          </Typography>
          <IconButton color="inherit" onClick={() => navigate('/announcements')}>
            <NewspaperIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mesaj listesi */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: 'background.default' }}>
        <List disablePadding>
          {messages.map((msg, idx) => (
            <ListItem
              key={idx}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                mb: 1
              }}
            >
              <Box
                sx={{
                  bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.200',
                  color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  maxWidth: '80%',
                  wordBreak: 'break-word'
                }}
              >
                <Typography variant="body1">{msg.content}</Typography>
              </Box>
              {msg.createdAt && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </Typography>
              )}
            </ListItem>
          ))}
          <div ref={endRef} />
        </List>
      </Box>

      <Divider />

      {/* Mesaj gönderme formu */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', p: 2, gap: 1, alignItems: 'center' }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Mesajınızı yazın..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !input.trim()}
          sx={{ minWidth: 80 }}
        >
          {loading
            ? <CircularProgress size={20} color="inherit" />
            : 'Gönder'}
        </Button>
      </Box>
    </Box>
  );
}
