import React from 'react';

interface LinkedInArticleProps {
  authorName?: string;
  authorImage?: string;
  articleTitle?: string;
  articleImage?: string;
  readTime?: string;
}

export const LinkedInArticle: React.FC<LinkedInArticleProps> = ({
  authorName = 'Author Name',
  authorImage = '',
  articleTitle = 'Article Title: How to Succeed in Your Industry',
  articleImage = '',
  readTime = '5 min read',
}) => {
  return (
    <div className="w-full max-w-[552px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Article Image */}
      <div className="w-full h-[280px] bg-gray-200">
        {articleImage && (
          <img src={articleImage} alt="Article" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 leading-tight">{articleTitle}</h2>
        
        {/* Author Info */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
            {authorImage && (
              <img src={authorImage} alt={authorName} className="w-full h-full object-cover" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">{authorName}</p>
            <p className="text-xs text-gray-600">{readTime}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
