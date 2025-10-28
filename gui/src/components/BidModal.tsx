import React, { useState } from 'react';
import { Offer } from '../types';

interface BidModalProps {
  offer: Offer;
  onClose: () => void;
  onSubmit: (offerId: number, fee: number) => void;
}

const BidModal: React.FC<BidModalProps> = ({ offer, onClose, onSubmit }) => {
  const [fee, setFee] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const feeValue = parseFloat(fee);
    if (!isNaN(feeValue) && feeValue > 0) {
      onSubmit(offer.id, feeValue);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-brand-surface rounded-2xl shadow-2xl w-full max-w-sm mx-auto transform transition-all duration-300 scale-95 hover:scale-100 border border-slate-700">
        <div className="p-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-brand-text-primary">Place Your Bid</h2>
              <p className="text-sm text-brand-text-secondary">For "{offer.name}"</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-brand-text-primary transition-colors text-2xl leading-none">&times;</button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="bid-fee" className="block text-sm font-medium text-brand-text-secondary mb-2">Delivery Fee (ETH)</label>
                <input
                  type="number"
                  id="bid-fee"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className="w-full bg-brand-background border border-slate-700 rounded-lg px-4 py-3 text-brand-text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g., 0.1"
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