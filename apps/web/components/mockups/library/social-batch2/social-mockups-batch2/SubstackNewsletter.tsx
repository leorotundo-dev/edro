import React from 'react';
import { Mail } from 'lucide-react';

interface SubstackNewsletterProps {
  postImage?: string;
  title?: string;
  excerpt?: string;
  authorName?: string;
  date?: string;
}

export const SubstackNewsletter: React.FC<SubstackNewsletterProps> = ({
  postImage = '',
  title = 'Newsletter Post Title',
  excerpt = 'Post excerpt or introduction text',
  authorName = 'Author Name',
  date = 'Jan 27, 2026',
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {postImage && (
        <div className="w-full h-[240px] bg-gray-200">
          <img src={postImage} alt={title} className="w-full h-full object-cover" />
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-4 h-4 text-orange-600" />
          <span className="text-xs font-semibold text-orange-600 uppercase">Newsletter</span>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">{title}</h2>
        <p className="text-base text-gray-600 mb-4">{excerpt}</p>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div>
            <p className="font-semibold text-sm text-gray-900">{authorName}</p>
            <p className="text-xs text-gray-500">{date}</p>
          </div>
          
          <button className="text-sm text-orange-600 font-semibold hover:underline">
            Read more
          </button>
        </div>
      </div>
    </div>
  );
};
