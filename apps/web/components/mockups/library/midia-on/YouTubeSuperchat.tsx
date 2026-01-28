import React from 'react';

interface YouTubeSuperchatProps {
  username?: string;
  amount?: string;
  message?: string;
  color?: string;
}

export const YouTubeSuperchat: React.FC<YouTubeSuperchatProps> = ({
  username = 'Username',
  amount = '$5.00',
  message = 'Great stream! Keep up the good work!',
  color = '#1E88E5',
}) => {
  return (
    <div 
      className="w-full max-w-[400px] rounded overflow-hidden shadow-sm"
      style={{ backgroundColor: color }}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-sm text-white">{username}</span>
          <span className="font-bold text-base text-white">{amount}</span>
        </div>
        <p className="text-sm text-white">{message}</p>
      </div>
    </div>
  );
};
