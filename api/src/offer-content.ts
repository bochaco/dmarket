/**
 * Off-chain storage of offers' content (metadata and images) using the dStorage SDK.
 *
 * Each offer's content is serialised into a single JSON document, with images embedded
 * as base64, and stored with one `dstorage.store()` call. The returned dStorage reference
 * ID (`Bytes<32>`) is the only thing recorded in the DMarket contract (`Offer.metaRef`).
 *
 * See https://dstorage.pro and https://github.com/dstoragetech/dstorage-sdk
 *
 * @packageDocumentation
 */

import {
  ArweaveLocalStorageAdapter,
  DStorage,
  PasswordEncryptionAdapter,
  hexToBytes,
  isDStorageError,
  type ChainAdapter,
  type MinimalLogger,
} from '@dstorage-tech/dstorage-sdk';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { type Logger } from 'pino';

/** Current version of the offer document schema. */
export const OFFER_DOC_VERSION = 1;

/** Maximum total size (in bytes) of the raw images attached to an offer. */
export const MAX_OFFER_IMAGES_BYTES = 5 * 1024 * 1024;

/** An image embedded in an offer document. */
export interface OfferImage {
  readonly mimeType: string;
  /** Standard base64 encoding of the image bytes. */
  readonly data: string;
}

/** The off-chain document holding an offer's content. */
export interface OfferDocument {
  readonly v: number;
  readonly name: string;
  readonly description: string;
  readonly images: OfferImage[];
}

/** The content of a new offer to be published. */
export interface NewOfferContent {
  readonly name: string;
  readonly description: string;
  readonly images: { bytes: Uint8Array; mimeType: string }[];
}

/** Result of publishing an offer's content. */
export interface PublishedOfferContent {
  /** The dStorage reference ID, as a hex string. */
  readonly metaRefHex: string;
  /** The dStorage reference ID, as the bytes to be stored in the contract. */
  readonly metaRef: Uint8Array;
  /** The serialised offer document that was stored. */
  readonly docBytes: Uint8Array;
}

const OFFER_DOC_SALT = 'dmarket:offer:v1';
const PASSWORD_DOMAIN = 'dmarket:dstorage:password:v1';

/**
 * Creates and initialises a `DStorage` instance for storing offers' content, using an
 * arlocal storage adapter and the given chain adapter.
 *
 * Offers are stored public (unencrypted), but dStorage still requires an encryption
 * adapter to wrap the reference owner's secret, which is derived from the user's secret.
 *
 * @returns The `DStorage` instance and the address of the DataRegistry contract it's using,
 * which is deployed by `init()` if the chain adapter wasn't given one.
 */
export const createDStorage = async (
  chainAdapter: ChainAdapter,
  userSecret: Uint8Array,
  logger?: MinimalLogger,
): Promise<{ dstorage: DStorage; dataRegistryAddress: string }> => {
  const { adapter: storageAdapter } = await ArweaveLocalStorageAdapter.createWithTestWallet({ fundAr: 5 });
  const encryptionAdapter = await createPasswordEncryptionAdapter(userSecret);
  const dstorage = new DStorage({
    storageAdapters: [storageAdapter],
    chainAdapters: [chainAdapter],
    encryptionAdapters: [encryptionAdapter],
    logger,
  });
  const dataRegistryAddress = await dstorage.init();
  if (!dataRegistryAddress) {
    throw new Error('dStorage did not return a DataRegistry contract address');
  }
  return { dstorage, dataRegistryAddress };
};

/**
 * Adapts a `pino` logger to the logger interface expected by the dStorage SDK.
 */
export const toDStorageLogger = (logger: Logger): MinimalLogger => ({
  log: (component, msg) => logger.info({ component }, msg),
  warn: (component, msg) => logger.warn({ component }, msg),
  error: (component, msg) => logger.error({ component }, msg),
  debug: (component, msg) => logger.debug({ component }, msg),
});

/**
 * Derives a deterministic high-entropy password from the user's secret, as dStorage
 * rejects weak passwords. In the unlikely case the derived password trips one of the
 * dStorage weak-pattern heuristics, the next derivation (by counter) is used.
 */
