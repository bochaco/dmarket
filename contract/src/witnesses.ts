import { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import { Ledger } from "./managed/dmarket/contract/index.cjs";
import * as forge from "node-forge";

export type DMarketPrivateState = {
  readonly secretKey: Uint8Array;
  readonly encryptionKeyPair: {
    privateKey: string;
    publicKey: string;
  };
  readonly encrypt: (data: string, encryptionPk: string) => string;
  readonly decrypt: (ciphertext: string) => string;
};

export const createDMarketPrivateState = (
  password: Uint8Array,
): DMarketPrivateState => {
  // Generate the SHA-256 hash of the password to generate
  // the secret witness and encrpytion key pair.
  const byteString = forge.util.createBuffer(password.slice().buffer);
  const md = forge.md.sha256.create();
  md.update(byteString.getBytes());
  const hashedPassword = md.digest();

  const { publicKeyPem, privateKeyPem } = generateDeterministicKeyPair(
    hashedPassword.toHex(),
  );

  const secretKey = new Uint8Array(32);
  secretKey.set(
    hashedPassword
      .getBytes()
      .split("")
      .map((char) => char.charCodeAt(0)),
  );

  return {
    secretKey,
    encryptionKeyPair: {
      privateKey: privateKeyPem,
      publicKey: publicKeyPem,
    },
    encrypt: (data: string, encryptionPk: string) =>
      encryptData(data, encryptionPk),
    decrypt: (ciphertext: string) => decryptData(ciphertext, privateKeyPem),
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
      const ciphertext = encryptData(data, encryptionPk);
      return [privateState, ciphertext];
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

const decryptData = (ciphertext: string, privateKey: string): string => {
  const deserializedPrivateKey = forge.pki.privateKeyFromPem(privateKey);
  const decryptedMessage = deserializedPrivateKey.decrypt(
    forge.util.decode64(ciphertext),
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
