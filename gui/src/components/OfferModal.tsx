import React, { useState, useMemo } from "react";
import { Offer, CarrierBid } from "../types";
import RankingInput from "./RankingInput";

interface OfferModalProps {
  offer: Offer | null;
  onClose: () => void;
  onBuy: (offerId: number, bid: CarrierBid) => void;
}

const OfferModal: React.FC<OfferModalProps> = ({ offer, onClose, onBuy }) => {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedBid, setSelectedBid] = useState<CarrierBid | null>(null);

  React.useEffect(() => {
    if (offer?.imageUrls?.length) {
      setSelectedImageUrl(offer.imageUrls[0]);
    }
    setSelectedBid(null); // Reset selection when modal opens
  }, [offer]);

  if (!offer) return null;

  const handleBuy = () => {
    if (selectedBid) {
      onBuy(offer.id, selectedBid);
    }
  };

  const totalPrice = useMemo(() => {
    if (selectedBid) {
      return (offer.price + selectedBid.fee).toFixed(2);
    }
    return offer.price.toFixed(2);
  }, [offer.price, selectedBid]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] max-h-[700px] mx-auto flex overflow-hidden border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Image Thumbnails */}
        <div className="w-24 bg-brand-background p-4 overflow-y-auto">
          {offer.imageUrls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`${offer.name} thumbnail ${index + 1}`}
              onClick={() => setSelectedImageUrl(url)}
              className={`w-full aspect-square object-cover rounded-md mb-2 cursor-pointer border-2 transition-all ${
                selectedImageUrl === url
                  ? "border-brand-primary"
                  : "border-transparent hover:border-brand-secondary"
              }`}
            />
          ))}
        </div>

        {/* Center: Main Image */}
        <div className="flex-1 bg-black flex items-center justify-center p-4">
          <img
            src={selectedImageUrl || " "}
            alt={offer.name}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>

        {/* Right: Details & Purchase */}
        <div className="w-1/3 max-w-sm bg-brand-surface p-6 flex flex-col overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-brand-text-primary">
              {offer.name}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-brand-text-primary transition-colors text-2xl leading-none"
            >
              &times;
            </button>
          </div>

          <div className="flex items-center mb-4">
            <span className="text-sm text-brand-text-secondary mr-2">
              Sold by{" "}
              <span className="font-semibold text-brand-text-primary">
                {offer.seller.name}
              </span>
            </span>
            <RankingInput
              readOnly
              currentRating={offer.seller.ratings.average}
              size="sm"
            />
            <span className="text-xs text-brand-text-secondary ml-1">
              ({offer.seller.ratings.count})
            </span>
          </div>

          <p className="text-sm text-brand-text-secondary mb-6 flex-grow">
            {offer.description}
          </p>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-brand-text-primary mb-3">
              Choose a Carrier
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {offer.bids.length > 0 ? (
                offer.bids.map((bid) => (
                  <label
                    key={bid.carrier.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedBid?.carrier.id === bid.carrier.id
                        ? "border-brand-primary bg-cyan-500/10"
                        : "border-slate-700 hover:border-brand-secondary"
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="carrier-bid"
                        checked={selectedBid?.carrier.id === bid.carrier.id}
                        onChange={() => setSelectedBid(bid)}
                        className="h-4 w-4 text-brand-primary bg-slate-600 border-slate-500 focus:ring-brand-primary focus:ring-offset-brand-surface"
                      />
                      <div className="ml-3">
                        <p className="font-semibold text-sm text-brand-text-primary">
                          {bid.carrier.name}
                        </p>
                        <RankingInput
                          readOnly
                          currentRating={bid.carrier.ratings.average}
                          size="sm"
                        />
                      </div>
                    </div>
                    <span className="font-bold text-brand-text-primary">
                      {bid.fee.toFixed(2)} ETH
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-brand-text-secondary text-center p-4 bg-brand-background rounded-lg">
                  No carriers have bid on this item yet.
                </p>
              )}
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <span className="text-md text-brand-text-secondary">
                Item Price
              </span>
              <span className="text-lg font-bold text-brand-text-primary">
                {offer.price.toFixed(2)} ETH
              </span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-md text-brand-text-secondary">
                Delivery Fee
              </span>
              <span className="text-lg font-bold text-brand-text-primary">
                {selectedBid ? selectedBid.fee.toFixed(2) : "0.00"} ETH
              </span>
            </div>
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-bold text-brand-text-primary">
                Total Price
              </span>
              <span className="text-2xl font-bold text-brand-primary">
                {totalPrice} ETH
              </span>
            </div>
            <button
              onClick={handleBuy}
              disabled={!selectedBid}
              className="w-full bg-gradient-to-r from-brand-accent to-brand-primary text-white font-bold py-3 px-6 rounded-lg hover:from-lime-400 hover:to-cyan-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Buy with Selected Carrier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferModal;
