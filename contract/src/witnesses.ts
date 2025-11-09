import { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import { Ledger } from "./managed/dmarket/contract/index.cjs";
import { toHex } from "@midnight-ntwrk/midnight-js-utils";

export type DMarketPrivateState = {
  readonly secretKey: Uint8Array;
  readonly encryptionKeyPair: { privateKey: string; publicKey: string };
  readonly encrypt: (data: string, encryptionPk: string) => string;
  readonly decrypt: (cipher: string) => string;
};

export const createDMarketPrivateState = async (
  password: Uint8Array,
): Promise<DMarketPrivateState> => {
  // Generate the SHA-256 hash, the contract expect it to be 32 bytes long.
  const passwordBuffer: ArrayBuffer = password.slice().buffer;
  const hashedPassword = await crypto.subtle.digest("SHA-256", passwordBuffer);

  // TODO: we are now using fake private and secret keys,
  // they need to be generated with some crypto lib
  const encryptionKeyPair = {
    privateKey: toHex(password),
    publicKey: toHex(new Uint8Array(hashedPassword)),
  };

  return {
    secretKey: new Uint8Array(hashedPassword),
    encryptionKeyPair,
    // FIXME: we need to use real encryption function
    encrypt: (data: string, encryptionPk: string) =>
      fakeEncrypt(data, encryptionPk),
    // FIXME: we need to use real decryption function
    decrypt: (cipher: string) =>
      fakeDecrypt(cipher, encryptionKeyPair.publicKey),
  };
};

export const witnesses = {
  secretKey: ({
    privateState,
  }: WitnessContext<Ledger, DMarketPrivateState>): [
    DMarketPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],
  encrypt: (
    { privateState }: WitnessContext<Ledger, DMarketPrivateState>,
    data: string,
    encryptionPk: string,
  ): [DMarketPrivateState, string] => {
    if (data.length > 0) {
      const cipher = fakeEncrypt(data, encryptionPk);
      return [privateState, cipher];
    } else {
      return [privateState, ""];
    }
  },
};

// TODO: temporary fake encryption function
const fakeEncrypt = (data: string, encryptionPk: string): string => {
  return `${encryptionPk}-${data}`;
};

// TODO: temporary fake decryption function
const fakeDecrypt = (cipher: string, encryptionPk: string): string => {
  console.log(`DECRYPT: ${cipher} - ${encryptionPk}`);
  if (cipher.substring(0, encryptionPk.length) === encryptionPk) {
    return cipher.substring(encryptionPk.length + 1);
  } else {
    throw "FAILED-TO-DECRYPT";
  }
};
