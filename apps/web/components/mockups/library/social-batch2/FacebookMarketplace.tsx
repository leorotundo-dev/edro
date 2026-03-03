import React from 'react';

interface FacebookMarketplaceProps {
  productImage?: string;
  image?: string;
  postImage?: string;
  productName?: string;
  name?: string;
  headline?: string;
  title?: string;
  price?: string;
  location?: string;
  address?: string;
  condition?: string;
}

export const FacebookMarketplace: React.FC<FacebookMarketplaceProps> = ({
  productImage,
  image,
  postImage,
  productName,
  name,
  headline,
  title,
  price = 'R$ 99',
  location,
  address,
  condition = 'Novo',
}) => {
  const displayImage = productImage || image || postImage || '';
  const displayName = productName || name || headline || title || 'Nome do Produto';
  const displayLocation = location || address || 'Cidade, Estado';

  return (
    <div style={{ width: 240, background: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', border: '1px solid #E4E6EB', overflow: 'hidden', cursor: 'pointer', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#050505' }}>
      <div style={{ width: '100%', paddingTop: '100%', position: 'relative', background: '#E4E6EB', overflow: 'hidden' }}>
        {displayImage && (
          <img src={displayImage} alt={displayName} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
      </div>
      <div style={{ padding: 12 }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#050505', margin: '0 0 4px' }}>{price}</p>
        <h3 style={{ fontSize: 13, color: '#050505', margin: '0 0 8px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{displayName}</h3>
        <p style={{ fontSize: 12, color: '#65676B', margin: '0 0 4px' }}>{condition}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#65676B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span style={{ fontSize: 12, color: '#65676B' }}>{displayLocation}</span>
        </div>
      </div>
    </div>
  );
};
