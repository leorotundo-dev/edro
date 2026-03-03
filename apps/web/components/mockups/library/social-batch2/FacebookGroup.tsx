import React from 'react';

interface FacebookGroupProps {
  groupName?: string;
  name?: string;
  headline?: string;
  groupCover?: string;
  image?: string;
  postImage?: string;
  members?: string | number;
  postsPerDay?: number;
  isPrivate?: boolean;
}

export const FacebookGroup: React.FC<FacebookGroupProps> = ({
  groupName,
  name,
  headline,
  groupCover,
  image,
  postImage,
  members = '12,4K membros',
  postsPerDay = 15,
  isPrivate = true,
}) => {
  const displayName = groupName || name || headline || 'Nome do Grupo';
  const displayCover = groupCover || image || postImage || '';

  return (
    <div style={{ width: 800, maxWidth: '100%', background: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#050505' }}>
      <div style={{ width: '100%', height: 200, background: '#E4E6EB', overflow: 'hidden' }}>
        {displayCover ? (
          <img src={displayCover} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1877F2 0%, #0052cc 100%)' }} />
        )}
      </div>
      <div style={{ padding: '20px 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>{displayName}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#65676B' }}>
              {isPrivate && (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#65676B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  <span>Grupo privado</span>
                  <span>·</span>
                </>
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#65676B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              <span>{members}</span>
            </div>
            <p style={{ fontSize: 12, color: '#65676B', margin: '4px 0 0' }}>{postsPerDay} publicações por dia</p>
          </div>
          <button type="button" style={{ background: '#1877F2', border: 'none', borderRadius: 6, color: 'white', fontWeight: 700, fontSize: 15, padding: '8px 20px', cursor: 'pointer' }}>
            Entrar no Grupo
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4, borderTop: '1px solid #E4E6EB', paddingTop: 8 }}>
          {['Discussão', 'Destaque', 'Membros', 'Eventos'].map((tab, i) => (
            <button key={tab} type="button" style={{ background: 'none', border: 'none', borderBottom: i === 0 ? '2px solid #1877F2' : '2px solid transparent', color: i === 0 ? '#1877F2' : '#65676B', fontWeight: 700, fontSize: 14, padding: '8px 12px', cursor: 'pointer' }}>
              {tab}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
