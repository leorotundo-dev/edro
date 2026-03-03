import React from 'react';

interface LinkedInEventProps {
  eventName?: string;
  eventImage?: string;
  postImage?: string;
  thumbnail?: string;
  date?: string;
  time?: string;
  attendees?: number;
  isOnline?: boolean;
}

export const LinkedInEvent: React.FC<LinkedInEventProps> = ({
  eventName = 'Professional Event Name',
  eventImage = '',
  postImage,
  thumbnail,
  date = 'January 27, 2026',
  time = '2:00 PM - 3:30 PM',
  attendees = 234,
  isOnline = true,
}) => {
  const resolvedEventImage = postImage ?? thumbnail ?? eventImage;

  return (
    <div className="w-full max-w-[500px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="w-full h-[180px] bg-gray-200">
        {resolvedEventImage && <img src={resolvedEventImage} alt={eventName} className="w-full h-full object-cover" />}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-3">{eventName}</h3>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <div>
              <p className="text-sm font-semibold text-gray-900">{date}</p>
              <p className="text-sm text-gray-600">{time}</p>
            </div>
          </div>

          {isOnline && (
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              <p className="text-sm text-gray-900">Online event</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
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
