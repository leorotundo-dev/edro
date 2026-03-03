import React from 'react';

interface InstagramCarouselProps {
  username?: string;
  profileImage?: string;
  carouselImages?: string[];
  caption?: string;
  content?: string;
  text?: string;
  body?: string;
  likes?: number;
}

export const InstagramCarousel: React.FC<InstagramCarouselProps> = ({
  username = 'username',
  profileImage = '',
  carouselImages = ['', '', ''],
  caption = 'Carousel caption',
  content,
  text,
  body,
  likes = 1234,
}) => {
  const resolvedCaption = content ?? text ?? body ?? caption;

  return (
    <div className="w-full max-w-[470px] bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center gap-3 p-3 border-b border-gray-100">
        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
          {profileImage && <img src={profileImage} alt={username} className="w-full h-full object-cover" />}
        </div>
        <span className="font-semibold text-sm">{username}</span>
      </div>

      <div className="relative">
        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          {carouselImages.map((img, i) => (
            <div key={i} className="flex-shrink-0 w-full snap-center aspect-square bg-gray-200">
              {img && <img src={img} alt={`Slide ${i+1}`} className="w-full h-full object-cover" />}
            </div>
          ))}
        </div>
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          1/{carouselImages.length}
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </div>
        <p className="font-semibold text-sm mb-1">{likes.toLocaleString()} likes</p>
        <p className="text-sm"><span className="font-semibold">{username}</span> {resolvedCaption}</p>
      </div>
    </div>
  );
};
