// Max age of the latest block known by the wallet's indexer to consider it in sync.
const MAX_INDEXER_LAG_MS = 5 * 60_000;

/** Returns the latest block's height and timestamp (ms) from the indexer. */
const fetchLatestBlock = async (
  indexerUri: string,
): Promise<{ height: number; timestamp: number } | undefined> => {
  try {
    const res = await fetch(indexerUri, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "{ block { height timestamp } }" }),
    });
    const json = (await res.json()) as {
      data?: { block?: { height: number; timestamp: number } };
    };
    return json.data?.block;
  } catch {
    return undefined;
  }
};

/**
 * Checks that the indexer configured in the wallet is in sync with the chain.
 *
 * Wallets take the DUST spend time of the transactions they balance from the latest
 * block known by their indexer, and the ledger rejects DUST spends older than the DUST
 * grace period (3 hours on Preprod), so with an out-of-sync indexer all transactions
 * are rejected by the node (error 171, `OutOfDustValidityWindow`).
 */
export const assertWalletIndexerInSync = async (
  indexerUri: string,
): Promise<void> => {
  const block = await fetchLatestBlock(indexerUri);
  if (!block) {
    console.warn(
      `Could not check whether the wallet's indexer (${indexerUri}) is in sync`,
    );
    return;
  }
  const lagMs = Date.now() - block.timestamp;
  if (lagMs > MAX_INDEXER_LAG_MS) {
    throw new Error(
      `The indexer configured in your wallet (${indexerUri}) is out of sync: its latest block (#${block.height}) ` +
        `is from ${new Date(block.timestamp).toISOString()}, ${Math.round(lagMs / 60_000)} minutes ago. ` +
        `Transactions would be rejected by the network (DUST outside its validity window). ` +
        `Please configure your wallet to use an indexer in sync with the network.`,
    );
  }
};
