import React, { useState } from 'react';
// Fix: Import Order and DisputeResolutionType from types.ts, not App.tsx
import { Order, DisputeResolutionType } from '../types';

interface DisputeModalProps {
  order: Order;
  onClose: () => void;
  onSubmit: (orderId: number, resolution: DisputeResolutionType, reason: string) => void;
}

const DisputeModal: React.FC<DisputeModalProps> = ({ order, onClose, onSubmit }) => {
  const [resolution, setResolution] = useState<DisputeResolutionType | null>(null);
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resolution && reason) {
      onSubmit(order.id, resolution, reason);
    }
  };

  const resolutionOptions: { id: DisputeResolutionType; title: string; description: string; }[] = [
    {
      id: 'refund',
      title: 'Issue Full Refund',
      description: 'The buyer will be fully refunded. The order will be marked as "Refunded".',
    },
    {
      id: 'reject',
      title: 'Reject Dispute & Finalize Payment',
      description: 'The dispute will be closed, and the order will be marked as "Completed".',
    },
    {
      id: 'escalate',
      title: 'Escalate to Arbitrator',
      description: 'A neutral third party will review the case. The order will be marked "Awaiting Arbitration".',
    },
    {
      id: 'confiscate',
      title: "Confiscate Carrier's Deposit",
      description: "Select if carrier failed delivery (e.g., lost/damaged item). This refunds the buyer from the deposit.",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-brand-surface rounded-2xl shadow-2xl w-full max-w-lg mx-auto transform transition-all duration-300 scale-95 hover:scale-100 border border-slate-700">
        <div className="p-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-brand-text-primary">Dispute Resolution Center</h2>
              <p className="text-sm text-brand-text-secondary">Managing dispute for Order #{order.id}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-brand-text-primary transition-colors">&times;</button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 mb-6">
              <p className="text-sm text-brand-text-secondary">Select a resolution for the dispute regarding <span className="font-bold text-brand-text-primary">"{order.offer.name}"</span>.</p>
              
              <div className="space-y-3">
                {resolutionOptions.map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      resolution === option.id ? 'border-brand-primary bg-cyan-500/10' : 'border-slate-700 hover:border-brand-secondary'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resolution"
                      value={option.id}
                      checked={resolution === option.id}
                      onChange={() => setResolution(option.id as DisputeResolutionType)}
                      className="h-4 w-4 text-brand-primary bg-slate-600 border-slate-500 focus:ring-brand-primary focus:ring-offset-brand-surface"
                    />
                    <div className="ml-4">
                      <p className="font-semibold text-brand-text-primary">{option.title}</p>
                      <p className="text-xs text-brand-text-secondary">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="reason" className="block text-sm font-medium text-brand-text-secondary mb-2">Reasoning / Message to Buyer</label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a clear reason for your decision..."
                className="w-full bg-brand-background border border-slate-700 rounded-lg px-4 py-3 text-brand-text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
                rows={4}
                required
              />
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
                disabled={!resolution || !reason}
                className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-brand-accent to-brand-primary rounded-lg hover:from-lime-400 hover:to-cyan-400 transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Resolution
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DisputeModal;