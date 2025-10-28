import { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import { Ledger } from "./managed/dmarket/contract/index.cjs";

export type DMarketPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createDMarketPrivateState = async (secretKey: Uint8Array) => {
  // Generate the SHA-256 hash, the contract expect it to be 32 bytes long.
  const skInput: ArrayBuffer = secretKey.slice().buffer;
  const skHashBuffer = await crypto.subtle.digest("SHA-256", skInput);
  return {
    secretKey: new Uint8Array(skHashBuffer),
  };
};

export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, DMarketPrivateState>): [
    DMarketPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],
};
