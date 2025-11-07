import { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import { Ledger } from "./managed/dmarket/contract/index.cjs";

export type DMarketPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createDMarketPrivateState = async (password: Uint8Array) => {
  // Generate the SHA-256 hash, the contract expect it to be 32 bytes long.
  const passwordBuffer: ArrayBuffer = password.slice().buffer;
  const hashedPassword = await crypto.subtle.digest("SHA-256", passwordBuffer);
  return {
    secretKey: new Uint8Array(hashedPassword),
  };
};

export const witnesses = {
  secretKey: ({
    privateState,
  }: WitnessContext<Ledger, DMarketPrivateState>): [
    DMarketPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],
};
