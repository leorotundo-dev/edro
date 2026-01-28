import React from 'react';

interface ChatMessage {
  username: string;
  message: string;
  color?: string;
}

interface TwitchChatProps {
  messages?: ChatMessage[];
}

export const TwitchChat: React.FC<TwitchChatProps> = ({
  messages = [
    { username: 'user1', message: 'Hello everyone! PogChamp', color: '#FF0000' },
    { username: 'user2', message: 'Great stream!', color: '#0000FF' },
    { username: 'user3', message: 'LUL', color: '#00FF00' },
  ],
}) => {
  return (
    <div className="w-full max-w-[340px] bg-[#18181B] rounded-lg shadow-lg overflow-hidden">
      <div className="bg-[#1F1F23] p-3 border-b border-gray-800">
        <h3 className="text-white font-semibold text-sm">STREAM CHAT</h3>
      </div>
      
      <div className="h-[400px] overflow-y-auto p-3 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className="text-sm">
            <span className="font-semibold" style={{ color: msg.color || '#9147FF' }}>
              {msg.username}
            </span>
            <span className="text-gray-300">: {msg.message}</span>
          </div>
        ))}
      </div>
      
      <div className="p-3 border-t border-gray-800">
        <input
          type="text"
          placeholder="Send a message"
          className="w-full bg-[#464649] text-white text-sm px-3 py-2 rounded placeholder-gray-500"
          readOnly
        />
      </div>
    </div>
  );
};
