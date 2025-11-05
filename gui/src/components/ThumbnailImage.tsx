import React from 'react';

interface ThumbnailImageProps {
  alt: string;
  imageUrl: string;
  className: string;
}

const ThumbnailImage: React.FC<ThumbnailImageProps> = ({ alt, imageUrl, className }) => {
  const placeholderUrl = `/image-not-found.svg`;
  const isValidHttpUrl = (string: string): boolean => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };
  const thumbnailUrl = isValidHttpUrl(imageUrl) ? imageUrl : placeholderUrl;
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = placeholderUrl;
  };

  return (
    <>
      <img className={className} src={thumbnailUrl} alt={alt} onError={handleImageError} />
    </>
  );
};

export default ThumbnailImage;
