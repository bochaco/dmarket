import React, { useCallback, useRef, useState } from "react";
import { FormProps } from "./DMarket";
import { handleErrorForRendering } from "./WorkInProgressModal";
import {
  MAX_OFFER_IMAGES_BYTES,
  type NewOfferContent,
  type OfferContentStore,
} from "../../../api/src/index";

const hash256 = async (data: Uint8Array): Promise<Uint8Array> => {
  const hashBuffer = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
  return new Uint8Array(hashBuffer);
};

const readImageFiles = (
  files: File[],
): Promise<NewOfferContent["images"]> =>
  Promise.all(
    files.map(async (file) => ({
      bytes: new Uint8Array(await file.arrayBuffer()),
      mimeType: file.type,
    })),
  );

interface CreateOfferFormProps {
  userName: string;
  offerContent: OfferContentStore | undefined;
  formProps: FormProps;
}

const CreateOfferForm: React.FC<CreateOfferFormProps> = ({
  userName,
  offerContent,
  formProps,
}) => {
  const { dMarketApi, setIsWorking } = formProps;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const imagesSize = imageFiles.reduce((acc, file) => acc + file.size, 0);
  const imagesTooLarge = imagesSize > MAX_OFFER_IMAGES_BYTES;

  const createOffer = useCallback(
    async (content: NewOfferContent, itemPrice: bigint, sellerMeta: string) => {
      if (dMarketApi && offerContent) {
        const task = "Publishing a new offer";
        try {
          setIsSubmitting(true);
          setIsWorking({
            onClose: null,
            status: "in-progress",
            task,
            desc: `Storing the item's metadata and images in dStorage: ${content.name}`,
          });
          const { metaRef, docBytes } = await offerContent.publishOffer(content);

          setIsWorking({
            onClose: null,
            status: "in-progress",
            task,
            desc: `Publishing the offer in dMarket: ${content.name}`,
          });
          const id = await hash256(docBytes);
          await dMarketApi.offerItem(id, itemPrice, metaRef, sellerMeta);
          setIsWorking(null);
          setName("");
          setDescription("");
          setPrice("");
          setImageFiles([]);
          if (imageInputRef.current) {
            imageInputRef.current.value = "";
          }
        } catch (error) {
          setIsWorking(handleErrorForRendering(error, task));
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [dMarketApi, offerContent],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      dMarketApi &&
      offerContent &&
      name &&
      price &&
      imageFiles.length > 0 &&
      !imagesTooLarge &&
      !isSubmitting
    ) {
      const images = await readImageFiles(imageFiles);
      // TODO: pre register the seller
      const sellerMeta = JSON.stringify({ name: userName });
      await createOffer(
        { name, description, images },
        BigInt(price),
        sellerMeta,
      );
    }
  };

  return (
    <div className="bg-brand-surface p-8 rounded-xl shadow-2xl shadow-slate-900/50 mb-12 border border-slate-700">
      <h2 className="text-3xl font-bold mb-6 text-center text-brand-text-primary">
        Create a New Offer
      </h2>
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
        <div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
            className="w-full bg-brand-background border border-slate-700 rounded-lg px-4 py-3 text-brand-text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-brand-primary file:px-4 file:py-2 file:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
            required
          />
          <p
            className={`mt-2 text-sm ${imagesTooLarge ? "text-red-400" : "text-slate-500"}`}
          >
            Images are stored off-chain with dStorage (
            {(imagesSize / (1024 * 1024)).toFixed(2)} MB of{" "}
            {MAX_OFFER_IMAGES_BYTES / (1024 * 1024)} MB max)
          </p>
        </div>
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
          disabled={isSubmitting || imagesTooLarge || !offerContent}
          className="w-full bg-gradient-to-r from-brand-accent to-brand-primary text-white font-bold py-3 px-6 rounded-lg hover:from-lime-400 hover:to-cyan-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Publishing..." : "Publish Offer"}
        </button>
      </form>
    </div>
  );
};

export default CreateOfferForm;
