import {
  MidnightChainAdapter,
  type NetworkId,
} from "@dstorage-tech/dstorage-sdk";
import { type Logger } from "pino";
import {
  OfferContentStore,
  createDStorage,
  toDStorageLogger,
} from "../../api/src/index";

/**
 * Settings needed to have the dStorage SDK use the same wallet and
 * network the DMarket contract is being used with.
 */
export interface DStorageChainSettings {
  /** Network ID, e.g. "preprod". */
  readonly networkId: string;
  /** The rdns of the wallet extension DMarket is connected to. */
  readonly walletRdns: string;
  /** Proof server URI as configured in the wallet. */
  readonly proofServerUri: string;
}

/**
 * Creates the store for offers' content (metadata and images) backed by the
 * dStorage SDK. If `dataRegistryAddress` is not provided, a new dStorage
 * DataRegistry contract is deployed.
 */
export const createOfferContentStore = async (
  settings: DStorageChainSettings,
  accountPassword: Uint8Array,
  logger: Logger,
  dataRegistryAddress?: string,
): Promise<OfferContentStore> => {
  const dStorageLogger = toDStorageLogger(logger);
  const chainAdapter = new MidnightChainAdapter({
    walletMode: "connector",
    connectorName: settings.walletRdns,
    // serves the DataRegistry keys/ and zkir/ copied into public/ (or dist/)
    zkConfigBaseUrl: window.location.origin,
    network: settings.networkId as NetworkId,
    // indexer endpoints are taken from the wallet's configuration
    proofServerEndpoint: settings.proofServerUri,
    contractAddress: dataRegistryAddress,
    logger: dStorageLogger,
  });

  const { dstorage, dataRegistryAddress: registryAddress } =
    await createDStorage(chainAdapter, accountPassword, dStorageLogger);
  logger.info(`Using dStorage DataRegistry contract at ${registryAddress}`);

  return new OfferContentStore(dstorage, registryAddress);
};
