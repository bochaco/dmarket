import React from "react";

interface ThumbnailImageProps {
  key: any;
  alt: string;
  imageUrl: string;
  className: string;
  onClick: () => void;
}

const ThumbnailImage: React.FC<ThumbnailImageProps> = ({
  key,
  alt,
  imageUrl,
  className,
  onClick,
}) => {
  const placeholderUrl = `/image-not-found.svg`;
  const isValidHttpUrl = (string: string): boolean => {
    try {
      const url = new URL(string);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      return false;
    }
  };
  const thumbnailUrl = isValidHttpUrl(imageUrl) ? imageUrl : placeholderUrl;
  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>,
  ) => {
    e.currentTarget.src = placeholderUrl;
  };

  return (
    <>
      <img
        key={key}
        className={className}
        src={thumbnailUrl}
        alt={alt}
        onError={handleImageError}
        onClick={onClick}
      />
    </>
  );
};

export default ThumbnailImage;
