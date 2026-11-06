import LikeButton from '../common/LikeButton';
import CommentList from './CommentList';
import { avatarFor } from '../../assets/asset-registry';

export default function MemoryCard({ memory }) {
  return <article className="memory-card">
    <div className="memory-meta"><div className="author"><img src={memory.author?.avatar_url || avatarFor(memory.author?.id)} alt="" /><strong>{memory.author?.display_name || 'Thành viên NCT'}</strong></div><span>{memory.location?.name} · {new Date(memory.created_at).toLocaleDateString('vi-VN')}</span></div>
    <p className="memory-content">{memory.content}</p>
    {memory.images?.[0] && <img className="memory-image" src={memory.images[0]} alt="" />}
    <div className="memory-actions"><LikeButton memory={memory} /><span>{memory.comment_count || 0} bình luận</span></div>
    <CommentList memoryId={memory.id} />
  </article>;
}
