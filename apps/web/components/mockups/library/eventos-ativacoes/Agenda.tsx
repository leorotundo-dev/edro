import React from 'react';

interface AgendaProps {
  productImage?: string;
  postImage?: string;
  thumbnail?: string;
  brandLogo?: string;
  brandColor?: string;
}

export const Agenda: React.FC<AgendaProps> = ({
  productImage,
  postImage,
  thumbnail,
  brandLogo = '',
  brandColor = '#10b981',
}) => {
  const resolvedProductImage = productImage ?? postImage ?? thumbnail ?? '';
  return (
    <div className="relative w-[250px] h-[350px] bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        {resolvedProductImage ? (
          <img src={resolvedProductImage} alt="Product" className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="text-center">
            <div
              className="w-20 h-20 mx-auto mb-3 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${brandColor}20` }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: brandColor }}><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
            </div>
            {brandLogo && (
              <div className="w-24 h-12">
                <img src={brandLogo} alt="Brand" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded"
        style={{ backgroundColor: brandColor }}
      >
        Agenda
      </div>

      <div className="absolute bottom-2 left-2 bg-white/90 text-gray-900 text-xs px-2 py-1 rounded border border-gray-300">
        A5
      </div>
    </div>
  );
};
