// types.ts
export enum UserRole {
  Buyer = "Buyer",
  Seller = "Seller",
  Carrier = "Carrier",
}

export enum OfferStatus {
  Available = "Available",
  AwaitingCarrierAcceptance = "Awaiting Carrier Acceptance",
  AwaitingPickupConfirmation = "Awaiting Pickup Confirmation",
  InTransit = "In Transit",
  Delivered = "Delivered",
  Completed = "Completed",
  DisputeOpened = "Dispute Opened",
  Cancelled = "Cancelled",
  Refunded = "Refunded",
  CarrierDepositConfiscated = "Carrier's Deposit Confiscated",
}

export const getOfferStatus = (state: number): OfferStatus => {
  let status = OfferStatus.Available;
  switch (state) {
    case 0:
      status = OfferStatus.Available;
      break;
    case 1:
      status = OfferStatus.AwaitingCarrierAcceptance;
      break;
    case 2:
      status = OfferStatus.AwaitingPickupConfirmation;
      break;
    case 3:
      status = OfferStatus.InTransit;
      break;
    case 4:
      status = OfferStatus.Delivered;
      break;
    case 5:
      status = OfferStatus.DisputeOpened;
      break;
    case 6:
      status = OfferStatus.Completed;
    // TODO!!!
    //status = OfferStatus.Cancelled;
    //status = OfferStatus.Refunded;
    //status = OfferStatus.CarrierDepositConfiscated;
  }
  return status;
};

export interface User {
  id: string;
  name: string;
  role: UserRole;
  ratings: {
    average: bigint;
    count: bigint;
  };
}

export interface CarrierBid {
  carrier: User;
  fee: bigint;
}

export interface OfferedItem {
  name: string;
  description: string;
  imageUrls: string[];
}

export interface Offer {
  id: string;
  status: OfferStatus;
  eta: Date | null;
  item: OfferedItem;
  price: bigint;
  seller: User;
  bids: CarrierBid[];
  purchaseDetails: {
    buyer: User;
    carrier: User;
    deliveryFee: bigint;
    deliveryAddress: string;
  } | null;
  ratings: {
    buyer: {
      ratedBySeller: bigint;
      ratedByCarrier: bigint;
    };
    seller: {
      ratedByCarrier: bigint;
      ratedByBuyer: bigint;
    };
    carrier: {
      ratedBySeller: bigint;
      ratedByBuyer: bigint;
    };
  };
}

export type DisputeReasonType =
  | "Defective"
  | "Regreted"
  | "Wrong size"
  | "Other";

export type DisputeResolutionType = "Refund" | "Reject" | "Confiscate";
