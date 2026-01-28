import React from 'react';

interface TikTokStitchProps {
  originalVideo?: string;
  stitchVideo?: string;
  originalUsername?: string;
  stitchUsername?: string;
  caption?: string;
}

export const TikTokStitch: React.FC<TikTokStitchProps> = ({
  originalVideo = '',
  stitchVideo = '',
  originalUsername = '@original',
  stitchUsername = '@stitcher',
  caption = 'Stitching this amazing video!',
}) => {
  return (
    <div className="relative w-full max-w-[375px] h-[667px] bg-black rounded-lg overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="h-1/2 bg-gray-800 relative">
          {originalVideo && <img src={originalVideo} alt="Original" className="w-full h-full object-cover" />}
          <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
            {originalUsername}
          </div>
          <div className="absolute top-3 left-3 bg-pink-600 text-white text-xs px-2 py-1 rounded font-semibold">
            Stitched
          </div>
        </div>
        
        <div className="h-1/2 bg-gray-900 relative">
          {stitchVideo && <img src={stitchVideo} alt="Stitch" className="w-full h-full object-cover" />}
          <div className="absolute bottom-20 left-4 right-4">
            <p className="text-white text-sm font-semibold mb-1">{stitchUsername}</p>
            <p className="text-white text-sm">{caption}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
