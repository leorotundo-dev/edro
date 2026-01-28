import React from 'react';
import { Star } from 'lucide-react';

interface GoogleReviewProps {
  reviewerName?: string;
  reviewerImage?: string;
  rating?: number;
  reviewText?: string;
  timeAgo?: string;
}

export const GoogleReview: React.FC<GoogleReviewProps> = ({
  reviewerName = 'Reviewer Name',
  reviewerImage = '',
  rating = 5,
  reviewText = 'Great experience! Highly recommend this business.',
  timeAgo = '2 weeks ago',
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {reviewerImage && <img src={reviewerImage} alt={reviewerName} className="w-full h-full object-cover" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-sm text-gray-900">{reviewerName}</h4>
            <span className="text-xs text-gray-500">{timeAgo}</span>
          </div>
          
          <div className="flex items-center gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          
          <p className="text-sm text-gray-700">{reviewText}</p>
        </div>
      </div>
    </div>
  );
};
