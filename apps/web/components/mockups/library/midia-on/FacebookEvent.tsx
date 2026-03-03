import React from 'react';

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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 flex-shrink-0 mt-0.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <div>
              <p className="text-sm font-semibold text-gray-900">{date}</p>
              <p className="text-sm text-gray-600">{time}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 flex-shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <p className="text-sm text-gray-900">{location}</p>
          </div>

          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
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
