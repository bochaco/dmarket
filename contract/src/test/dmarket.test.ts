import { Item, DMarketSimulator } from "./dmarket-simulator.js";
import { toHex } from "@midnight-ntwrk/midnight-js-utils";
import {
  setNetworkId,
  NetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";
import {
  randomBytes,
  randomNumber,
  randomRatingNumber,
  randomCoinPublicKeyHex,
} from "./utils.js";
import {
  Offer,
  OfferState,
  PurchaseDetails,
} from "../managed/dmarket/contract/index.js";
import {
  createShieldedCoinInfo,
  encodeCoinPublicKey,
} from "@midnight-ntwrk/ledger-v7";

setNetworkId("undeployed" as NetworkId);

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

// Generate random users, and a simulator instantiated with the generated random seller
const randomUsers = (): [TestUsers, DMarketSimulator] => {
  const sellerPwd = randomBytes(32);
  const sellerPk = randomCoinPublicKeyHex();
  const users = {
    sellerPk,
    sellerPwd,
    carrierPk: randomCoinPublicKeyHex(),
    carrierPwd: randomBytes(32),
    buyerPk: randomCoinPublicKeyHex(),
    buyerPwd: randomBytes(32),
  };

  const simulator = new DMarketSimulator(sellerPwd, sellerPk);
  const sellerId = simulator.genSellerId(users.sellerPk);

  simulator.switchUser(users.carrierPwd, users.carrierPk);
  const carrierId = simulator.genCarrierId(users.carrierPk);

  simulator.switchUser(users.buyerPwd, users.buyerPk);
  const buyerId = simulator.genBuyerId(users.buyerPk);

  simulator.switchUser(users.buyerPwd, users.buyerPk);
  return [
    {
      ...users,
      sellerId,
      carrierId,
      buyerId,
    },
    simulator,
  ];
};

const buildUpdatedOffer = (
  offer: Offer,
  users: TestUsers,
  newState: OfferState,
  fee: bigint,
): Offer => {
  const purchaseDetails: PurchaseDetails = {
    buyerId: users.buyerId,
    refundWallet: { bytes: encodeCoinPublicKey(users.buyerPk) },
    selectedCarrierId: users.carrierId,
    carrierFee: fee,
    deliveryAddress: "",
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
  simulator.switchUser(users.sellerPwd, users.sellerPk);
  const offer = simulator.offerItem(item, "");
  const res = { offer: offer, fee: fee };

  simulator.switchUser(users.carrierPwd, users.carrierPk);
  simulator.setCarrierBid(offer.id, fee, "");
  if (state == OfferState.New) {
    return res;
  }

  simulator.switchUser(users.buyerPwd, users.buyerPk);
  const coinInfoBuyer = createShieldedCoinInfo(
    simulator.getCoinColor(),
    item.price + fee,
  );
  simulator.purchaseItem(offer.id, users.carrierId, coinInfoBuyer, "");
  expect(simulator.getLedger().treasury.value).toEqual(offer.price + fee);
  if (state == OfferState.Purchased) {
    return res;
  }

  simulator.switchUser(users.carrierPwd, users.carrierPk);
  const coinInfoCarrier = createShieldedCoinInfo(
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
  it("witnesses and private state generation", () => {
    const [users, simulator] = randomUsers();
    simulator.switchUser(users.carrierPwd, users.carrierPk);
    const carrierEncryptionKeyPair =
      simulator.circuitContext.currentPrivateState.encryptionKeyPair;
    const carrierSecretKey =
      simulator.circuitContext.currentPrivateState.secretKey;

    simulator.switchUser(users.buyerPwd, users.buyerPk);
    const buyerEncryptionKeyPair =
      simulator.circuitContext.currentPrivateState.encryptionKeyPair;
    const buyerSecretKey =
      simulator.circuitContext.currentPrivateState.secretKey;

    simulator.switchUser(users.sellerPwd, users.sellerPk);
    const sellerEncryptionKeyPair =
      simulator.circuitContext.currentPrivateState.encryptionKeyPair;
    const sellerSecretKey =
      simulator.circuitContext.currentPrivateState.secretKey;

    expect(carrierEncryptionKeyPair).not.toEqual(buyerEncryptionKeyPair);
    expect(carrierEncryptionKeyPair).not.toEqual(sellerEncryptionKeyPair);
    expect(sellerEncryptionKeyPair).not.toEqual(buyerEncryptionKeyPair);

    expect(carrierSecretKey).not.toEqual(buyerSecretKey);
    expect(carrierSecretKey).not.toEqual(sellerSecretKey);
    expect(sellerSecretKey).not.toEqual(buyerSecretKey);

    const plainText = "Hello Midnight World!";
    const ciphertext = simulator.circuitContext.currentPrivateState.encrypt(
      plainText,
      sellerEncryptionKeyPair.publicKey,
    );
    expect(plainText).not.toEqual(ciphertext);
    const decrypted =
      simulator.circuitContext.currentPrivateState.decrypt(ciphertext);
    expect(plainText).toEqual(decrypted);
  });

  it("publishing an offer", () => {
    const pk = randomCoinPublicKeyHex();
    const pwd = randomBytes(32);
    const simulator = new DMarketSimulator(pwd, pk);
    const mySellerId = simulator.genSellerId(pk);

    const item = genRandomItem();

    const offer = simulator.offerItem(item, "");
    expect(() => simulator.offerItem(item, "")).toThrow(
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
    const [users, simulator] = randomUsers();
    const { offer, fee } = publishOffer(simulator, users, OfferState.New);

    const ledgerOffer = simulator.getLedger().offers.lookup(offer.id);
    expect(ledgerOffer).toEqual(offer);
    let feeBid = simulator
      .getLedger()
      .carrierBids.lookup(offer.id)
      .lookup(users.carrierId);
    expect(feeBid).toEqual(fee);

    expect(() => simulator.setCarrierBid(randomBytes(32), fee, "")).toThrow(
      "failed assert: Offer not found",
    );
    // update bid fee
    const newFee = randomNumber(10);
    simulator.setCarrierBid(offer.id, newFee, "");
    feeBid = simulator
      .getLedger()
      .carrierBids.lookup(offer.id)
      .lookup(users.carrierId);
    expect(feeBid).toEqual(newFee);
  });

  it("purchase an item selecting a carrier", () => {
    const [users, simulator] = randomUsers();

    const item = genRandomItem();
    const fee = randomNumber(10);
    const offer = simulator.offerItem(item, "");
    const coinInfo = createShieldedCoinInfo(
      simulator.getCoinColor(),
      item.price + fee,
    );
    expect(() =>
      simulator.purchaseItem(offer.id, randomBytes(32), coinInfo, ""),
    ).toThrow("failed assert: No carriers found for the offer");

    simulator.switchUser(users.carrierPwd, users.carrierPk);
    expect(simulator.getLedger().carrierBids.member(offer.id)).toBe(false);
    simulator.setCarrierBid(offer.id, fee, "");
    expect(simulator.getLedger().carrierBids.member(offer.id)).toBe(true);

    simulator.switchUser(users.buyerPwd, users.buyerPk);
    expect(() =>
      simulator.purchaseItem(offer.id, randomBytes(32), coinInfo, ""),
    ).toThrow("failed assert: Carrier not found among bidders");
    expect(() =>
      simulator.purchaseItem(randomBytes(32), users.carrierId, coinInfo, ""),
    ).toThrow("failed assert: Offer not found");

    const deliveryAddress = "My home address, for delivery";
    simulator.purchaseItem(
      offer.id,
      users.carrierId,
      coinInfo,
      deliveryAddress,
    );
    expect(simulator.getLedger().carrierBids.member(offer.id)).toBe(false);

    // we switch to carrier user to be able to decrypt the delivery address
    simulator.switchUser(users.carrierPwd, users.carrierPk);

    const contractOffer = simulator.getLedger().offers.lookup(offer.id);
    const decryptedDeiveryAddress =
      simulator.circuitContext.currentPrivateState.decrypt(
        contractOffer.purchaseDetails.value.deliveryAddress,
      );
    expect(deliveryAddress).toEqual(decryptedDeiveryAddress);

    const offerWithDeliveryAddr = buildUpdatedOffer(
      offer,
      users,
      OfferState.Purchased,
      fee,
    );
    offerWithDeliveryAddr.purchaseDetails.value.deliveryAddress =
      deliveryAddress;
    const storedOffer = simulator.getLedger().offers.lookup(offer.id);
    storedOffer.purchaseDetails.value.deliveryAddress =
      simulator.circuitContext.currentPrivateState.decrypt(
        storedOffer.purchaseDetails.value.deliveryAddress,
      );
    expect(storedOffer).toEqual(offerWithDeliveryAddr);
    expect(simulator.getLedger().treasury.value).toEqual(offer.price + fee);
  });

  it("invalid deposits for purchasing an item", () => {
    const [users, simulator] = randomUsers();
    const { offer, fee } = publishOffer(simulator, users, OfferState.New);
    expect(simulator.getLedger().treasury.value).toEqual(0n);
    const rightAmount = offer.price + fee;

    const nonNativeCoinInfo = createShieldedCoinInfo(
      toHex(randomBytes(32)),
      rightAmount,
    );
    expect(() =>
      simulator.purchaseItem(offer.id, users.carrierId, nonNativeCoinInfo, ""),
    ).toThrow("failed assert: Only dMarket coins can be used for payments");

    const tooLittleCoinInfo = createShieldedCoinInfo(
      simulator.getCoinColor(),
      rightAmount - 1n,
    );
    expect(() =>
      simulator.purchaseItem(offer.id, users.carrierId, tooLittleCoinInfo, ""),
    ).toThrow(
      "failed assert: Deposit amount must be equal to the item price plus the carrier fee",
    );

    const tooMuchCoinInfo = createShieldedCoinInfo(
      simulator.getCoinColor(),
      rightAmount + 1n,
    );
    expect(() =>
      simulator.purchaseItem(offer.id, users.carrierId, tooMuchCoinInfo, ""),
    ).toThrow(
      "failed assert: Deposit amount must be equal to the item price plus the carrier fee",
    );

    expect(simulator.getLedger().treasury.value).toEqual(0n);
  });

  it("carrier picks up a purchased item", () => {
    const [users, simulator] = randomUsers();
    const { offer, fee } = publishOffer(simulator, users, OfferState.Purchased);
    const coinInfo = createShieldedCoinInfo(
      simulator.getCoinColor(),
      offer.price + fee,
    );

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
    const updatedOffer = buildUpdatedOffer(
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
    const [users, simulator] = randomUsers();
    const { offer, fee } = publishOffer(simulator, users, OfferState.Purchased);
    const rightAmount = offer.price + fee;
    simulator.switchUser(users.carrierPwd, users.carrierPk);
    expect(simulator.getLedger().treasury.value).toEqual(offer.price + fee);

    const nonNativeCoinInfo = createShieldedCoinInfo(
      toHex(randomBytes(32)),
      rightAmount,
    );
    expect(() =>
      simulator.itemPickedUp(offer.id, nonNativeCoinInfo, null),
    ).toThrow("failed assert: Only dMarket coins can be used for payments");

    const tooLittleCoinInfo = createShieldedCoinInfo(
      simulator.getCoinColor(),
      rightAmount - 1n,
    );
    expect(() =>
      simulator.itemPickedUp(offer.id, tooLittleCoinInfo, null),
    ).toThrow(
      "failed assert: Deposit amount must be equal to the item price plus the carrier fee",
    );

    const tooMuchCoinInfo = createShieldedCoinInfo(
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
    const [users, simulator] = randomUsers();
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
    const [users, simulator] = randomUsers();
    const offer = publishOffer(simulator, users, OfferState.InTransit).offer;

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
    const [users, simulator] = randomUsers();
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
    const [users, simulator] = randomUsers();
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
    const [users, simulator] = randomUsers();
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
    const [users, simulator] = randomUsers();
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
    expect(simulator.getLedger().treasury.value).toEqual(0n);
  });

  it("users set rating after purchased is completed", () => {
    const [users, simulator] = randomUsers();
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

    const rateErr =
      "failed assert: Rate needs to be greater than 0 and smaller than 256";
    expect(() => simulator.rateSeller(offer.id, 0n)).toThrow(rateErr);
    expect(() => simulator.rateCarrier(offer.id, 0n)).toThrow(rateErr);
    expect(() => simulator.rateBuyer(offer.id, 0n)).toThrow(rateErr);
    expect(() => simulator.rateSeller(offer.id, 256n)).toThrow();
    expect(() => simulator.rateCarrier(offer.id, 256n)).toThrow();
    expect(() => simulator.rateBuyer(offer.id, 256n)).toThrow();

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
    const [users, simulator] = randomUsers();

    let offer = publishOffer(simulator, users, OfferState.New).offer;
    const coinInfo = createShieldedCoinInfo(
      simulator.getCoinColor(),
      offer.price,
    );
    simulator.switchUser(users.carrierPwd, users.carrierPk);
    expect(() => simulator.itemPickedUp(offer.id, coinInfo, null)).toThrow(
      "failed assert: Item has not been purchased or already picked up",
    );

    offer = publishOffer(simulator, users, OfferState.Purchased).offer;
    simulator.switchUser(users.sellerPwd, users.sellerPk);
    expect(() => simulator.confirmItemInTransit(offer.id)).toThrow(
      "failed assert: Item has not been purchased or already confirmed as picked up",
    );
    expect(() => simulator.confirmDelivered(offer.id)).toThrow(
      "failed assert: The item was already confirmed as delivered, or it has not been delivered yet",
    );
    expect(() => simulator.disputeItem(offer.id)).toThrow(
      "failed assert: The item was already confirmed as delivered, or it has not been delivered yet",
    );
  });
});
