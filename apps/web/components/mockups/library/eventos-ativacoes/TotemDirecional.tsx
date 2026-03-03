import React from 'react';

interface TotemDirecionalProps {
  text?: string;
  body?: string;
  caption?: string;
  icon?: React.ReactNode;
  backgroundColor?: string;
  textColor?: string;
}

export const TotemDirecional: React.FC<TotemDirecionalProps> = ({
  text,
  body,
  caption,
  icon,
  backgroundColor = '#ffffff',
  textColor = '#1f2937',
}) => {
  const resolvedText = text ?? body ?? caption ?? 'Direction or Label';
  return (
    <div
      className="relative w-[250px] h-[600px] rounded-lg overflow-hidden shadow-md border-2"
      style={{ backgroundColor, borderColor: '#e5e7eb' }}
    >
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          {icon && (
            <div className="mb-2 flex justify-center">
              {icon}
            </div>
          )}
          <p
            className="text-lg font-bold"
            style={{ color: textColor }}
          >
            {resolvedText}
          </p>
        </div>
      </div>

      <div className="absolute top-2 right-2 bg-teal-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        Totem Direcional
      </div>

      <div className="absolute bottom-2 left-2 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
        Variable
      </div>
    </div>
  );
};
