import React, { useState } from 'react';

interface RankingInputProps {
  currentRating?: bigint;
  onRate?: (rating: number) => void;
  disabled?: boolean;
  readOnly?: boolean;
  size?: 'sm' | 'md';
}

const Star: React.FC<{ filled: boolean; onMouseEnter?: () => void; onClick?: () => void; className?: string }> = ({
  filled,
  onMouseEnter,
  onClick,
  className,
}) => (
  <svg
    onMouseEnter={onMouseEnter}
    onClick={onClick}
    className={`w-5 h-5 transition-colors duration-200 ${className} ${filled ? 'text-yellow-400' : 'text-slate-600'}`}
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const RankingInput: React.FC<RankingInputProps> = ({
  currentRating = 0,
  onRate,
  disabled = false,
  readOnly = false,
  size = 'md',
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const isInteractive = !disabled && !readOnly && onRate;

  const handleClick = (rating: number) => {
    if (isInteractive) {
      onRate(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (isInteractive) {
      setHoverRating(rating);
    }
  };

  const handleMouseLeave = () => {
    if (isInteractive) {
      setHoverRating(0);
    }
  };

  const displayRating = hoverRating || currentRating;
  const starClassName = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const cursorClassName = isInteractive ? 'cursor-pointer' : 'cursor-default';

  return (
    <div className="flex items-center" onMouseLeave={handleMouseLeave}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          filled={index <= displayRating}
          onMouseEnter={() => handleMouseEnter(index)}
          onClick={() => handleClick(index)}
          className={`${starClassName} ${cursorClassName}`}
        />
      ))}
    </div>
  );
};

export default RankingInput;
