import React from "react";
import { Offer, UserRole } from "../types";
import ThumbnailImage from "./ThumbnailImage";

interface OfferCardProps {
  offer: Offer;
  currentRole: UserRole;
  userIdAsCarrier: string | undefined;
  onViewDetails: (offer: Offer) => void;
  onPlaceBid: (offer: Offer) => void;
}

const OfferCard: React.FC<OfferCardProps> = ({
  offer,
  currentRole,
  userIdAsCarrier,
  onViewDetails,
  onPlaceBid,
}) => {
  // A simple check to see if the current user (as carrier) has already bid
  const hasBid =
    currentRole === UserRole.Carrier && userIdAsCarrier
      ? offer.bids.some((b) => b.carrier.id === userIdAsCarrier)
      : false;

  const renderButton = () => {
    switch (currentRole) {
      case UserRole.Buyer:
        return (
          <button
            onClick={() => onViewDetails(offer)}
            className="w-full mt-auto bg-gradient-to-r from-brand-accent to-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:from-lime-400 hover:to-cyan-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30"
          >
            View Details
          </button>
        );
      case UserRole.Carrier:
        return (
          <button
            onClick={() => onPlaceBid(offer)}
            className="w-full mt-auto bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30"
          >
            {hasBid ? "Update Bid" : "Place Bid"}
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-brand-surface rounded-xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-1 border border-transparent hover:border-brand-primary/50">
      <ThumbnailImage
        key={offer.id}
        className="w-full h-56 object-cover"
        alt={offer.item.name}
        imageUrl={offer.item.imageUrls[0]}
        onClick={() => {}}
      />
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-brand-text-primary mb-2">
          {offer.item.name}
        </h3>
        <p className="text-sm text-brand-text-secondary mb-4 flex-grow line-clamp-3">
          {offer.item.description}
        </p>
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs text-brand-text-secondary">
            Seller: {offer.seller.name}
          </span>
          <span className="text-xl font-bold text-brand-primary">
            {offer.price > 0 ? `${offer.price} DMRK` : "Free"}
          </span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-semibold text-brand-primary">
            {offer.bids.length}{" "}
            {offer.bids.length === 1 ? "Carrier" : "Carriers"} Available
          </span>
        </div>
        {renderButton()}
      </div>
    </div>
  );
};

export default OfferCard;
