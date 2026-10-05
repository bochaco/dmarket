/**
 * Midnight network ID the dApp connects to (e.g. "preprod", "preview" or
 * "undeployed" for a local network), set with the `VITE_NETWORK_ID` env var.
 */
export const NETWORK_ID: string =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_NETWORK_ID ?? "preprod";
