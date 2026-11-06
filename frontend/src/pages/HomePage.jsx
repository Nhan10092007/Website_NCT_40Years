import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client, { getApiError } from '../api/client';
import { assets } from '../assets/asset-registry';

export default function HomePage() {
  const [locations, setLocations] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([client.get('/locations'), client.get('/rankings/locations?limit=5')])
      .then(([locationsResponse, rankingResponse]) => {
        setLocations(locationsResponse.data);
        setRanking(rankingResponse.data.items || rankingResponse.data);
      })
      .catch((e) => setError(getApiError(e)));
  }, []);

  return <div>
    <section className="hero"><video className="hero-video" autoPlay muted loop playsInline src={assets.videos.train} /><div className="hero-content">
      <img className="hero-logo" src={assets.logo} alt="Biểu trưng 40 năm Trường THPT Nguyễn Công Trứ" />
      <p className="eyebrow">1986 — 2026</p>
      <h1>Chuyến tàu tiếp nối</h1>
      <p>Nơi những thế hệ NCT cùng trở về, gặp nhau và viết tiếp câu chuyện của ngôi trường.</p>
      <div className="hero-actions">
        {locations[0] && <Link className="button" to={`/tour/${locations[0].slug}`}>Khám phá không gian 360°</Link>}
        <Link className="button button-light" to="/memories">Đọc dòng ký ức</Link>
      </div>
    </div></section>
    <section className="section section-narrow">
      <div className="section-heading"><div><p className="eyebrow">Những góc trường</p><h2>Đi qua từng dấu mốc</h2></div></div>
      {error && <p className="alert">{error}</p>}
      <div className="location-grid">{locations.map((location) => <Link className="location-card" key={location.id} to={`/tour/${location.slug}`}>
        {assets.videos[location.slug] ? <video className="location-card-image" autoPlay muted loop playsInline src={assets.videos[location.slug]} /> : <div className="location-card-image" style={{ backgroundImage: `url(${location.panorama_url || assets.landscape})` }} />}
        <div><h3>{location.name}</h3><p>{location.description || 'Một nơi lưu giữ những ký ức đáng nhớ.'}</p><small>{location.memory_count || 0} câu chuyện</small></div>
      </Link>)}</div>
    </section>
    {ranking.length > 0 && <section className="section section-muted"><div className="section-narrow"><p className="eyebrow">Cộng đồng</p><h2>Những nơi được yêu mến</h2><ol className="ranking-list">{ranking.map((item) => <li key={item.id || item.location_id}><span>{item.name || item.location_name}</span><strong>{item.like_count ?? item.likes ?? 0} lượt thích</strong></li>)}</ol></div></section>}
  </div>;
}
