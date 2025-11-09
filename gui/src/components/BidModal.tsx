import React, { useEffect, useCallback, useState } from "react";
import { Offer } from "../types";
import { FormProps } from "./DMarket";
import { handleErrorForRendering } from "./WorkInProgressModal";

interface BidModalProps {
  offer: Offer;
  userName: string;
  userIdAsCarrier: string | undefined;
  onClose: () => void;
  formProps: FormProps;
}

const BidModal: React.FC<BidModalProps> = ({
  offer,
  userName,
  userIdAsCarrier,
  onClose,
  formProps,
}) => {
  const [fee, setFee] = useState("");

  useEffect(() => {
    const bid = offer.bids.find((b) => b.carrier.id === userIdAsCarrier);
    if (bid) {
      setFee(bid.fee.toString());
    }
  }, [userIdAsCarrier]);

  const handlePlaceBid = useCallback(
    async (offerId: string, feeValue: bigint, carrierMeta: string) => {
      if (formProps.dMarketApi) {
        try {
          formProps.setIsWorking({
            onClose: null,
            status: "in-progress",
            task: "Adding a fee bid to the offer",
            desc: `Item: ${offer.name}`,
          });
          await formProps.dMarketApi.setCarrierBid(
            offerId,
            feeValue,
            carrierMeta,
          );
          formProps.setIsWorking(null);
        } catch (error) {
          formProps.setIsWorking(
            handleErrorForRendering(error, "Adding a fee bid to the offer"),
          );
        }
      }
    },
    [formProps.dMarketApi],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const feeValue = BigInt(fee);
    if (feeValue > 0) {
      onClose();
      // TODO: pre register the carrier
      const carrierMeta = JSON.stringify({ name: userName });
      await handlePlaceBid(offer.id, feeValue, carrierMeta);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-brand-surface rounded-2xl shadow-2xl w-full max-w-sm mx-auto transform transition-all duration-300 scale-95 hover:scale-100 border border-slate-700">
        <div className="p-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-brand-text-primary">
                Place Your Bid
              </h2>
              <p className="text-sm text-brand-text-secondary">
                For "{offer.name}"
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-brand-text-primary transition-colors text-2xl leading-none"
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 mb-6">
              <div>
                <label
                  htmlFor="bid-fee"
                  className="block text-sm font-medium text-brand-text-secondary mb-2"
                >
                  Delivery Fee (DMRK)
                </label>
                <input
                  type="number"
                  id="bid-fee"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className="w-full bg-brand-background border border-slate-700 rounded-lg px-4 py-3 text-brand-text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
                  step="1"
                  min="1"
                  placeholder="e.g., 100"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-sm font-bold text-brand-text-primary bg-slate-600 rounded-lg hover:bg-slate-500 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!fee}
                className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-brand-accent to-brand-primary rounded-lg hover:from-lime-400 hover:to-cyan-400 transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Bid
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BidModal;
