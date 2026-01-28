import React from 'react';

interface GoogleBanner970x250Props {
  backgroundImage?: string;
  headline?: string;
  description?: string;
  ctaText?: string;
  logo?: string;
  features?: string[];
}

export const GoogleBanner970x250: React.FC<GoogleBanner970x250Props> = ({
  backgroundImage = '',
  headline = 'Your Big Headline Here',
  description = 'Compelling description of your offer',
  ctaText = 'Get Started',
  logo = '',
  features = ['Feature 1', 'Feature 2', 'Feature 3'],
}) => {
  return (
    <div className="relative w-[970px] h-[250px] bg-white border border-gray-300 shadow-sm overflow-hidden">
      {backgroundImage && (
        <img src={backgroundImage} alt="Background" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="relative h-full flex items-center px-8 gap-6">
        {logo && (
          <div className="w-32 h-32 flex-shrink-0">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
        <div className="flex-1">
          <h2 className="font-bold text-3xl text-gray-900 mb-2">{headline}</h2>
          <p className="text-base text-gray-700 mb-3">{description}</p>
          <div className="flex gap-4 text-sm text-gray-600">
            {features.map((feature, i) => (
              <span key={i}>✓ {feature}</span>
            ))}
          </div>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-lg text-base whitespace-nowrap">
          {ctaText}
        </button>
      </div>
      <span className="absolute top-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded">Ad</span>
    </div>
  );
};
