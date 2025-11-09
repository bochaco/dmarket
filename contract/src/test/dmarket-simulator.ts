import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  constructorContext,
  emptyZswapLocalState,
  CoinInfo,
  encodeCoinPublicKey,
  encodeContractAddress,
  TokenType,
  tokenType,
  ContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
  Offer,
} from "../managed/dmarket/contract/index.cjs";
import {
  type DMarketPrivateState,
  witnesses,
  createDMarketPrivateState,
} from "../witnesses.js";
import { encodeCoinInfo } from "@midnight-ntwrk/ledger";
import { randomBytes } from "./utils.js";

export interface Item {
  id: Uint8Array;
  price: bigint;
  meta: string;
}

/**
 * Serves as a testbed to exercise the contract in tests
 */
export class DMarketSimulator {
  readonly contract: Contract<DMarketPrivateState>;
  readonly contractAddress: ContractAddress;
  circuitContext: CircuitContext<DMarketPrivateState>;

  constructor(dMarketPrivateState: DMarketPrivateState, senderPk: string) {
    this.contractAddress = sampleContractAddress();
    this.contract = new Contract<DMarketPrivateState>(witnesses);
    const initNonce = randomBytes(32);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      constructorContext(dMarketPrivateState, senderPk),
      initNonce,
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      originalState: currentContractState,
      transactionContext: new QueryContext(
        currentContractState.data,
        this.contractAddress,
      ),
    };
  }

  /***
   * Switch to a different password for a different user
   */
  public async switchUser(password: Uint8Array, senderPk: string) {
    this.circuitContext.currentZswapLocalState = emptyZswapLocalState(senderPk);
    this.circuitContext.currentPrivateState =
      await createDMarketPrivateState(password);
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.transactionContext.state);
  }

  public getCoinColor(): TokenType {
    return tokenType(
      this.getLedger().coinDomainSeparator,
      this.contractAddress,
    );
  }

  public getPrivateState(): DMarketPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public mintCoins() {
    const res = this.contract.impureCircuits.mintCoins(this.circuitContext);
    this.circuitContext = res.context;
    return res.result;
  }

  public offerItem(item: Item, sellerMeta: string): Offer {
    // Update the current context to be the result of executing the circuit.
    const res = this.contract.impureCircuits.offerItem(
      this.circuitContext,
      item.id,
      item.price,
      item.meta,
      sellerMeta,
    );
    this.circuitContext = res.context;
    return res.result;
  }

  public setCarrierBid(
    offerId: Uint8Array,
    fee: bigint,
    carrierMeta: string,
  ): [] {
    const res = this.contract.circuits.setCarrierBid(
      this.circuitContext,
      offerId,
      fee,
      this.circuitContext.currentPrivateState.encryptionKeyPair.publicKey,
      carrierMeta,
    );
    this.circuitContext = res.context;
    return res.result;
  }

  public setOfferEta(offerId: Uint8Array, timestamp: bigint): [] {
    const res = this.contract.circuits.setOfferEta(
      this.circuitContext,
      offerId,
      timestamp,
    );
    this.circuitContext = res.context;
    return res.result;
  }

  public purchaseItem(
    offerId: Uint8Array,
    carrierId: Uint8Array,
    coinInfo: CoinInfo,
    deliveryAddress: string,
  ): [] {
    const res = this.contract.circuits.purchaseItem(
      this.circuitContext,
      offerId,
      carrierId,
      encodeCoinInfo(coinInfo),
      deliveryAddress,
    );
    this.circuitContext = res.context;
    return res.result;
  }

  public itemPickedUp(
    offerId: Uint8Array,
    coinInfo: CoinInfo,
    eta: null | bigint,
  ): [] {
    const res = this.contract.circuits.itemPickedUp(
      this.circuitContext,
      offerId,
      encodeCoinInfo(coinInfo),
      eta !== null
        ? { is_some: true, value: BigInt(eta) }
        : { is_some: false, value: 0n },
    );
    this.circuitContext = res.context;
    return res.result;
  }

  public confirmItemInTransit(offerId: Uint8Array): [] {
    const res = this.contract.circuits.confirmItemInTransit(
      this.circuitContext,
      offerId,
    );
    this.circuitContext = res.context;
    return res.result;
  }

  public delivered(offerId: Uint8Array): [] {
    const res = this.contract.circuits.delivered(this.circuitContext, offerId);
    this.circuitContext = res.context;
    return res.result;
  }

  public confirmDelivered(offerId: Uint8Array): [] {
    const res = this.contract.circuits.confirmDelivered(
      this.circuitContext,
      offerId,
    );
    this.circuitContext = res.context;
    return res.result;
  }

  public disputeItem(offerId: Uint8Array): [] {
    const res = this.contract.circuits.disputeItem(
      this.circuitContext,
      offerId,
    );
    this.circuitContext = res.context;
    return res.result;
  }

  public resolveDispute(offerId: Uint8Array): [] {
    const res = this.contract.circuits.resolveDispute(
      this.circuitContext,
      offerId,
    );
    this.circuitContext = res.context;
    return res.result;
  }

  public rateSeller(offerId: Uint8Array, rating: bigint): [] {
    const res = this.contract.circuits.rateSeller(
      this.circuitContext,
      offerId,
      rating,
    );
    this.circuitContext = res.context;
    return res.result;
  }

  public rateCarrier(offerId: Uint8Array, rating: bigint): [] {
    const res = this.contract.circuits.rateCarrier(
      this.circuitContext,
      offerId,
      rating,
    );
    this.circuitContext = res.context;
    return res.result;
  }

  public rateBuyer(offerId: Uint8Array, rating: bigint): [] {
    const res = this.contract.circuits.rateBuyer(
      this.circuitContext,
      offerId,
      rating,
    );
    this.circuitContext = res.context;
    return res.result;
  }

  public genOfferId(item: Item, sellerId: Uint8Array): Uint8Array {
    return this.contract.circuits.genOfferId(
      this.circuitContext,
      sellerId,
      item.id,
      item.price,
    ).result;
  }

  public genSellerId(pk: string): Uint8Array {
    return this.contract.circuits.genSellerId(
      this.circuitContext,
      {
        bytes: encodeCoinPublicKey(pk),
      },
      this.circuitContext.currentPrivateState.secretKey,
      encodeContractAddress(this.contractAddress),
    ).result;
  }

  public genCarrierId(pk: string): Uint8Array {
    return this.contract.circuits.genCarrierId(
      this.circuitContext,
      {
        bytes: encodeCoinPublicKey(pk),
      },
      this.circuitContext.currentPrivateState.secretKey,
      encodeContractAddress(this.contractAddress),
    ).result;
  }

  public genBuyerId(pk: string): Uint8Array {
    return this.contract.circuits.genBuyerId(
      this.circuitContext,
      {
        bytes: encodeCoinPublicKey(pk),
      },
      this.circuitContext.currentPrivateState.secretKey,
      encodeContractAddress(this.contractAddress),
    ).result;
  }
}
