import { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import { Ledger } from "./managed/dmarket/contract/index.cjs";
import { toHex } from "@midnight-ntwrk/midnight-js-utils";
import * as forge from "node-forge";

export type DMarketPrivateState = {
  readonly secretKey: Uint8Array;
  readonly encryptionKeyPair: {
    privateKey: string;
    publicKey: string;
  };
  readonly encrypt: (data: string, encryptionPk: string) => string;
  readonly decrypt: (cipher: string) => string;
};

export const createDMarketPrivateState = async (
  password: Uint8Array,
): Promise<DMarketPrivateState> => {
  // Generate the SHA-256 hash, the contract expect it to be 32 bytes long.
  const passwordBuffer: ArrayBuffer = password.slice().buffer;
  const hashedPassword = await crypto.subtle.digest("SHA-256", passwordBuffer);

  const { publicKeyPem, privateKeyPem } = generateDeterministicKeyPair(
    toHex(new Uint8Array(hashedPassword)),
  );

  return {
    secretKey: new Uint8Array(hashedPassword),
    encryptionKeyPair: {
      privateKey: privateKeyPem,
      publicKey: publicKeyPem,
    },
    encrypt: (data: string, encryptionPk: string) =>
      encryptData(data, encryptionPk),
    decrypt: (cipher: string) => decryptData(cipher, privateKeyPem),
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
      const cipher = encryptData(data, encryptionPk);
      return [privateState, cipher];
    } else {
      return [privateState, ""];
    }
  },
};

const encryptData = (data: string, encryptionPk: string): string => {
  const deserializedPublicKey = forge.pki.publicKeyFromPem(encryptionPk);
  const encryptedMessage = deserializedPublicKey.encrypt(
    data,
    "RSAES-PKCS1-V1_5",
  );
  return forge.util.encode64(encryptedMessage);
};

const decryptData = (cipher: string, privateKey: string): string => {
  const deserializedPrivateKey = forge.pki.privateKeyFromPem(privateKey);
  const decryptedMessage = deserializedPrivateKey.decrypt(
    forge.util.decode64(cipher),
    "RSAES-PKCS1-V1_5",
  );
  return decryptedMessage.toString();
};

// Generate a deterministic RSA keypair from a seed.
const generateDeterministicKeyPair = (
  digest: string,
): {
  privateKeyPem: string;
  publicKeyPem: string;
} => {
  // Seed the PRNG with the password.
  const prng = forge.random.createInstance();
  prng.seedFileSync = () => digest;

  // we use just 1024 bits, larger keys may be required in production to provide more security.
  const keys = forge.pki.rsa.generateKeyPair({ bits: 1024, e: 0x10001, prng });
  const publicKeyPem = forge.pki.publicKeyToPem(keys.publicKey);
  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);

  return {
    publicKeyPem,
    privateKeyPem,
  };
};
