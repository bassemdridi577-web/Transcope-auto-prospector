import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackCategory?: string;
}

const FALLBACK_IMAGES: Record<string, string> = {
  transformers: 'https://images.unsplash.com/photo-1558449028-b53a39d100fc?w=800&h=600&fit=crop',
  opportunities: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop',
  rawMaterials: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=600&fit=crop',
  photovoltaic: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=600&fit=crop',
  news: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop',
};

export default function SafeImage({ src, alt, className, fallbackCategory = 'transformers', ...props }: SafeImageProps) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (error || !src) {
    return (
      <div className={`bg-[#0A0F1D] flex flex-col items-center justify-center gap-2 ${className}`}>
        <ImageOff className="w-8 h-8 text-app-muted opacity-20" />
        <span className="text-[10px] text-app-muted/30 uppercase tracking-widest px-4 text-center line-clamp-1">
          {alt || 'Image non disponible'}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-[#0A0F1D] animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
    </div>
  );
}
