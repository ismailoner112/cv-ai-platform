// src/pages/GalleryDetailPage.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { announcementsAPI, galleryAPI } from '../services/api';
export default function GalleryDetailPage() {
  const { slug } = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => {
    announcementsAPI.getOne(slug).then(res => setItem(res.data.item));
    galleryAPI.getOne(slug).then(res => setItem(res.data.item));
  }, [slug]);

  if (!item) return <p>Yükleniyor…</p>;

  const pdfUrl = `${process.env.REACT_APP_API_URL}/uploads/gallery/${item.filename}`;

  return (
    <div>
      <h1>{item.title}</h1>
      <p>{item.description}</p>

      {/* PDF gömme */}
      <object
        data={pdfUrl}
        type="application/pdf"
        width="100%"
        height="800px"
      >
        <p>Tarayıcınız PDF’i görüntüleyemiyor. 
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            İndirmek için tıklayın
          </a>.
        </p>
      </object>
    </div>
  );
}
