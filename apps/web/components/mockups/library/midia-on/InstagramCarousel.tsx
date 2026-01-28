import React from 'react';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';

interface InstagramCarouselProps {
  username?: string;
  profileImage?: string;
  carouselImages?: string[];
  caption?: string;
  likes?: number;
}

export const InstagramCarousel: React.FC<InstagramCarouselProps> = ({
  username = 'username',
  profileImage = '',
  carouselImages = ['', '', ''],
  caption = 'Carousel caption',
  likes = 1234,
}) => {
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
            <Heart className="w-6 h-6" />
            <MessageCircle className="w-6 h-6" />
            <Send className="w-6 h-6" />
          </div>
          <Bookmark className="w-6 h-6" />
        </div>
        <p className="font-semibold text-sm mb-1">{likes.toLocaleString()} likes</p>
        <p className="text-sm"><span className="font-semibold">{username}</span> {caption}</p>
      </div>
    </div>
  );
};