const createPasswordEncryptionAdapter = async (userSecret: Uint8Array): Promise<PasswordEncryptionAdapter> => {
  const domain = new TextEncoder().encode(PASSWORD_DOMAIN);
  for (let counter = 0; counter < 32; counter++) {
    const input = new Uint8Array(domain.length + 1 + userSecret.length);
    input.set(domain);
    input[domain.length] = counter;
    input.set(userSecret, domain.length + 1);
    const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', input));
    try {
      return new PasswordEncryptionAdapter({ password: bytesToBase64(digest), salt: OFFER_DOC_SALT });
    } catch (err) {
      if (!isDStorageError(err)) throw err;
    }
  }
  throw new Error('Failed to derive a dStorage password from the user secret');
};

/**
 * Publishes and fetches offers' content to/from dStorage.
 */
export class OfferContentStore {
  readonly #cache = new Map<string, Promise<OfferDocument>>();

  constructor(
    readonly dstorage: DStorage,
    readonly dataRegistryAddress: string,
  ) {}

  /**
   * Stores the offer's content in dStorage with a single `store()` call.
   */
  async publishOffer(content: NewOfferContent): Promise<PublishedOfferContent> {
    const imagesSize = content.images.reduce((acc, img) => acc + img.bytes.length, 0);
    if (imagesSize > MAX_OFFER_IMAGES_BYTES) {
      throw new Error(
        `Images are too large (${imagesSize} bytes), maximum allowed is ${MAX_OFFER_IMAGES_BYTES} bytes in total`,
      );
    }

    const doc: OfferDocument = {
      v: OFFER_DOC_VERSION,
      name: content.name,
      description: content.description,
      images: content.images.map((img) => ({ mimeType: img.mimeType, data: bytesToBase64(img.bytes) })),
    };
    const docBytes = new TextEncoder().encode(JSON.stringify(doc));

    const { chainRefId } = await this.dstorage.store(docBytes, {
      isPublic: true,
      tags: { 'Content-Type': 'application/json', App: 'dmarket' },
    });
    if (!chainRefId) {
      throw new Error('dStorage did not return a reference ID for the offer content');
    }

    const metaRefHex = chainRefId.toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(metaRefHex)) {
      throw new Error(`Unexpected dStorage reference ID format (expected 32 bytes in hex): ${chainRefId}`);
    }
    this.#cache.set(metaRefHex, Promise.resolve(doc));
    return { metaRefHex, metaRef: hexToBytes(metaRefHex, 'metaRef'), docBytes };
  }

  /**
   * Fetches and parses the offer document referenced by `metaRef`. Results are cached
   * since an offer's reference never changes.
   */
  fetchOffer(metaRef: Uint8Array | string): Promise<OfferDocument> {
    const refId = typeof metaRef === 'string' ? metaRef.toLowerCase() : toHex(metaRef);
    let doc = this.#cache.get(refId);
    if (!doc) {
      doc = this.dstorage.retrieveByRefId(refId).then(({ bytes }) => parseOfferDocument(bytes));
      // don't cache failures so they can be retried
      doc.catch(() => this.#cache.delete(refId));
      this.#cache.set(refId, doc);
    }
    return doc;
  }
}

/**
 * Parses and validates a serialised offer document.
 */
export const parseOfferDocument = (bytes: Uint8Array): OfferDocument => {
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<OfferDocument>;
  if (parsed.v !== OFFER_DOC_VERSION) {
    throw new Error(`Unsupported offer document version: ${String(parsed.v)}`);
  }
  return {
    v: parsed.v,
    name: typeof parsed.name === 'string' ? parsed.name : '',
    description: typeof parsed.description === 'string' ? parsed.description : '',
    images: Array.isArray(parsed.images)
      ? parsed.images.filter(
          (img): img is OfferImage => typeof img?.mimeType === 'string' && typeof img?.data === 'string',
        )
      : [],
  };
};

/** Returns a `data:` URL for an image embedded in an offer document. */
export const offerImageDataUrl = (img: OfferImage): string => `data:${img.mimeType};base64,${img.data}`;

/** Returns the size in bytes of an image embedded in an offer document. */
export const offerImageSize = (img: OfferImage): number => {
  const padding = img.data.endsWith('==') ? 2 : img.data.endsWith('=') ? 1 : 0;
  return (img.data.length * 3) / 4 - padding;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};
