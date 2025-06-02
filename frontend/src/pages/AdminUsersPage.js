import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  TextField,
  Paper,
  Container,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  InputAdornment,
  Chip,
  FormControl,
} from '@mui/material'
import { Link } from 'react-router-dom'
import { users } from '../services/api'
import { useNotification } from '../context/NotificationContext'
import {
  Delete as DeleteIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  CheckCircleOutline as VerifiedIcon,
  ErrorOutline as UnverifiedIcon,
} from '@mui/icons-material'

export default function AdminUsersPage() {
  const { showNotification } = useNotification()
  const [usersList, setUsersList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState('success')

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return
    }
    setSnackbarOpen(false)
  }

  // 1) Kullanıcıları çek
  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await users.list()
      if (response.data.success) {
        setUsersList(response.data.users)
      } else {
        throw new Error(response.data.message || 'Kullanıcılar alınırken sunucu hatası.')
      }
    } catch (err) {
      console.error('Kullanıcıları çekme hatası:', err)
      setError('Kullanıcılar yüklenirken bir hata oluştu.')
      setUsersList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // 2) Rol değiştir
  const handleRoleChange = async (id, newRole) => {
    try {
      const response = await users.update(id, { role: newRole })
      if (response.data.success) {
        setUsersList(u => u.map(user => user._id === id ? { ...user, role: newRole } : user))
        showNotification('Kullanıcı rolü güncellendi', 'success')
      } else {
        showNotification(response.data.message || 'Rol değiştirme başarısız oldu.', 'error')
      }
    } catch (err) {
      console.error(err)
      showNotification('Rol değiştirme sırasında hata oluştu.', 'error')
    }
  }

  // 3) Kullanıcı sil
  const handleDeleteClick = (user) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return
    try {
      const response = await users.delete(userToDelete._id)
      if (response.data.success) {
        setUsersList(u => u.filter(x => x._id !== userToDelete._id))
        showNotification('Kullanıcı başarıyla silindi', 'success')
      } else {
        showNotification(response.data.message || 'Kullanıcı silme başarısız oldu.', 'error')
      }
    } catch (err) {
      console.error(err)
      showNotification('Kullanıcı silme sırasında hata oluştu.', 'error')
    } finally {
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  // Arama/Filtreleme İşlemi
  const filteredUsers = usersList.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.surname?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 4 }}>
        Kullanıcılar yüklenirken bir hata oluştu: {error}
        <Button onClick={fetchUsers} sx={{ mt: 1 }} variant="outlined" size="small">
          Tekrar Dene
        </Button>
      </Alert>
    )
  }

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
          Kullanıcı Yönetimi
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Sisteme kayıtlı kullanıcıları yönetin
        </Typography>
      </Box>

      <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Kayıtlı Kullanıcılar</Typography>
           {/* Optional: Add User button */}
           {/*
           <Button variant="contained" startIcon={<AddIcon />}>Yeni Kullanıcı Ekle</Button>
           */}
        </Box>

        <TextField
          label="Kullanıcı Ara (E-posta, Ad, Soyad)"
          variant="outlined"
          fullWidth
          size="small"
          sx={{ mb: 3 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        {filteredUsers.length === 0 ? (
          <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
            Kayıtlı kullanıcı bulunamadı veya arama sonucu eşleşme yok.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 650 }} aria-label="user table">
              <TableHead>
                <TableRow>
                  <TableCell>E‑posta</TableCell>
                  <TableCell>Adı Soyadı</TableCell>
                   <TableCell>Durum</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell align="right">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user._id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                       <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2" fontWeight="medium">{user.email}</Typography>
                       </Box>
                    </TableCell>
                    <TableCell>
                       <Typography variant="body2">{`${user.name || '-'} ${user.surname || '-'}`}</Typography>
                    </TableCell>
                     <TableCell>
                       <Chip
                         icon={user.isVerified ? <VerifiedIcon /> : <UnverifiedIcon />}
                         label={user.isVerified ? 'Doğrulandı' : 'Doğrulanmadı'}
                         color={user.isVerified ? 'success' : 'warning'}
                         size="small"
                       />
                    </TableCell>
                    <TableCell>
                      <FormControl variant="outlined" size="small">
                        <Select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user._id, e.target.value)}
                          label="Rol"
                        >
                          <MenuItem value="user">user</MenuItem>
                          <MenuItem value="admin">admin</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(user)}
                        size="small"
                        aria-label="delete user"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Kullanıcıyı Sil</DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description">
            {userToDelete?.email} e-posta adresli kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  )
}
