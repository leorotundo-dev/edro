import React from 'react';

interface GoogleSearchAdProps {
  headline1?: string;
  headline2?: string;
  headline3?: string;
  description1?: string;
  description2?: string;
  displayUrl?: string;
}

export const GoogleSearchAd: React.FC<GoogleSearchAdProps> = ({
  headline1 = 'Main Headline Here',
  headline2 = 'Second Headline',
  headline3 = 'Third Headline',
  description1 = 'First line of description text that explains your offer.',
  description2 = 'Second line with additional details and benefits.',
  displayUrl = 'www.example.com',
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">Ad</span>
        <span className="text-sm text-green-700">{displayUrl}</span>
      </div>
      <h3 className="text-xl text-blue-600 hover:underline cursor-pointer mb-1">
        {headline1} | {headline2} | {headline3}
      </h3>
      <p className="text-sm text-gray-700 leading-relaxed">
        {description1} {description2}
      </p>
    </div>
  );
};
