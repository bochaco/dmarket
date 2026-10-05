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
  // Images are either http(s) URLs, or data URLs of images stored in dStorage
  const isValidImageUrl = (string: string): boolean => {
    if (string.startsWith("data:image/")) {
      return true;
    }
    try {
      const url = new URL(string);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      return false;
    }
  };
  const thumbnailUrl = isValidImageUrl(imageUrl) ? imageUrl : placeholderUrl;
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
