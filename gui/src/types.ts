// types.ts
export enum UserRole {
  Buyer = "Buyer",
  Seller = "Seller",
  Carrier = "Carrier",
}

export enum OrderStatus {
  AwaitingCarrierAcceptance = "Awaiting Carrier Acceptance",
  AwaitingPickupConfirmation = "Awaiting Pickup Confirmation",
  InTransit = "In Transit",
  AwaitingScan = "Awaiting Scan Confirmation",
  Delivered = "Delivered",
  Completed = "Completed",
  DisputeOpened = "Dispute Opened",
  Cancelled = "Cancelled",
  Refunded = "Refunded",
  AwaitingArbitration = "Awaiting Arbitration",
  CarrierDepositConfiscated = "Carrier's Deposit Confiscated",
}

export interface User {
  id: number;
  name: string;
  role: UserRole[];
  ratings: {
    average: number;
    count: number;
  };
}

export interface CarrierBid {
  carrier: User;
  fee: number;
}

export interface Offer {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrls: string[]; // Changed from imageUrl to support gallery
  seller: User;
  bids: CarrierBid[];
}

export interface Order {
  id: number;
  offer: Offer;
  buyer: User;
  carrier: User; // No longer nullable
  deliveryFee: number; // Added delivery fee
  status: OrderStatus;
  eta: string | null;
  trackingId: string;
  deliveredTimestamp?: number | null; // For auto-confirmation timer
  rankings?: {
    buyer?: {
      ratedSeller?: boolean;
      ratedCarrier?: boolean;
    };
    seller?: {
      ratedBuyer?: boolean;
    };
    carrier?: {
      ratedBuyer?: boolean;
    };
  };
}

export type DisputeReasonType =
  | "defective"
  | "regreted"
  | "wrong_size"
  | "other";

export type DisputeResolutionType =
  | "refund"
  | "reject"
  | "escalate"
  | "confiscate";
