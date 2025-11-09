import React, { useCallback, useState, useMemo } from "react";
import { Offer, CarrierBid } from "../types";
import { FormProps } from "./DMarket";
import RankingInput from "./RankingInput";
import ThumbnailImage from "./ThumbnailImage";
import { handleErrorForRendering } from "./WorkInProgressModal";

interface OfferModalProps {
  offer: Offer | null;
  onClose: () => void;
  formProps: FormProps;
}

const OfferModal: React.FC<OfferModalProps> = ({
  offer,
  onClose,
  formProps,
}) => {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedBid, setSelectedBid] = useState<CarrierBid | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");

  React.useEffect(() => {
    if (offer?.imageUrls?.length) {
      setSelectedImageUrl(offer.imageUrls[0]);
    }
    setSelectedBid(null); // Reset selection when modal opens
  }, [offer]);

  if (!offer) return null;

  const buyOfferWithCarrier = useCallback(
    async (
      itemName: string,
      offerId: string,
      bid: CarrierBid,
      totalAmount: bigint,
      deliveryAddress: string,
    ) => {
      if (formProps.dMarketApi) {
        try {
          formProps.setIsWorking({
            onClose: null,
            status: "in-progress",
            task: "Purchasing an offered item",
            desc: `Item: ${itemName}, Total amount: ${totalAmount} DMRK`,
          });
          await formProps.dMarketApi.purchaseItem(
            offerId,
            bid.carrier.id,
            totalAmount,
            deliveryAddress,
          );
          formProps.setIsWorking(null);
        } catch (error) {
          formProps.setIsWorking(
            handleErrorForRendering(error, "Purchasing an offered item"),
          );
        }
      }
    },
    [formProps.dMarketApi],
  );

  const handleBuy = () => {
    if (selectedBid) {
      onClose();
      buyOfferWithCarrier(
        offer.name,
        offer.id,
        selectedBid,
        totalPrice,
        deliveryAddress,
      );
    }
  };

  const totalPrice = useMemo(() => {
    if (selectedBid) {
      return offer.price + selectedBid.fee;
    }
    return offer.price;
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
            <ThumbnailImage
              key={index}
              className={`w-full aspect-square object-cover rounded-md mb-2 cursor-pointer border-2 transition-all ${
                selectedImageUrl === url
                  ? "border-brand-primary"
                  : "border-transparent hover:border-brand-secondary"
              }`}
              alt={`${offer.name} thumbnail ${index + 1}`}
              imageUrl={url}
              onClick={() => setSelectedImageUrl(url)}
            />
          ))}
        </div>

        {/* Center: Main Image */}
        <div className="flex-1 bg-black flex items-center justify-center p-4">
          <ThumbnailImage
            key={offer.id}
            className="max-w-full max-h-full object-contain rounded-lg"
            imageUrl={selectedImageUrl || " "}
            alt={offer.name}
            onClick={() => {}}
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
                      {bid.fee} DMRK
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
            <div className="mb-4">
              <label
                htmlFor="delivery-address"
                className="block text-sm font-medium text-brand-text-secondary mb-2"
              >
                Delivery Address
              </label>
              <textarea
                id="delivery-address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full bg-brand-background border border-slate-700 rounded-lg px-4 py-2 text-brand-text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
                rows={3}
                placeholder="Enter your full delivery address"
                required
              />
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="text-md text-brand-text-secondary">
                Item Price
              </span>
              <span className="text-lg font-bold text-brand-text-primary">
                {offer.price} DMRK
              </span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-md text-brand-text-secondary">
                Delivery Fee
              </span>
              <span className="text-lg font-bold text-brand-text-primary">
                {selectedBid ? selectedBid.fee : "0"} DMRK
              </span>
            </div>
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-bold text-brand-text-primary">
                Total Price
              </span>
              <span className="text-2xl font-bold text-brand-primary">
                {totalPrice > 0 ? `${totalPrice} DMRK` : "Free"}
              </span>
            </div>
            <button
              onClick={handleBuy}
              disabled={!selectedBid || !deliveryAddress.trim()}
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
