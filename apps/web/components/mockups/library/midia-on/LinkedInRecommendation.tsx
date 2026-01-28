import React from 'react';
import { ThumbsUp } from 'lucide-react';

interface LinkedInRecommendationProps {
  recommenderName?: string;
  recommenderImage?: string;
  recommenderTitle?: string;
  relationshipContext?: string;
  recommendationText?: string;
}

export const LinkedInRecommendation: React.FC<LinkedInRecommendationProps> = ({
  recommenderName = 'Recommender Name',
  recommenderImage = '',
  recommenderTitle = 'Job Title at Company',
  relationshipContext = 'Worked together at Company',
  recommendationText = 'It was a pleasure working with this professional. Their expertise and dedication made a significant impact on our team.',
}) => {
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
        <ThumbsUp className="w-5 h-5 text-blue-600" />
      </div>
      
      <p className="text-sm text-gray-700 leading-relaxed italic">"{recommendationText}"</p>
    </div>
  );
};
