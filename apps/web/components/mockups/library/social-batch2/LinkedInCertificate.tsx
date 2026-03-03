import React from 'react';

interface LinkedInCertificateProps {
  certificateName?: string;
  name?: string;
  headline?: string;
  title?: string;
  issuedBy?: string;
  description?: string;
  body?: string;
  issueDate?: string;
  credentialId?: string;
}

export const LinkedInCertificate: React.FC<LinkedInCertificateProps> = ({
  certificateName,
  name,
  headline,
  title,
  issuedBy,
  description,
  body,
  issueDate = 'Janeiro 2026',
  credentialId = 'ABC123XYZ',
}) => {
  const displayName = certificateName || name || headline || title || 'Nome do Certificado';
  const displayIssuer = issuedBy || description || body || 'Organização Emissora';

  return (
    <div style={{ width: 500, maxWidth: '100%', background: '#fff', borderRadius: 8, border: '1px solid #E0E0E0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)', padding: '32px 24px', textAlign: 'center' }}>
        {/* Award trophy SVG */}
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
          <circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: '0 0 6px', lineHeight: '28px' }}>{displayName}</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{displayIssuer}</p>
      </div>
      {/* Details */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Emitido em</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111', margin: 0 }}>{issueDate}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#666', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>ID da Credencial</p>
            <p style={{ fontSize: 14, fontFamily: 'monospace', color: '#111', margin: 0 }}>{credentialId}</p>
          </div>
        </div>
        <button type="button" style={{ width: '100%', background: 'none', border: '1.5px solid #0A66C2', borderRadius: 20, color: '#0A66C2', fontWeight: 700, fontSize: 14, padding: '8px 0', cursor: 'pointer' }}>
          Ver credencial
        </button>
      </div>
    </div>
  );
};
