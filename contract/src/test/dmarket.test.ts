import { Item, DMarketSimulator } from "./dmarket-simulator.js";
import { toHex } from "@midnight-ntwrk/midnight-js-utils";
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
import { createCoinInfo } from "@midnight-ntwrk/ledger";
import {
  Offer,
  OfferState,
  PurchaseDetails,
} from "../managed/dmarket/contract/index.cjs";

setNetworkId(NetworkId.Undeployed);

const genRandomItem = (): Item => {
  const item: Item = {
    id: randomBytes(32),
    price: randomNumber(50),
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
  const fee = randomNumber(10);
  const offer = simulator.offerItem(item);
  const res = { offer: offer, fee: fee };

  simulator.switchUser(users.carrierPwd, users.carrierPk);
  simulator.setCarrierBid(offer.id, fee);
  if (state == OfferState.New) {
    return res;
  }

  simulator.switchUser(users.buyerPwd, users.buyerPk);
  let coinInfoBuyer = createCoinInfo(
    simulator.getCoinColor(),
    item.price + fee,
  );
  simulator.purchaseItem(offer.id, users.carrierId, coinInfoBuyer);
  expect(simulator.getLedger().treasury.value).toEqual(offer.price + fee);
  if (state == OfferState.Purchased) {
    return res;
  }

  simulator.switchUser(users.carrierPwd, users.carrierPk);
  let coinInfoCarrier = createCoinInfo(
    simulator.getCoinColor(),
    item.price + fee,
  );
  simulator.itemPickedUp(offer.id, coinInfoCarrier, null);
  expect(simulator.getLedger().treasury.value).toEqual(
    2n * (offer.price + fee),
  );
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
    expect(simulator.getLedger().treasury.value).toEqual(
      2n * (offer.price + fee),
    );
    return res;
  }

  simulator.switchUser(users.buyerPwd, users.buyerPk);
  simulator.confirmDelivered(offer.id);
  expect(simulator.getLedger().treasury.value).toEqual(0n);
  return res;
};

