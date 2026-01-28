import React from 'react';
import { Mail } from 'lucide-react';

interface NewsletterSustentabilidadeProps {
  companyLogo?: string;
  companyName?: string;
  title?: string;
  subtitle?: string;
  contentImage?: string;
  bodyText?: string;
  ctaText?: string;
  brandColor?: string;
}

export const NewsletterSustentabilidade: React.FC<NewsletterSustentabilidadeProps> = ({
  companyLogo = '',
  companyName = 'Company Name',
  title = 'Newsletter Title',
  subtitle = 'Edition subtitle or date',
  contentImage = '',
  bodyText = 'Newsletter content goes here. Share important updates, news, and information with your team.',
  ctaText = 'Read More',
  brandColor = '#3b82f6',
}) => {
  return (
    <div className="w-full max-w-[600px] min-h-[700px] bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
      <div 
        className="p-6 text-white"
        style={{ backgroundColor: brandColor }}
      >
        <div className="flex items-center gap-3 mb-4">
          {companyLogo && (
            <div className="w-12 h-12 bg-white rounded">
              <img src={companyLogo} alt={companyName} className="w-full h-full object-contain p-1" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-sm font-semibold">{companyName}</h3>
            <p className="text-xs opacity-90">{subtitle}</p>
          </div>
          <Mail className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-black">{title}</h1>
      </div>
      
      <div className="p-6">
        {contentImage && (
          <div className="w-full h-48 bg-gray-200 rounded mb-4">
            <img src={contentImage} alt="Content" className="w-full h-full object-cover rounded" />
          </div>
        )}
        
        <p className="text-gray-700 text-sm leading-relaxed mb-4">{bodyText}</p>
        
        <button 
          className="text-white font-semibold py-2 px-6 rounded text-sm"
          style={{ backgroundColor: brandColor }}
        >
          {ctaText}
        </button>
      </div>
      
      <div className="absolute top-2 right-2 bg-cyan-600 text-white text-xs font-bold px-2 py-1 rounded">
        Newsletter Sustentabilidade
      </div>
      
      <div className="px-6 pb-4 text-center text-xs text-gray-500">
        Internal Communication • Email
      </div>
    </div>
  );
};
