import React, { useCallback, useState } from 'react';
import { FormProps } from './DMarket';
import { handleErrorForRendering } from './WorkInProgressModal';

const hash256 = async (str: string): Promise<Uint8Array> => {
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', uint8Array);
  return new Uint8Array(hashBuffer);
};

const CreateOfferForm: React.FC<FormProps> = ({ dMarketApi, setIsWorking }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createOffer = useCallback(
    async (itemName: string, meta: string, itemPrice: bigint, sellerMeta: string) => {
      if (dMarketApi) {
        try {
          setIsSubmitting(true);
          setIsWorking({
            onClose: null,
            status: 'in-progress',
            task: 'Publishing a new offer',
            desc: `Item: ${itemName}`,
          });
          const id = await hash256(meta);
          await dMarketApi.offerItem(id, itemPrice, meta, sellerMeta);
          setIsWorking(null);
          setName('');
          setDescription('');
          setPrice('');
          setImageUrl('');
        } catch (error) {
          setIsWorking(handleErrorForRendering(error, 'Publishing a new offer'));
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [dMarketApi],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dMarketApi && name && price && imageUrl && !isSubmitting) {
      const itemMeta = JSON.stringify({ name, imageUrl, description });
      // TODO: pre register the seller
      const sellerMeta = JSON.stringify({ name: 'Peter' });
      await createOffer(name, itemMeta, BigInt(price), sellerMeta);
    }
  };

  return (
    <div className="bg-brand-surface p-8 rounded-xl shadow-2xl shadow-slate-900/50 mb-12 border border-slate-700">
      <h2 className="text-3xl font-bold mb-6 text-center text-brand-text-primary">Create a New Offer</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input
            type="text"
            placeholder="Item Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-brand-background border border-slate-700 rounded-lg px-4 py-3 text-brand-text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
            required
          />
          <input
            type="number"
            placeholder="Price (DMRK)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-brand-background border border-slate-700 rounded-lg px-4 py-3 text-brand-text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
            step="0.01"
            min="0"
            required
          />
        </div>
        <input
          type="text"
          placeholder="Image URL (e.g., https://picsum.photos/400)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full bg-brand-background border border-slate-700 rounded-lg px-4 py-3 text-brand-text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
          required
        />
        <textarea
          placeholder="Item Description (Optional, AI will generate if left empty)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-brand-background border border-slate-700 rounded-lg px-4 py-3 text-brand-text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
          rows={4}
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-brand-accent to-brand-primary text-white font-bold py-3 px-6 rounded-lg hover:from-lime-400 hover:to-cyan-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Publishing...' : 'Publish Offer'}
        </button>
      </form>
    </div>
  );
};

export default CreateOfferForm;
