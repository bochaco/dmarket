import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  constructorContext,
  emptyZswapLocalState,
  CoinInfo,
  encodeContractAddress,
  dummyContractAddress,
  assert,
  encodeCoinPublicKey,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
  Offer,
  Item,
} from "../managed/dmarket/contract/index.cjs";
import { type DMarketPrivateState, witnesses } from "../witnesses.js";
import { encodeCoinInfo } from "@midnight-ntwrk/ledger";

/**
 * Serves as a testbed to exercise the contract in tests
 */
export class DMarketSimulator {
  readonly contract: Contract<DMarketPrivateState>;
  circuitContext: CircuitContext<DMarketPrivateState>;

  constructor(secretKey: Uint8Array, senderPk: string) {
    this.contract = new Contract<DMarketPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(constructorContext({ secretKey }, senderPk));
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      originalState: currentContractState,
      transactionContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  private buildEitherLeft(bytes: Uint8Array): any {
    return {
      is_left: true,
      left: { bytes: bytes },
      right: { bytes: encodeContractAddress(dummyContractAddress()) },
    };
  }

  /***
   * Switch to a different secret key for a different user
   */
  public switchUser(secretKey: Uint8Array, senderPk: string) {
    const diffPwdOrPk =
      this.circuitContext.currentPrivateState.secretKey !== secretKey;
    assert(diffPwdOrPk, "Cannot switch user with same Password");
    this.circuitContext.currentZswapLocalState = emptyZswapLocalState(senderPk);
    this.circuitContext.currentPrivateState = {
      secretKey,
    };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.transactionContext.state);
  }

  public getPrivateState(): DMarketPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public offerItem(item: Item): Offer {
    // Update the current context to be the result of executing the circuit.
    const res = this.contract.impureCircuits.offerItem(
      this.circuitContext,
      item,
    );
    this.circuitContext = res.context;
    return res.result;
  }

  public setCarrierBid(offerId: Uint8Array, fee: bigint): [] {
    const res = this.contract.circuits.setCarrierBid(
      this.circuitContext,
      offerId,
      fee,
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

  public purchaseItem(offerId: Uint8Array, carrierId: Uint8Array): [] {
    const res = this.contract.circuits.purchaseItem(
      this.circuitContext,
      offerId,
      carrierId,
    );
    this.circuitContext = res.context;
    return res.result;
  }

  public itemPickedUp(offerId: Uint8Array, eta: null | bigint): [] {
    const res = this.contract.circuits.itemPickedUp(
      this.circuitContext,
      offerId,
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
      item,
      sellerId,
    ).result;
  }

  public genSellerId(pk: string): Uint8Array {
    return this.contract.circuits.genSellerId(this.circuitContext, {
      bytes: encodeCoinPublicKey(pk),
    }).result;
  }

  public genCarrierId(pk: string): Uint8Array {
    return this.contract.circuits.genCarrierId(this.circuitContext, {
      bytes: encodeCoinPublicKey(pk),
    }).result;
  }

  public genBuyerId(pk: string): Uint8Array {
    return this.contract.circuits.genBuyerId(this.circuitContext, {
      bytes: encodeCoinPublicKey(pk),
    }).result;
  }
}
