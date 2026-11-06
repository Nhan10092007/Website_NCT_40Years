import { useState } from 'react';
import client from '../../api/client';
import { useAuth } from '../../context/auth-context';

export default function LikeButton({ memory }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(memory.has_liked);
  const [count, setCount] = useState(memory.like_count || 0);
  async function toggle() {
    if (!user) return;
    const { data } = await client.post(`/reactions/memories/${memory.id}/toggle`);
    setLiked(data.liked);
    setCount(data.like_count ?? data.count ?? count + (data.liked ? 1 : -1));
  }
  return <button className={`like-button ${liked ? 'is-liked' : ''}`} type="button" onClick={toggle} disabled={!user} title={user ? 'Thích bài viết' : 'Đăng nhập để thích'}>♥ {count}</button>;
}
