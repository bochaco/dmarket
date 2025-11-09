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

export interface Offer {
  id: string;
  status: OfferStatus;
  eta: Date | null;
  name: string;
  description: string;
  price: bigint;
  imageUrls: string[];
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
