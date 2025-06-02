// src/components/Navbar.js
import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/auth', { replace: true })
  }

  return (
    <header className="bg-white shadow flex items-center px-6 py-3">
      <Link to="/dashboard" className="text-2xl font-bold text-blue-600">
        CV_AI
      </Link>

      {token && (
        <>
          <nav className="flex space-x-4 ml-8">
            <Link
              to="/chat"
              className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
            >
              Sohbet
            </Link>
            <Link
              to="/analysis"
              className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
            >
              Analiz
            </Link>
            <Link
              to="/stats"
              className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
            >
              İstatistikler
            </Link>
            <Link
              to="/announcements"
              className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
            >
              Duyurular
            </Link>
            <Link
              to="/gallery"
              className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
            >
              Galeri
            </Link>
          </nav>
          <button
            onClick={handleLogout}
            className="ml-auto px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
          >
            Çıkış
          </button>
        </>
      )}
    </header>
  )
}
