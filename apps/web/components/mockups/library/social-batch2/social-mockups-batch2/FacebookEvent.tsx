import React from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';

interface FacebookEventProps {
  eventName?: string;
  eventImage?: string;
  date?: string;
  time?: string;
  location?: string;
  interested?: number;
  going?: number;
}

export const FacebookEvent: React.FC<FacebookEventProps> = ({
  eventName = 'Event Name',
  eventImage = '',
  date = 'Saturday, January 27',
  time = '7:00 PM',
  location = 'Event Location',
  interested = 234,
  going = 89,
}) => {
  return (
    <div className="w-full max-w-[500px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="w-full h-[200px] bg-gray-200">
        {eventImage && <img src={eventImage} alt={eventName} className="w-full h-full object-cover" />}
      </div>
      
      <div className="p-4">
        <h3 className="text-xl font-bold text-gray-900 mb-3">{eventName}</h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900">{date}</p>
              <p className="text-sm text-gray-600">{time}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-900">{location}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-600" />
            <p className="text-sm text-gray-600">{going} going · {interested} interested</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md text-sm">
            Interested
          </button>
          <button className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-900 font-semibold py-2 rounded-md text-sm">
            Share
          </button>
        </div>
      </div>
    </div>
  );
};
