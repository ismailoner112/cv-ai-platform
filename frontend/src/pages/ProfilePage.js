// frontend/src/pages/ProfilePage.js

import React, { useState, useEffect } from 'react';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingUpdate, setLoadingUpdate]   = useState(false);
  const [loadingPwd, setLoadingPwd]         = useState(false);

  const [profileMsg, setProfileMsg] = useState('');
  const [pwdMsg, setPwdMsg]         = useState('');
  const [error, setError]           = useState('');

  const token = localStorage.getItem('token');
fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
fetch('/api/auth/profile', { method:'PUT',  })
fetch('/api/auth/password', { method:'PUT', })


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Profil alınamadı');
        setUser(data.user);
        setName(data.user.name);
        setSurname(data.user.surname);
        setEmail(data.user.email);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [token]);

  const handleProfileUpdate = async e => {
    e.preventDefault();
    setProfileMsg('');
    setError('');
    setLoadingUpdate(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, surname, email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Güncelleme başarısız');
      setProfileMsg('Profil güncellendi.');
      setUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingUpdate(false);
    }
  };

  const handlePasswordUpdate = async e => {
    e.preventDefault();
    setPwdMsg('');
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Yeni şifre ve onay eşleşmiyor.');
      return;
    }
    setLoadingPwd(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Şifre güncellenemedi');
      setPwdMsg('Şifre başarıyla güncellendi.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPwd(false);
    }
  };

  if (loadingProfile) {
    return <div style={{ padding: 24 }}>Profil yükleniyor…</div>;
  }

  return (
    <div style={{ padding: 24, background: '#f5f6fa', minHeight: '100vh' }}>
      <h1 style={{ color: '#06005A', marginBottom: 24 }}>Profilim</h1>

      {error && (
        <div style={{ color: 'red', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Profil Güncelleme Formu */}
      <form onSubmit={handleProfileUpdate} style={{
        background: '#fff',
        padding: 20,
        borderRadius: 8,
        marginBottom: 32,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: 12 }}>Kişisel Bilgiler</h2>

        <label>Ad</label><br/>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          required
          style={inputStyle}
        />

        <label>Soyad</label><br/>
        <input
          value={surname}
          onChange={e => setSurname(e.target.value)}
          required
          style={inputStyle}
        />

        <label>E-Posta</label><br/>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={loadingUpdate}
          style={btnStyle}
        >
          {loadingUpdate ? 'Güncelleniyor…' : 'Profili Güncelle'}
        </button>

        {profileMsg && (
          <div style={{ color: 'green', marginTop: 12 }}>
            {profileMsg}
          </div>
        )}
      </form>

      {/* Şifre Güncelleme Formu */}
      <form onSubmit={handlePasswordUpdate} style={{
        background: '#fff',
        padding: 20,
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: 12 }}>Şifre Değiştir</h2>

        <label>Eski Şifre</label><br/>
        <input
          type="password"
          value={oldPassword}
          onChange={e => setOldPassword(e.target.value)}
          required
          style={inputStyle}
        />

        <label>Yeni Şifre</label><br/>
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          required
          style={inputStyle}
        />

        <label>Yeni Şifre (Tekrar)</label><br/>
        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={loadingPwd}
          style={btnStyle}
        >
          {loadingPwd ? 'Güncelleniyor…' : 'Şifreyi Güncelle'}
        </button>

        {pwdMsg && (
          <div style={{ color: 'green', marginTop: 12 }}>
            {pwdMsg}
          </div>
        )}
      </form>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: 10,
  margin: '6px 0 16px',
  borderRadius: 4,
  border: '1px solid #ddd',
  boxSizing: 'border-box'
};

const btnStyle = {
  background: '#06005A',
  color: '#fff',
  border: 'none',
  padding: '10px 20px',
  borderRadius: 4,
  cursor: 'pointer',
  fontWeight: 600
};
