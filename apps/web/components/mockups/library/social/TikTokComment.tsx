import React, { useState } from 'react';

interface Comment {
  username: string;
  text: string;
  likes: string | number;
  timeAgo: string;
}

interface TikTokCommentProps {
  comments?: Comment[];
}

const TKHeart = ({ filled = false }: { filled?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? '#FE2C55' : 'none'} stroke={filled ? '#FE2C55' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78v0z" />
  </svg>
);

export const TikTokComment: React.FC<TikTokCommentProps> = ({
  comments = [
    { username: 'usuario1', text: 'Conteúdo incrível! 🔥', likes: '234', timeAgo: '2h' },
    { username: 'usuario2', text: 'Adorei demais!', likes: '89', timeAgo: '5h' },
    { username: 'usuario3', text: 'Que incrível 😍', likes: '156', timeAgo: '1d' },
  ],
}) => {
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});

  const toggleLike = (i: number) => setLikedMap(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div style={{ width: 600, maxWidth: '100%', background: '#fff', borderRadius: '16px 16px 0 0', boxShadow: '0 -2px 12px rgba(0,0,0,0.1)', fontFamily: '"TikTok", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0F0F0' }}>
        <h3 style={{ textAlign: 'center', fontWeight: 600, fontSize: 15, color: '#111', margin: 0 }}>{comments.length} comentários</h3>
      </div>
      {/* Comments list */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {comments.map((comment, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid #F7F7F7' }}>
            {/* Avatar */}
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F0F0F0', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#BDBDBD"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>{comment.username}</span>
                <span style={{ fontSize: 12, color: '#888' }}>{comment.timeAgo}</span>
              </div>
              <p style={{ fontSize: 14, color: '#111', margin: 0 }}>{comment.text}</p>
            </div>
            <button type="button" aria-label="Curtir comentário" onClick={() => toggleLike(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <TKHeart filled={!!likedMap[i]} />
              <span style={{ fontSize: 11, color: '#888' }}>{comment.likes}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