describe("dMarket smart contract", () => {
  it("publishing an offer", () => {
    const pk = randomCoinPublicKeyHex();
    const pwd = randomBytes(32);
    const simulator = new DMarketSimulator(pwd, pk);
    const mySellerId = simulator.genSellerId(pk);

    const item = genRandomItem();

    expect(() => simulator.offerItem({ ...item, price: 0 })).toThrow();

    const offer = simulator.offerItem(item);
    expect(() => simulator.offerItem(item)).toThrow(
      "failed assert: Offer already exists",
    );
    expect(simulator.getLedger().offers.isEmpty()).toBe(false);
    expect(offer.id).toEqual(simulator.genOfferId(item, mySellerId));
    expect(offer.price).toEqual(item.price);
    expect(offer.meta).toEqual(item.meta);
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
    const newFee = randomNumber(10);
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
    const fee = randomNumber(10);
    const offer = simulator.offerItem(item);
    let coinInfo = createCoinInfo(simulator.getCoinColor(), item.price + fee);
    expect(() =>
      simulator.purchaseItem(offer.id, randomBytes(32), coinInfo),
    ).toThrow("failed assert: No carriers found for the offer");

    simulator.switchUser(users.carrierPwd, users.carrierPk);
    expect(simulator.getLedger().carrierBids.member(offer.id)).toBe(false);
    simulator.setCarrierBid(offer.id, fee);
    expect(simulator.getLedger().carrierBids.member(offer.id)).toBe(true);

    simulator.switchUser(users.buyerPwd, users.buyerPk);
    expect(() =>
      simulator.purchaseItem(offer.id, randomBytes(32), coinInfo),
    ).toThrow("failed assert: Carrier not found among bidders");
    expect(() =>
      simulator.purchaseItem(randomBytes(32), users.carrierId, coinInfo),
    ).toThrow("failed assert: Offer not found");

    simulator.purchaseItem(offer.id, users.carrierId, coinInfo);
    expect(simulator.getLedger().carrierBids.member(offer.id)).toBe(false);

    expect(simulator.getLedger().offers.lookup(offer.id)).toEqual(
      buildUpdatedOffer(offer, users, OfferState.Purchased, fee),
    );
    expect(simulator.getLedger().treasury.value).toEqual(offer.price + fee);
  });

  it("invalid deposits for purchasing an item", () => {
    const users = randomUsers();
    const simulator = new DMarketSimulator(users.sellerPwd, users.sellerPk);
    const { offer, fee } = publishOffer(simulator, users, OfferState.New);
    expect(simulator.getLedger().treasury.value).toEqual(0n);
    const rightAmount = offer.price + fee;

    let nonNativeCoinInfo = createCoinInfo(
      `0200${toHex(randomBytes(32))}`,
      rightAmount,
    );
    expect(() =>
      simulator.purchaseItem(offer.id, users.carrierId, nonNativeCoinInfo),
    ).toThrow("failed assert: Only dMarket coins can be used for payments");

    let tooLittleCoinInfo = createCoinInfo(
      simulator.getCoinColor(),
      rightAmount - 1n,
    );
    expect(() =>
      simulator.purchaseItem(offer.id, users.carrierId, tooLittleCoinInfo),
    ).toThrow(
      "failed assert: Deposit amount must be equal to the item price plus the carrier fee",
    );

    let tooMuchCoinInfo = createCoinInfo(
      simulator.getCoinColor(),
      rightAmount + 1n,
    );
    expect(() =>
      simulator.purchaseItem(offer.id, users.carrierId, tooMuchCoinInfo),
    ).toThrow(
      "failed assert: Deposit amount must be equal to the item price plus the carrier fee",
    );

    expect(simulator.getLedger().treasury.value).toEqual(0n);
  });

  it("carrier picks up a purchased item", () => {
    const users = randomUsers();
    const simulator = new DMarketSimulator(users.sellerPwd, users.sellerPk);
    const { offer, fee } = publishOffer(simulator, users, OfferState.Purchased);
    let coinInfo = createCoinInfo(simulator.getCoinColor(), offer.price + fee);

    const eta = randomNumber(null);
    simulator.switchUser(randomBytes(32), randomCoinPublicKeyHex());
    expect(() => simulator.itemPickedUp(offer.id, coinInfo, eta)).toThrow(
      "failed assert: Only the selected carrier can pick this item up for delivery",
    );

    expect(offer.deliveryEta).toEqual(0n);
    simulator.switchUser(users.carrierPwd, users.carrierPk);
    expect(() =>
      simulator.itemPickedUp(randomBytes(32), coinInfo, eta),
    ).toThrow("failed assert: Offer not found");
    simulator.itemPickedUp(offer.id, coinInfo, eta);
    let updatedOffer = buildUpdatedOffer(
      offer,
      users,
      OfferState.PickedUp,
      fee,
    );
    updatedOffer.deliveryEta = eta;
    expect(simulator.getLedger().offers.lookup(offer.id)).toEqual(updatedOffer);
    expect(simulator.getLedger().treasury.value).toEqual(
      2n * (offer.price + fee),
    );
  });

  it("invalid deposits for picking an item up", () => {
    const users = randomUsers();
    const simulator = new DMarketSimulator(users.sellerPwd, users.sellerPk);
    const { offer, fee } = publishOffer(simulator, users, OfferState.Purchased);
    const rightAmount = offer.price + fee;
    simulator.switchUser(users.carrierPwd, users.carrierPk);
    expect(simulator.getLedger().treasury.value).toEqual(offer.price + fee);

    let nonNativeCoinInfo = createCoinInfo(
      `0200${toHex(randomBytes(32))}`,
      rightAmount,
    );
    expect(() =>
      simulator.itemPickedUp(offer.id, nonNativeCoinInfo, null),
    ).toThrow("failed assert: Only dMarket coins can be used for payments");

    let tooLittleCoinInfo = createCoinInfo(
      simulator.getCoinColor(),
      rightAmount - 1n,
    );
    expect(() =>
      simulator.itemPickedUp(offer.id, tooLittleCoinInfo, null),
    ).toThrow(
      "failed assert: Deposit amount must be equal to the item price plus the carrier fee",
    );

    let tooMuchCoinInfo = createCoinInfo(
      simulator.getCoinColor(),
      rightAmount + 1n,
    );
    expect(() =>
      simulator.itemPickedUp(offer.id, tooMuchCoinInfo, null),
    ).toThrow(
      "failed assert: Deposit amount must be equal to the item price plus the carrier fee",
    );

    expect(simulator.getLedger().treasury.value).toEqual(offer.price + fee);
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
    expect(simulator.getLedger().treasury.value).toEqual(
      2n * (offer.price + fee),
    );
  });

  it("carrier updates delivery ETA", () => {
    const users = randomUsers();
    const simulator = new DMarketSimulator(users.sellerPwd, users.sellerPk);
    const { offer, fee } = publishOffer(simulator, users, OfferState.InTransit);

    const timestamp = randomNumber(null);
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

    const newTimestamp = randomNumber(null);
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
    expect(simulator.getLedger().treasury.value).toEqual(
      2n * (offer.price + fee),
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
    expect(simulator.getLedger().treasury.value).toEqual(0n);
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
    expect(simulator.getLedger().treasury.value).toEqual(
      2n * (offer.price + fee),
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

    // Regardless the dispute resolution type, the treasury should be now empty,
    // all locked funds should have been sent to the corresponding parties.
    // TODO!!!: expect(simulator.getLedger().treasury.value).toEqual(0n);
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

  it("circuits validate offer state", () => {
    // TODO!!!
  });
});
