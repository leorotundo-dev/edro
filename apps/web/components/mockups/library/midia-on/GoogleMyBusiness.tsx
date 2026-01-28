import React from 'react';
import { MapPin, Phone, Globe, Star } from 'lucide-react';

interface GoogleMyBusinessProps {
  businessName?: string;
  businessImage?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
  phone?: string;
  website?: string;
}

export const GoogleMyBusiness: React.FC<GoogleMyBusinessProps> = ({
  businessName = 'Business Name',
  businessImage = '',
  category = 'Business Category',
  rating = 4.5,
  reviewCount = 234,
  address = '123 Main St, City, State',
  phone = '(555) 123-4567',
  website = 'www.business.com',
}) => {
  return (
    <div className="w-full max-w-[400px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="w-full h-[200px] bg-gray-200">
        {businessImage && <img src={businessImage} alt={businessName} className="w-full h-full object-cover" />}
      </div>
      
      <div className="p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{businessName}</h2>
        <p className="text-sm text-gray-600 mb-2">{category}</p>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-semibold text-sm">{rating}</span>
          </div>
          <span className="text-sm text-gray-500">({reviewCount} reviews)</span>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
            <span className="text-gray-900">{address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-600" />
            <span className="text-gray-900">{phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-600" />
            <span className="text-blue-600">{website}</span>
          </div>
        </div>
        
        <button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-sm">
          Get Directions
        </button>
      </div>
    </div>
  );
};
