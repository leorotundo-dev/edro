'use client';

import React from 'react';

interface AssinaturaEmailProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  profileImage?: string;
  brandColor?: string;
}

export const AssinaturaEmail: React.FC<AssinaturaEmailProps> = ({
  name = 'Ana Souza',
  username,
  brandName = 'Empresa Ltda',
  headline,
  title = 'Diretora de Marketing',
  body,
  caption,
  description,
  text,
  image,
  profileImage,
  brandColor = '#2563eb',
}) => {
  const resolvedName = name || username || 'Ana Souza';
  const resolvedTitle = title || headline || 'Diretora de Marketing';
  const resolvedBody = body || description || caption || text || '';
  const resolvedAvatar = image || profileImage;

  const lighter = brandColor + '18';

  return (
    <div style={{ width: 600, fontFamily: "'Segoe UI', Arial, sans-serif", background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
      {/* Top label bar */}
      <div style={{ background: brandColor, padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
        <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>ASSINATURA DE E-MAIL</span>
      </div>

      {/* Main signature body */}
      <div style={{ display: 'flex', flexDirection: 'row', padding: '28px 32px', gap: 0, background: '#fff' }}>
        {/* Left accent bar */}
        <div style={{ width: 4, borderRadius: 4, background: brandColor, marginRight: 24, flexShrink: 0 }} />

        {/* Avatar */}
        <div style={{ flexShrink: 0, marginRight: 24 }}>
          {resolvedAvatar ? (
            <img
              src={resolvedAvatar}
              alt={resolvedName}
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${brandColor}` }}
            />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: lighter, border: `3px solid ${brandColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: brandColor, fontSize: 26, fontWeight: 900, lineHeight: 1 }}>
                {resolvedName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Info column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {resolvedName}
          </div>
          <div style={{ fontSize: 13, color: brandColor, fontWeight: 600, letterSpacing: '0.02em' }}>
            {resolvedTitle}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
            {brandName}
          </div>

          {resolvedBody && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' }}>{resolvedBody}</div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: '#f1f5f9', margin: '10px 0 8px' }} />

          {/* Contact row */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: 20, flexWrap: 'wrap' }}>
            {/* Phone */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>(11) 98765-4321</span>
            </div>
            {/* Email */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>contato@{brandName.toLowerCase().replace(/\s/g, '')}.com.br</span>
            </div>
            {/* Website */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>www.{brandName.toLowerCase().replace(/\s/g, '')}.com.br</span>
            </div>
          </div>

          {/* Social icons row */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {/* LinkedIn */}
            <button type="button" aria-label="LinkedIn" style={{ width: 26, height: 26, borderRadius: 6, background: lighter, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={brandColor}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            </button>
            {/* Instagram */}
            <button type="button" aria-label="Instagram" style={{ width: 26, height: 26, borderRadius: 6, background: lighter, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </button>
            {/* WhatsApp */}
            <button type="button" aria-label="WhatsApp" style={{ width: 26, height: 26, borderRadius: 6, background: lighter, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={brandColor}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${brandColor} 0%, ${brandColor}66 60%, transparent 100%)` }} />
    </div>
  );
};
