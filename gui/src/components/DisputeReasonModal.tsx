import React, { useCallback, useState } from 'react';
import { Offer, DisputeReasonType } from '../types';
import { FormProps } from './DMarket';
import { handleErrorForRendering } from './WorkInProgressModal';

interface DisputeReasonModalProps {
  offer: Offer | null;
  formProps: FormProps;
  onClose: () => void;
}

const DisputeReasonModal: React.FC<DisputeReasonModalProps> = ({ offer, formProps, onClose }) => {
  const [reason, setReason] = useState('');
  const [dispute, setDispute] = useState<DisputeReasonType | null>(null);

  const disputeItem = useCallback(
    async (offerId: string, itemName: string, dispute: DisputeReasonType, reason: string) => {
      if (formProps.dMarketApi) {
        try {
          formProps.setIsWorking({
            onClose: null,
            status: 'in-progress',
            task: 'Starting a dispute process for the item',
            desc: `Item: ${itemName} - ${dispute}`,
          });
          await formProps.dMarketApi.disputeItem(offerId);
          formProps.setIsWorking(null);
        } catch (error) {
          formProps.setIsWorking(handleErrorForRendering(error, 'Starting a dispute process for the item'));
        }
      }
    },
    [formProps.dMarketApi],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dispute && reason && offer) {
      onClose();
      disputeItem(offer.id, offer.name, dispute, reason);
    }
  };

  const disputeReasonOptions: {
    id: DisputeReasonType;
    title: string;
  }[] = [
    {
      id: 'Defective',
      title: 'It is defective',
    },
    {
      id: 'Regreted',
      title: 'I regret the purchase',
    },
    {
      id: 'Wrong size',
      title: 'It is not the size I ordered',
    },
    {
      id: 'Other',
      title: 'Other reason',
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface rounded-2xl shadow-2xl w-full max-w-md mx-auto transform transition-all duration-300 scale-95 hover:scale-100 border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-brand-text-primary">Dispute Details</h2>
              <p className="text-sm text-brand-text-secondary">For Offer #{`${offer?.id.substring(0, 10)}...`}</p>
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
              <p className="text-sm text-brand-text-secondary">
                Select a reason for the dispute regarding{' '}
                <span className="font-bold text-brand-text-primary">"{offer?.name}"</span>.
              </p>

              <div className="space-y-3">
                {disputeReasonOptions.map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      dispute === option.id
                        ? 'border-brand-primary bg-cyan-500/10'
                        : 'border-slate-700 hover:border-brand-secondary'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resolution"
                      value={option.id}
                      checked={dispute === option.id}
                      onChange={() => setDispute(option.id as DisputeReasonType)}
                      className="h-4 w-4 text-brand-primary bg-slate-600 border-slate-500 focus:ring-brand-primary focus:ring-offset-brand-surface"
                    />
                    <div className="ml-4">
                      <p className="font-semibold text-brand-text-primary">{option.title}</p>
                    </div>
                  </label>
                ))}
              </div>

              <label htmlFor="reason" className="block text-sm font-medium text-brand-text-secondary mb-2">
                Reason Provided by Buyer:
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a clear reason for the dispute..."
                className="w-full bg-brand-background border border-slate-700 rounded-lg px-4 py-3 text-brand-text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={onClose}
                className="px-8 py-2 text-sm font-bold text-white bg-gradient-to-r from-brand-accent to-brand-primary rounded-lg hover:from-lime-400 hover:to-cyan-400 transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/30"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!reason || !dispute}
                className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-brand-accent to-brand-primary rounded-lg hover:from-lime-400 hover:to-cyan-400 transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Open Dispute
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DisputeReasonModal;
