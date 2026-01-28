import React from 'react';

interface CabineTelefonicaProps {
  adImage?: string;
  brandLogo?: string;
  headline?: string;
  subheadline?: string;
}

export const CabineTelefonica: React.FC<CabineTelefonicaProps> = ({
  adImage = '',
  brandLogo = '',
  headline = 'Your Headline Here',
  subheadline = 'Subheadline or call to action',
}) => {
  return (
    <div className="relative w-[250px] h-[500px] bg-white border-2 border-gray-300 rounded overflow-hidden shadow-lg">
      <div className="absolute inset-0 bg-gray-200">
        {adImage && <img src={adImage} alt="Ad" className="w-full h-full object-cover" />}
      </div>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-t from-black/60 to-transparent">
        {brandLogo && (
          <div className="w-24 h-24 mb-4">
            <img src={brandLogo} alt="Brand" className="w-full h-full object-contain drop-shadow-lg" />
          </div>
        )}
        <h2 className="text-white text-2xl md:text-4xl font-black text-center mb-2 drop-shadow-lg">{headline}</h2>
        <p className="text-white text-base md:text-xl font-semibold text-center drop-shadow-lg">{subheadline}</p>
      </div>
      
      <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
        Cabine Telefônica
      </div>
      
      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
        Variable
      </div>
    </div>
  );
};
