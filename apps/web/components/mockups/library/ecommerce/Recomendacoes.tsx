import React from 'react';

interface RecomendacoesProps {
  title?: string;
  headline?: string;
  name?: string;
  subtitle?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  price?: string;
  brandColor?: string;
}

export const Recomendacoes: React.FC<RecomendacoesProps> = ({
  title: titleProp,
  headline,
  name,
  subtitle = 'Product description',
  image: imageProp,
  postImage,
  thumbnail,
  price = '$99.99',
  brandColor = '#f97316',
}) => {
  const title = titleProp ?? headline ?? name ?? 'Product Title';
  const image = imageProp ?? postImage ?? thumbnail ?? '';
  return (
    <div className="relative w-full max-w-[800px] h-[500px] bg-white rounded-lg overflow-hidden shadow-xl border-2 border-gray-200">
      <div className="h-full flex flex-col p-8">
        <div className="flex-1 flex items-center justify-center">
          {image ? (
            <img src={image} alt={title} className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            </div>
          )}
        </div>

        <div className="mt-6">
          <h2 className="text-3xl font-black text-gray-900 mb-2">{title}</h2>
          <p className="text-lg text-gray-600 mb-3">{subtitle}</p>
          <div
            className="text-4xl font-black"
            style={{ color: brandColor }}
          >
            {price}
          </div>
        </div>
      </div>

      <div className="absolute top-3 right-3 bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        Recomendações
      </div>

      <div className="absolute bottom-3 left-3 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
        E-commerce
      </div>
    </div>
  );
};
