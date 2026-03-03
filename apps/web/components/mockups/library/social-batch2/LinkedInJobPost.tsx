import React from 'react';

interface LinkedInJobPostProps {
  jobTitle?: string;
  title?: string;
  headline?: string;
  name?: string;
  companyName?: string;
  brandName?: string;
  username?: string;
  companyLogo?: string;
  profileImage?: string;
  image?: string;
  location?: string;
  address?: string;
  jobType?: string;
  applicants?: number | string;
  postedTime?: string;
}

export const LinkedInJobPost: React.FC<LinkedInJobPostProps> = ({
  jobTitle,
  title,
  headline,
  name,
  companyName,
  brandName,
  username,
  companyLogo,
  profileImage,
  image,
  location,
  address,
  jobType = 'Tempo integral',
  applicants = 47,
  postedTime = 'há 2 dias',
}) => {
  const displayTitle = jobTitle || title || headline || name || 'Título da Vaga';
  const displayCompany = companyName || brandName || username || 'Nome da Empresa';
  const displayLogo = companyLogo || profileImage || image || '';
  const displayLocation = location || address || 'Cidade, País';

  return (
    <div style={{ width: '100%', maxWidth: 700, background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #E0E0E0', padding: 16, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#000000E6' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 4, background: '#E0E0E0', overflow: 'hidden', flexShrink: 0 }}>
          {displayLogo && <img src={displayLogo} alt={displayCompany} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#000000E6', margin: '0 0 4px', lineHeight: 1.3 }}>{displayTitle}</h3>
          <p style={{ fontSize: 14, color: '#000000CC', margin: '0 0 12px' }}>{displayCompany}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#00000099' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00000099" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{displayLocation}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#00000099' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00000099" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
              <span>{jobType}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#00000099' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00000099" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>{applicants} candidatos</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#00000066' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00000066" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Publicado {postedTime}</span>
            </div>
          </div>
          <button type="button" style={{ background: '#0A66C2', border: 'none', borderRadius: 9999, color: '#fff', fontWeight: 700, fontSize: 14, padding: '8px 24px', cursor: 'pointer' }}>
            Candidatar-se
          </button>
        </div>
      </div>
    </div>
  );
};
