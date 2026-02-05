import React from 'react';
import { Calendar, Users, Video } from 'lucide-react';

interface LinkedInEventProps {
  eventName?: string;
  eventImage?: string;
  date?: string;
  time?: string;
  attendees?: number;
  isOnline?: boolean;
}

export const LinkedInEvent: React.FC<LinkedInEventProps> = ({
  eventName = 'Professional Event Name',
  eventImage = '',
  date = 'January 27, 2026',
  time = '2:00 PM - 3:30 PM',
  attendees = 234,
  isOnline = true,
}) => {
  return (
    <div className="w-full max-w-[500px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="w-full h-[180px] bg-gray-200">
        {eventImage && <img src={eventImage} alt={eventName} className="w-full h-full object-cover" />}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-3">{eventName}</h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm font-semibold text-gray-900">{date}</p>
              <p className="text-sm text-gray-600">{time}</p>
            </div>
          </div>
          
          {isOnline && (
            <div className="flex items-center gap-3">
              <Video className="w-5 h-5 text-gray-600" />
              <p className="text-sm text-gray-900">Online event</p>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-600" />
            <p className="text-sm text-gray-600">{attendees} attendees</p>
          </div>
        </div>

        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-sm">
          Register
        </button>
      </div>
    </div>
  );
};
