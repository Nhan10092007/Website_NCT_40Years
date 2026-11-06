import { useCallback, useEffect, useState } from 'react';
import client, { getApiError } from '../../api/client';
import { useAuth } from '../../context/auth-context';

export default function CommentList({ memoryId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(() => client.get(`/comments/memories/${memoryId}?limit=10`).then(({ data }) => setComments(data.items || [])).catch((e) => setError(getApiError(e))), [memoryId]);
  useEffect(() => { load(); }, [load]);
  async function submit(e) { e.preventDefault(); try { await client.post(`/comments/memories/${memoryId}`, { content }); setContent(''); load(); } catch (err) { setError(getApiError(err)); } }
  return <div className="comments"><div className="comment-items">{comments.map((comment) => <div className="comment" key={comment.id}><strong>{comment.display_name}</strong><p>{comment.content}</p></div>)}</div>{user ? <form className="comment-form" onSubmit={submit}><input required maxLength="2000" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Viết bình luận..." /><button type="submit">Gửi</button></form> : <small className="muted">Đăng nhập để bình luận.</small>}{error && <small className="error-text">{error}</small>}</div>;
}
