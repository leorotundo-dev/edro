import React from 'react';

interface SpotifyPodcastProps {
  coverImage?: string;
  postImage?: string;
  thumbnail?: string;
  podcastName?: string;
  title?: string;
  headline?: string;
  name?: string;
  host?: string;
  episodes?: number;
}

export const SpotifyPodcast: React.FC<SpotifyPodcastProps> = ({
  coverImage = '',
  postImage,
  thumbnail,
  podcastName = 'Podcast Name',
  title,
  headline,
  name,
  host = 'Host Name',
  episodes = 120,
}) => {
  const resolvedCoverImage = postImage ?? thumbnail ?? coverImage;
  const resolvedPodcastName = title ?? headline ?? name ?? podcastName;

  return (
    <div className="w-full max-w-[300px] bg-gradient-to-b from-gray-800 to-black rounded-lg p-6 shadow-lg">
      <div className="relative w-full aspect-square bg-gray-700 rounded shadow-xl mb-6">
        {resolvedCoverImage && <img src={resolvedCoverImage} alt={resolvedPodcastName} className="w-full h-full object-cover rounded" />}
      </div>
      <h2 className="text-white font-bold text-2xl mb-2">{resolvedPodcastName}</h2>
      <p className="text-gray-400 text-sm mb-1">{host}</p>
      <p className="text-gray-400 text-xs mb-6">{episodes} episodes</p>
      <button className="w-14 h-14 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center shadow-lg">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black fill-black ml-1"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </button>
    </div>
  );
};
