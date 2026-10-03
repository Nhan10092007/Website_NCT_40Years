import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import client from '../api/client';

export default function TourPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');

  // 1. Lấy dữ liệu địa điểm
  useEffect(() => {
    setError('');
    client
      .get(`/locations/${slug}`)
      .then((res) => setLocation(res.data))
      .catch((e) => setError(e.message));
  }, [slug]);

  // 2. Dựng ảnh 360° khi có dữ liệu
  useEffect(() => {
    if (!location || !containerRef.current) return;

    const viewer = new Viewer({
      container: containerRef.current,
      panorama: location.panorama_url,
      plugins: [
        [
          MarkersPlugin,
          {
            markers: location.links.map((link) => ({
              id: `link-${link.id}`,
              position: { yaw: link.yaw, pitch: link.pitch },
              html: '<div class="w-12 h-12 rounded-full bg-white/85 grid place-items-center text-2xl cursor-pointer">➜</div>',
              tooltip: link.to_name,
              data: { toSlug: link.to_slug },
            })),
          },
        ],
      ],
    });

    viewer
      .getPlugin(MarkersPlugin)
      .addEventListener('select-marker', ({ marker }) => {
        navigate(`/tour/${marker.data.toSlug}`);
      });

    return () => viewer.destroy();
  }, [location, navigate]);

  if (error) return <p className="p-6">Không tải được địa điểm: {error}</p>;
  if (!location) return <p className="p-6">Đang tải...</p>;

  return (
    <div>
      <div ref={containerRef} className="w-full h-[80vh]" />
      <div className="px-6 py-4">
        <h2 className="text-2xl font-bold">{location.name}</h2>
        <p className="text-gray-600">{location.description}</p>
      </div>
    </div>
  );
}