import React from 'react';
import { MapPin, Clock, Globe } from 'lucide-react';

interface WhatsAppBusinessProps {
  businessName?: string;
  businessLogo?: string;
  category?: string;
  description?: string;
  address?: string;
  hours?: string;
  website?: string;
}

export const WhatsAppBusiness: React.FC<WhatsAppBusinessProps> = ({
  businessName = 'Business Name',
  businessLogo = '',
  category = 'Retail',
  description = 'Business description goes here',
  address = '123 Street, City',
  hours = 'Mon-Fri 9AM-6PM',
  website = 'www.business.com',
}) => {
  return (
    <div className="w-full max-w-[400px] bg-white rounded-lg shadow-sm">
      <div className="bg-[#075E54] p-4 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-white overflow-hidden mb-3">
          {businessLogo && <img src={businessLogo} alt={businessName} className="w-full h-full object-cover" />}
        </div>
        <h2 className="text-white font-bold text-lg">{businessName}</h2>
        <p className="text-white/80 text-sm">{category}</p>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-900">{description}</p>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-900">{address}</p>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-900">{hours}</p>
          </div>
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-600">{website}</p>
          </div>
        </div>
        <button className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold py-3 rounded-lg">
          Message
        </button>
      </div>
    </div>
  );
};
