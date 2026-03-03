import React from 'react';

interface WhatsAppCallProps {
  contactName?: string;
  title?: string;
  headline?: string;
  name?: string;
  contactImage?: string;
  postImage?: string;
  thumbnail?: string;
  callType?: 'voice' | 'video';
  duration?: string;
}

export const WhatsAppCall: React.FC<WhatsAppCallProps> = ({
  contactName = 'Contact Name',
  title,
  headline,
  name,
  contactImage = '',
  postImage,
  thumbnail,
  callType = 'voice',
  duration = '00:45',
}) => {
  const resolvedContactName = title ?? headline ?? name ?? contactName;
  const resolvedContactImage = postImage ?? thumbnail ?? contactImage;

  return (
    <div className="w-full max-w-[300px] bg-gradient-to-b from-[#075E54] to-[#128C7E] rounded-2xl p-6 shadow-lg">
      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto rounded-full bg-white/20 overflow-hidden mb-4">
          {resolvedContactImage && <img src={resolvedContactImage} alt={resolvedContactName} className="w-full h-full object-cover" />}
        </div>
        <h3 className="text-xl font-semibold text-white mb-1">{resolvedContactName}</h3>
        <p className="text-white/80 text-sm">{duration}</p>
      </div>

      <div className="flex items-center justify-center gap-6">
        <button className="w-14 h-14 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </button>
        {callType === 'video' && (
          <button className="w-14 h-14 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          </button>
        )}
        <button className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white transform rotate-135"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </button>
      </div>
    </div>
  );
};
