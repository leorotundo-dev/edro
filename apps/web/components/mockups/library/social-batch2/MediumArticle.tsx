import React from 'react';
import { Clock } from 'lucide-react';

interface MediumArticleProps {
  articleImage?: string;
  title?: string;
  subtitle?: string;
  authorName?: string;
  authorImage?: string;
  readTime?: string;
  date?: string;
}

export const MediumArticle: React.FC<MediumArticleProps> = ({
  articleImage = '',
  title = 'Article Title Goes Here',
  subtitle = 'Article subtitle or excerpt',
  authorName = 'Author Name',
  authorImage = '',
  readTime = '5 min read',
  date = 'Jan 27',
}) => {
  return (
    <div className="w-full max-w-[700px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      {articleImage && (
        <div className="w-full h-[280px] bg-gray-200">
          <img src={articleImage} alt={title} className="w-full h-full object-cover" />
        </div>
      )}
      
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{title}</h2>
        <p className="text-base text-gray-600 mb-4">{subtitle}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
              {authorImage && <img src={authorImage} alt={authorName} className="w-full h-full object-cover" />}
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">{authorName}</p>
              <p className="text-xs text-gray-500">{date}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{readTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
