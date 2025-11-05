import React, { useCallback, useState } from 'react';
import { Offer } from '../types';
import { FormProps } from './DMarket';
import { handleErrorForRendering } from './WorkInProgressModal';

interface EtaModalProps {
  offer: Offer;
  formProps: FormProps;
  onClose: () => void;
}

const formatDate = (date: Date) => {
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const EtaModal: React.FC<EtaModalProps> = ({ offer, formProps, onClose }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const setOfferEta = useCallback(
    async (offerId: string, itemName: string, newEta: Date) => {
      if (formProps.dMarketApi) {
        try {
          const formattedEta = formatDate(newEta);
          formProps.setIsWorking({
            onClose: null,
            status: 'in-progress',
            task: 'Updating ETA for item delivery',
            desc: `Item: ${itemName} - New ETA: ${formattedEta}`,
          });
          await formProps.dMarketApi.setOfferEta(offerId, BigInt(newEta.getTime()));
          formProps.setIsWorking(null);
        } catch (error) {
          formProps.setIsWorking(handleErrorForRendering(error, 'Updating ETA for item delivery'));
        }
      }
    },
    [formProps.dMarketApi],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date && time) {
      onClose();
      // Format the date and time into a readable string
      const eta = new Date(`${date}T${time}`);
      setOfferEta(offer.id, offer.name, eta);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-brand-surface rounded-2xl shadow-2xl w-full max-w-sm mx-auto transform transition-all duration-300 scale-95 hover:scale-100 border border-slate-700">
        <div className="p-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-brand-text-primary">Update ETA</h2>
              <p className="text-sm text-brand-text-secondary">For Order #{`${offer.id.substring(0, 10)}...`}</p>
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
                <label htmlFor="eta-date" className="block text-sm font-medium text-brand-text-secondary mb-2">
                  Delivery Date
                </label>
                <input
                  type="date"
                  id="eta-date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-brand-background border border-slate-700 rounded-lg px-4 py-3 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
                  required
                />
              </div>
              <div>
                <label htmlFor="eta-time" className="block text-sm font-medium text-brand-text-secondary mb-2">
                  Delivery Time
                </label>
                <input
                  type="time"
                  id="eta-time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-brand-background border border-slate-700 rounded-lg px-4 py-3 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
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
                disabled={!date || !time}
                className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-brand-accent to-brand-primary rounded-lg hover:from-lime-400 hover:to-cyan-400 transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update ETA
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EtaModal;
