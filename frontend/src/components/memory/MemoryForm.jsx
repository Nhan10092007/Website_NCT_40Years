import { useEffect, useState } from 'react';
import client, { getApiError } from '../../api/client';

export default function MemoryForm({ onCreated }) {
  const [locations, setLocations] = useState([]);
  const [content, setContent] = useState('');
  const [locationId, setLocationId] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => { client.get('/locations').then(({ data }) => setLocations(data)).catch((e) => setStatus(getApiError(e))); }, []);
  async function submit(event) {
    event.preventDefault();
    setStatus('');
    try { await client.post('/memories', { locationId: Number(locationId), content }); setContent(''); setStatus('Đã đăng câu chuyện.'); onCreated(); }
    catch (e) { setStatus(getApiError(e)); }
  }
  return <form className="memory-form" onSubmit={submit}><h2>Gửi một kỷ niệm</h2><select required value={locationId} onChange={(e) => setLocationId(e.target.value)}><option value="">Chọn góc trường</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><textarea required minLength="5" maxLength="3000" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Bạn nhớ điều gì về NCT?" /><button className="button" type="submit">Đăng kỷ niệm</button>{status && <small className="form-status">{status}</small>}</form>;
}
