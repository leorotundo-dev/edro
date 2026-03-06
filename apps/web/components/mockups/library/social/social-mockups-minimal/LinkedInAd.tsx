import React from 'react';
import { ExternalLink } from 'lucide-react';
import { renderHeadlineAccented } from '../../../../../lib/renderHeadlineAccented';

interface LinkedInAdProps {
  companyName?: string;
  companyLogo?: string;
  adImage?: string;
  headline?: string;
  description?: string;
  ctaText?: string;
  /** Art Director: short teaser text above headline */
  eyebrow?: string;
  /** Art Director: word to highlight in headline */
  accentWord?: string;
  /** Art Director: color for the accent word */
  accentColor?: string;
}

export const LinkedInAd: React.FC<LinkedInAdProps> = ({
  companyName = 'Company Name',
  companyLogo = '',
  adImage = '',
  headline = 'Grow your business with our solution',
  description = 'Learn how industry leaders are achieving results.',
  ctaText = 'Learn More',
  eyebrow,
  accentWord,
  accentColor,
}) => {
  return (
    <div className="w-full max-w-[552px] bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-12 h-12 rounded bg-gray-200 overflow-hidden">
          {companyLogo && (
            <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
          )}
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900">{companyName}</p>
          <p className="text-xs text-gray-500">Promoted</p>
        </div>
      </div>

      {/* Ad Image */}
      {adImage && (
        <div className="w-full">
          <img src={adImage} alt="Ad" className="w-full object-cover" />
        </div>
      )}

      {/* Ad Content */}
      <div className="p-4 border-t border-gray-100">
        {eyebrow && (
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-1">{eyebrow}</p>
        )}
        <h3 className="font-semibold text-base text-gray-900 mb-1">
          {renderHeadlineAccented(headline, accentWord, accentColor)}
        </h3>
        <p className="text-sm text-gray-600 mb-3">{description}</p>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded text-sm flex items-center justify-center gap-2">
          {ctaText}
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
