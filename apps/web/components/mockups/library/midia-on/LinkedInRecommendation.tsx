import React from 'react';

interface LinkedInRecommendationProps {
  recommenderName?: string;
  recommenderImage?: string;
  recommenderTitle?: string;
  relationshipContext?: string;
  recommendationText?: string;
  content?: string;
  text?: string;
  body?: string;
}

export const LinkedInRecommendation: React.FC<LinkedInRecommendationProps> = ({
  recommenderName = 'Recommender Name',
  recommenderImage = '',
  recommenderTitle = 'Job Title at Company',
  relationshipContext = 'Worked together at Company',
  recommendationText = 'It was a pleasure working with this professional. Their expertise and dedication made a significant impact on our team.',
  content,
  text,
  body,
}) => {
  const resolvedRecommendationText = content ?? text ?? body ?? recommendationText;

  return (
    <div className="w-full max-w-[600px] bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {recommenderImage && <img src={recommenderImage} alt={recommenderName} className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-base text-gray-900">{recommenderName}</h4>
          <p className="text-sm text-gray-600">{recommenderTitle}</p>
          <p className="text-xs text-gray-500 mt-1">{relationshipContext}</p>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed italic">"{resolvedRecommendationText}"</p>
    </div>
  );
};
