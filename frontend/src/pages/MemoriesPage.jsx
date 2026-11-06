import { useEffect, useState } from 'react';
import client, { getApiError } from '../api/client';
import MemoryCard from '../components/memory/MemoryCard';
import MemoryForm from '../components/memory/MemoryForm';
import { useAuth } from '../context/auth-context';

export default function MemoriesPage() {
  const { user } = useAuth();
  const [memories, setMemories] = useState([]);
  const [error, setError] = useState('');
  const load = () => client.get('/memories?limit=20').then(({ data }) => setMemories(data.items || [])).catch((e) => setError(getApiError(e)));
  useEffect(() => { load(); }, []);
  return <section className="section section-narrow">
    <div className="section-heading"><div><p className="eyebrow">Dòng ký ức</p><h1>Những câu chuyện còn ở lại</h1><p className="muted">Chia sẻ một khoảnh khắc của bạn với cộng đồng NCT.</p></div></div>
    {user ? <MemoryForm onCreated={load} /> : <p className="notice">Đăng nhập để chia sẻ câu chuyện của bạn.</p>}
    {error && <p className="alert">{error}</p>}
    <div className="memory-list">{memories.map((memory) => <MemoryCard key={memory.id} memory={memory} />)}</div>
    {!error && memories.length === 0 && <p className="empty-state">Chưa có bài viết nào được chia sẻ.</p>}
  </section>;
}
