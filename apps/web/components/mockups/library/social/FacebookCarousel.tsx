import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FacebookCarouselProps {
  brandName?: string;
  brandLogo?: string;
  carouselImages?: string[];
  headline?: string;
  ctaText?: string;
}

export const FacebookCarousel: React.FC<FacebookCarouselProps> = ({
  brandName = 'Brand Name',
  brandLogo = '',
  carouselImages = ['', '', ''],
  headline = 'Swipe to see more',
  ctaText = 'Shop Now',
}) => {
  return (
    <div className="w-full max-w-[500px] bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
          {brandLogo && (
            <img src={brandLogo} alt={brandName} className="w-full h-full object-cover" />
          )}
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900">{brandName}</p>
          <p className="text-xs text-gray-500">Sponsored</p>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          {carouselImages.map((image, index) => (
            <div key={index} className="flex-shrink-0 w-full snap-center">
              <div className="w-full aspect-square bg-gray-200">
                {image && (
                  <img src={image} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Navigation Arrows */}
        <button className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md">
          <ChevronLeft className="w-5 h-5 text-gray-900" />
        </button>
        <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md">
          <ChevronRight className="w-5 h-5 text-gray-900" />
        </button>

        {/* Dots Indicator */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
          {carouselImages.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full ${index === 0 ? 'bg-white' : 'bg-white/50'}`}
            />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <p className="font-semibold text-sm text-gray-900 mb-2">{headline}</p>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md text-sm">
          {ctaText}
        </button>
      </div>
    </div>
  );
};
