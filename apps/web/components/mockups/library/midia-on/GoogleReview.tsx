import React from 'react';

interface GoogleReviewProps {
  reviewerName?: string;
  reviewerImage?: string;
  rating?: number;
  reviewText?: string;
  content?: string;
  text?: string;
  body?: string;
  timeAgo?: string;
}

export const GoogleReview: React.FC<GoogleReviewProps> = ({
  reviewerName = 'Reviewer Name',
  reviewerImage = '',
  rating = 5,
  reviewText = 'Great experience! Highly recommend this business.',
  content,
  text,
  body,
  timeAgo = '2 weeks ago',
}) => {
  const resolvedReviewText = content ?? text ?? body ?? reviewText;

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
              <svg
                key={i}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={i < rating ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={i < rating ? 'text-yellow-500' : 'text-gray-300'}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            ))}
          </div>

          <p className="text-sm text-gray-700">{resolvedReviewText}</p>
        </div>
      </div>
    </div>
  );
};
