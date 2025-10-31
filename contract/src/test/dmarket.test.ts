import { DMarketSimulator } from "./dmarket-simulator.js";
import { toHex, fromHex } from "@midnight-ntwrk/midnight-js-utils";
import {
  NetworkId,
  setNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";
import {
  randomBytes,
  randomNumber,
  randomRatingNumber,
  randomCoinPublicKeyHex,
} from "./utils.js";
import { encodeCoinPublicKey } from "@midnight-ntwrk/compact-runtime";
import { createCoinInfo, nativeToken } from "@midnight-ntwrk/ledger";
import {
  Offer,
  Item,
  OfferState,
  PurchaseDetails,
} from "../managed/dmarket/contract/index.cjs";

setNetworkId(NetworkId.Undeployed);
const genRandomItem = (): Item => {
  const item: Item = {
    id: randomBytes(32),
    price: randomNumber(),
    meta: toHex(randomBytes(10)),
  };
  return item;
};

type TestUsers = {
  sellerPk: string;
  sellerPwd: Uint8Array;
  sellerId: Uint8Array;
  carrierPk: string;
  carrierPwd: Uint8Array;
  carrierId: Uint8Array;
  buyerPk: string;
  buyerPwd: Uint8Array;
  buyerId: Uint8Array;
};

const randomUsers = (): TestUsers => {
  const simulator = new DMarketSimulator(
    randomBytes(32),
    randomCoinPublicKeyHex(),
  );
  const users = {
    sellerPk: randomCoinPublicKeyHex(),
    sellerPwd: randomBytes(32),
    carrierPk: randomCoinPublicKeyHex(),
    carrierPwd: randomBytes(32),
    buyerPk: randomCoinPublicKeyHex(),
    buyerPwd: randomBytes(32),
  };

  return {
    ...users,
    sellerId: simulator.genSellerId(users.sellerPk),
    carrierId: simulator.genCarrierId(users.carrierPk),
    buyerId: simulator.genBuyerId(users.buyerPk),
  };
};

const buildUpdatedOffer = (
  offer: Offer,
  users: TestUsers,
  newState: OfferState,
  fee: bigint,
): Offer => {
  const purchaseDetails: PurchaseDetails = {
    buyerId: users.buyerId,
    selectedCarrierId: users.carrierId,
    carrierFee: fee,
  };
  const updatedOffer: Offer = {
    ...offer,
    state: newState,
    purchaseDetails: { is_some: true, value: purchaseDetails },
  };
  return updatedOffer;
};

// Helper to publish an offer and leave it in a
// desired state to then execute certain tests
const publishOffer = (
  simulator: DMarketSimulator,
  users: TestUsers,
  state: OfferState,
): { offer: Offer; fee: bigint } => {
  const item = genRandomItem();
  const fee = randomNumber();
  const offer = simulator.offerItem(item);
  const res = { offer: offer, fee: fee };

  simulator.switchUser(users.carrierPwd, users.carrierPk);
  simulator.setCarrierBid(offer.id, fee);
  if (state == OfferState.New) {
    return res;
  }

  simulator.switchUser(users.buyerPwd, users.buyerPk);
  simulator.purchaseItem(offer.id, users.carrierId);
  if (state == OfferState.Purchased) {
    return res;
  }

  simulator.switchUser(users.carrierPwd, users.carrierPk);
  simulator.itemPickedUp(offer.id, null);
  if (state == OfferState.PickedUp) {
    return res;
  }

  simulator.switchUser(users.sellerPwd, users.sellerPk);
  simulator.confirmItemInTransit(offer.id);
  if (state == OfferState.InTransit) {
    return res;
  }

  simulator.switchUser(users.carrierPwd, users.carrierPk);
  simulator.delivered(offer.id);
  if (state == OfferState.Delivered) {
    return res;
  }

  if (state == OfferState.Dispute) {
    simulator.switchUser(users.buyerPwd, users.buyerPk);
    simulator.disputeItem(offer.id);
    return res;
  }

  simulator.switchUser(users.buyerPwd, users.buyerPk);
  simulator.confirmDelivered(offer.id);
  return res;
};

describe("dMarket smart contract", () => {
  it("publishing an offer", () => {
    const pk = randomCoinPublicKeyHex();
    const pwd = randomBytes(32);
    const simulator = new DMarketSimulator(pwd, pk);
    const mySellerId = simulator.genSellerId(pk);

    const item = genRandomItem();

    const offer = simulator.offerItem(item);
    expect(() => simulator.offerItem(item)).toThrow(
      "failed assert: Offer already exists",
    );
    expect(simulator.getLedger().offers.isEmpty()).toBe(false);
    expect(offer.id).toEqual(simulator.genOfferId(item, mySellerId));
    expect(offer.item).toEqual(item);
    expect(offer.state).toEqual(OfferState.New);
    expect(offer.seller).toEqual(mySellerId);
    expect(offer.purchaseDetails.is_some).toBe(false);
    expect(offer.deliveryEta).toEqual(0n);
    expect(offer.sellerRatings).toEqual([0n, 0n]);
    expect(offer.carrierRatings).toEqual([0n, 0n]);
    expect(offer.buyerRatings).toEqual([0n, 0n]);

    const ledgerOffer = simulator.getLedger().offers.lookup(offer.id);
    expect(ledgerOffer).toEqual(offer);
  });

  it("setting carrier bids to an offer", () => {
    const users = randomUsers();
    const simulator = new DMarketSimulator(users.sellerPwd, users.sellerPk);
    const { offer, fee } = publishOffer(simulator, users, OfferState.New);

    const ledgerOffer = simulator.getLedger().offers.lookup(offer.id);
    expect(ledgerOffer).toEqual(offer);
    let feeBid = simulator
      .getLedger()
      .carrierBids.lookup(offer.id)
      .lookup(users.carrierId);
    expect(feeBid).toEqual(fee);

    expect(() => simulator.setCarrierBid(randomBytes(32), fee)).toThrow(
      "failed assert: Offer not found",
    );
    // update bid fee
    const newFee = randomNumber();
    simulator.setCarrierBid(offer.id, newFee);
    feeBid = simulator
      .getLedger()
      .carrierBids.lookup(offer.id)
      .lookup(users.carrierId);
    expect(feeBid).toEqual(newFee);
  });

  it("purchase an item selecting a carrier", () => {
    const users = randomUsers();
    const simulator = new DMarketSimulator(users.sellerPwd, users.sellerPk);

    const item = genRandomItem();
    const offer = simulator.offerItem(item);
    expect(() => simulator.purchaseItem(offer.id, randomBytes(32))).toThrow(
      "failed assert: No carriers found for the offer",
    );

    simulator.switchUser(users.carrierPwd, users.carrierPk);
    const fee = randomNumber();
    simulator.setCarrierBid(offer.id, fee);

    simulator.switchUser(users.buyerPwd, users.buyerPk);
    expect(() => simulator.purchaseItem(offer.id, randomBytes(32))).toThrow(
      "failed assert: Carrier not found among bidders",
    );
    expect(() =>
      simulator.purchaseItem(randomBytes(32), users.carrierId),
    ).toThrow("failed assert: Offer not found");

    simulator.purchaseItem(offer.id, users.carrierId);

    expect(simulator.getLedger().offers.lookup(offer.id)).toEqual(
      buildUpdatedOffer(offer, users, OfferState.Purchased, fee),
    );
  });

  it("carrier picks up a purchased item", () => {
    const users = randomUsers();
    const simulator = new DMarketSimulator(users.sellerPwd, users.sellerPk);
    const { offer, fee } = publishOffer(simulator, users, OfferState.Purchased);

    const eta = randomNumber();
    simulator.switchUser(randomBytes(32), randomCoinPublicKeyHex());
    expect(() => simulator.itemPickedUp(offer.id, eta)).toThrow(
      "failed assert: Only the selected carrier can pick this item up for delivery",
    );

    expect(offer.deliveryEta).toEqual(0n);
    simulator.switchUser(users.carrierPwd, users.carrierPk);
    expect(() => simulator.itemPickedUp(randomBytes(32), eta)).toThrow(
      "failed assert: Offer not found",
    );
    simulator.itemPickedUp(offer.id, eta);
    let updatedOffer = buildUpdatedOffer(
      offer,
      users,
      OfferState.PickedUp,
      fee,
    );
    updatedOffer.deliveryEta = eta;
    expect(simulator.getLedger().offers.lookup(offer.id)).toEqual(updatedOffer);
  });

  it("seller confirms carrier has picked up a purchased item", () => {
    const users = randomUsers();
    const simulator = new DMarketSimulator(users.sellerPwd, users.sellerPk);
    const { offer, fee } = publishOffer(simulator, users, OfferState.PickedUp);

    simulator.switchUser(randomBytes(32), randomCoinPublicKeyHex());
    expect(() => simulator.confirmItemInTransit(offer.id)).toThrow(
      "failed assert: Only the seller can confirm the item has been picked up for delivery",
    );

    simulator.switchUser(users.sellerPwd, users.sellerPk);
    expect(() => simulator.confirmItemInTransit(randomBytes(32))).toThrow(
      "failed assert: Offer not found",
    );
    simulator.confirmItemInTransit(offer.id);
    expect(simulator.getLedger().offers.lookup(offer.id)).toEqual(
      buildUpdatedOffer(offer, users, OfferState.InTransit, fee),
    );
  });

  it("carrier updates delivery ETA", () => {
    const users = randomUsers();
    const simulator = new DMarketSimulator(users.sellerPwd, users.sellerPk);
    const { offer, fee } = publishOffer(simulator, users, OfferState.InTransit);

    const timestamp = randomNumber();
    simulator.switchUser(randomBytes(32), randomCoinPublicKeyHex());
    expect(() => simulator.setOfferEta(offer.id, timestamp)).toThrow(
      "failed assert: Only the carrier selected for an offer can set its delivery ETA",
    );

    simulator.switchUser(users.carrierPwd, users.carrierPk);
    expect(() => simulator.setOfferEta(randomBytes(32), timestamp)).toThrow(
      "failed assert: Offer not found",
    );
    simulator.setOfferEta(offer.id, timestamp);
    let ledgerOffer = simulator.getLedger().offers.lookup(offer.id);
    expect(ledgerOffer.deliveryEta).toEqual(timestamp);

    const newTimestamp = randomNumber();
    simulator.setOfferEta(offer.id, newTimestamp);
    ledgerOffer = simulator.getLedger().offers.lookup(offer.id);
    expect(ledgerOffer.deliveryEta).toEqual(newTimestamp);
  });

  it("carrier delivered the purchased item", () => {
    const users = randomUsers();
    const simulator = new DMarketSimulator(users.sellerPwd, users.sellerPk);
    const { offer, fee } = publishOffer(simulator, users, OfferState.InTransit);

    simulator.switchUser(randomBytes(32), randomCoinPublicKeyHex());
    expect(() => simulator.delivered(offer.id)).toThrow(
      "failed assert: Only the carrier can set the item as delivered",
    );

    simulator.switchUser(users.carrierPwd, users.carrierPk);
    expect(() => simulator.delivered(randomBytes(32))).toThrow(
      "failed assert: Offer not found",
    );
    simulator.delivered(offer.id);
    expect(simulator.getLedger().offers.lookup(offer.id)).toEqual(
      buildUpdatedOffer(offer, users, OfferState.Delivered, fee),
    );
  });

  it("buyer confirms the purchased item has been delivered", () => {
    const users = randomUsers();
    const simulator = new DMarketSimulator(users.sellerPwd, users.sellerPk);
    const { offer, fee } = publishOffer(simulator, users, OfferState.Delivered);

    simulator.switchUser(randomBytes(32), randomCoinPublicKeyHex());
    expect(() => simulator.confirmDelivered(offer.id)).toThrow(
      "failed assert: Only the buyer can confirm the item has been delivered",
    );

    simulator.switchUser(users.buyerPwd, users.buyerPk);
    expect(() => simulator.confirmDelivered(randomBytes(32))).toThrow(
      "failed assert: Offer not found",
    );
    simulator.confirmDelivered(offer.id);
    expect(simulator.getLedger().offers.lookup(offer.id)).toEqual(
      buildUpdatedOffer(offer, users, OfferState.Completed, fee),
    );
  });

  it("buyer opens a dispute on a purchased item", () => {
    const users = randomUsers();
    const simulator = new DMarketSimulator(users.sellerPwd, users.sellerPk);
    const { offer, fee } = publishOffer(simulator, users, OfferState.Delivered);

    simulator.switchUser(randomBytes(32), randomCoinPublicKeyHex());
    expect(() => simulator.disputeItem(offer.id)).toThrow(
      "failed assert: Only the buyer can open a dispute on the item",
    );

    simulator.switchUser(users.buyerPwd, users.buyerPk);
    expect(() => simulator.disputeItem(randomBytes(32))).toThrow(
      "failed assert: Offer not found",
    );
    simulator.disputeItem(offer.id);
    expect(simulator.getLedger().offers.lookup(offer.id)).toEqual(
      buildUpdatedOffer(offer, users, OfferState.Dispute, fee),
    );
  });

  it("seller resolves a dispute on a purchased item", () => {
    const users = randomUsers();
    const simulator = new DMarketSimulator(users.sellerPwd, users.sellerPk);
    const { offer, fee } = publishOffer(simulator, users, OfferState.Dispute);

    simulator.switchUser(randomBytes(32), randomCoinPublicKeyHex());
    expect(() => simulator.resolveDispute(offer.id)).toThrow(
      "failed assert: Only the seller can resolve a dispute",
    );

    simulator.switchUser(users.sellerPwd, users.sellerPk);
    expect(() => simulator.resolveDispute(randomBytes(32))).toThrow(
      "failed assert: Offer not found",
    );
    simulator.resolveDispute(offer.id);
    expect(simulator.getLedger().offers.lookup(offer.id)).toEqual(
      buildUpdatedOffer(offer, users, OfferState.Completed, fee),
    );
  });

  it("users set rating after purchased is completed", () => {
    const users = randomUsers();
    const simulator = new DMarketSimulator(users.sellerPwd, users.sellerPk);
    const { offer, fee } = publishOffer(simulator, users, OfferState.Completed);

    simulator.switchUser(randomBytes(32), randomCoinPublicKeyHex());
    expect(() => simulator.rateSeller(offer.id, 1n)).toThrow(
      "failed assert: Only the carrier or buyer of the offer can rate the seller",
    );
    expect(() => simulator.rateCarrier(offer.id, 1n)).toThrow(
      "failed assert: Only the seller or buyer of the offer can rate the carrier",
    );
    expect(() => simulator.rateBuyer(offer.id, 1n)).toThrow(
      "failed assert: Only the seller or carrier of the offer can rate the buyer",
    );

    const zeroRateErr = "failed assert: Rate needs to be greater than 0";
    expect(() => simulator.rateSeller(offer.id, 0n)).toThrow(zeroRateErr);
    expect(() => simulator.rateCarrier(offer.id, 0n)).toThrow(zeroRateErr);
    expect(() => simulator.rateBuyer(offer.id, 0n)).toThrow(zeroRateErr);

    const sellerRatings: [bigint, bigint] = [
      randomRatingNumber(),
      randomRatingNumber(),
    ];
    const carrierRatings: [bigint, bigint] = [
      randomRatingNumber(),
      randomRatingNumber(),
    ];
    const buyerRatings: [bigint, bigint] = [
      randomRatingNumber(),
      randomRatingNumber(),
    ];

    simulator.switchUser(users.sellerPwd, users.sellerPk);
    expect(() => simulator.rateSeller(randomBytes(32), 1n)).toThrow(
      "failed assert: Offer not found",
    );
    expect(() => simulator.rateSeller(offer.id, 1n)).toThrow(
      "failed assert: Only the carrier or buyer of the offer can rate the seller",
    );
    simulator.rateCarrier(offer.id, carrierRatings[0]);
    simulator.rateBuyer(offer.id, buyerRatings[0]);

    simulator.switchUser(users.carrierPwd, users.carrierPk);
    expect(() => simulator.rateCarrier(randomBytes(32), 1n)).toThrow(
      "failed assert: Offer not found",
    );
    expect(() => simulator.rateCarrier(offer.id, 1n)).toThrow(
      "failed assert: Only the seller or buyer of the offer can rate the carrier",
    );
    simulator.rateSeller(offer.id, sellerRatings[0]);
    simulator.rateBuyer(offer.id, buyerRatings[1]);

    simulator.switchUser(users.buyerPwd, users.buyerPk);
    expect(() => simulator.rateBuyer(randomBytes(32), 1n)).toThrow(
      "failed assert: Offer not found",
    );
    expect(() => simulator.rateBuyer(offer.id, 1n)).toThrow(
      "failed assert: Only the seller or carrier of the offer can rate the buyer",
    );
    simulator.rateCarrier(offer.id, carrierRatings[1]);
    simulator.rateSeller(offer.id, sellerRatings[1]);

    const offerWithRatings: Offer = {
      ...buildUpdatedOffer(offer, users, OfferState.Completed, fee),
      sellerRatings: sellerRatings,
      carrierRatings: carrierRatings,
      buyerRatings: buyerRatings,
    };
    expect(simulator.getLedger().offers.lookup(offer.id)).toEqual(
      offerWithRatings,
    );
  });
});
