import React, { useState, useEffect } from "react";
import {
  UserRole,
  User,
  Offer,
  Order,
  OrderStatus,
  DisputeResolutionType,
  CarrierBid,
} from "./types";
import Header from "./components/Header";
import CreateOfferForm from "./components/CreateOfferForm";
import OfferCard from "./components/OfferCard";
import OrderCard from "./components/OrderCard";
import Ranking from "./components/Ranking";
import EtaModal from "./components/EtaModal";
import DisputeModal from "./components/DisputeModal";
import OfferModal from "./components/OfferModal";
import BidModal from "./components/BidModal";

// Mock Data
const initialUsers: User[] = [
  {
    id: 1,
    name: "Alice",
    role: [UserRole.Buyer],
    ratings: { average: 4.8, count: 12 },
  },
  {
    id: 2,
    name: "Bob",
    role: [UserRole.Seller],
    ratings: { average: 4.9, count: 25 },
  },
  {
    id: 3,
    name: "Charlie",
    role: [UserRole.Carrier],
    ratings: { average: 4.7, count: 30 },
  },
  {
    id: 4,
    name: "Diana",
    role: [UserRole.Buyer, UserRole.Seller],
    ratings: { average: 4.5, count: 5 },
  },
];

const initialOffers: Offer[] = [
  {
    id: 2,
    name: "Antique Pocket Watch",
    description:
      "A beautifully crafted gold-plated pocket watch from the early 20th century. Keeps excellent time and has intricate engravings.",
    price: 5.1,
    imageUrls: [
      "https://picsum.photos/seed/watch/800/600",
      "https://picsum.photos/seed/watch2/800/600",
    ],
    seller: initialUsers[3],
    bids: [],
  },
];

const initialOrders: Order[] = [
  {
    id: 1,
    offer: {
      id: 1,
      name: "Vintage Leather Jacket",
      description:
        "A stylish vintage leather jacket from the 80s, in great condition. Comes in a dark brown color, perfect for a classic look.",
      price: 2.5,
      imageUrls: [
        "https://picsum.photos/seed/jacket/800/600",
        "https://picsum.photos/seed/jacket2/800/600",
        "https://picsum.photos/seed/jacket3/800/600",
      ],
      seller: initialUsers[1],
      bids: [{ carrier: initialUsers[2], fee: 0.25 }],
    },
    buyer: initialUsers[0],
    carrier: initialUsers[2],
    deliveryFee: 0.25,
    status: OrderStatus.AwaitingCarrierAcceptance,
    eta: null,
    trackingId: `TRK-${Date.now()}-ABCDEFG`,
  },
  {
    id: 2,
    offer: {
      id: 3,
      name: "Cyberpunk Desk Mat",
      description: "A large desk mat with a neon city-scape design.",
      price: 0.5,
      imageUrls: ["https://picsum.photos/seed/deskmat/800/600"],
      seller: initialUsers[3], // Diana
      bids: [{ carrier: initialUsers[2], fee: 0.1 }],
    },
    buyer: initialUsers[0], // Alice
    carrier: initialUsers[2], // Charlie
    deliveryFee: 0.1,
    status: OrderStatus.Delivered,
    eta: "Delivered",
    trackingId: `TRK-${Date.now() - 60000}-HIJKLMN`,
    deliveredTimestamp: Date.now() - 60 * 1000, // Delivered 1 minute ago
  },
];

const CONFIRMATION_PERIOD_MS = 2 * 60 * 1000; // 2 minutes for demo purposes

declare global {
  interface Window {
    ethereum?: any;
  }
}

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.Buyer);

  const [viewingOffer, setViewingOffer] = useState<Offer | null>(null);
  const [biddingOffer, setBiddingOffer] = useState<Offer | null>(null);
  const [updatingEtaOrder, setUpdatingEtaOrder] = useState<Order | null>(null);
  const [managingDisputeOrder, setManagingDisputeOrder] =
    useState<Order | null>(null);

  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Effect for the automatic confirmation failsafe
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let needsUpdate = false;
      const updatedOrders = orders.map((order) => {
        if (
          order.status === OrderStatus.Delivered &&
          order.deliveredTimestamp
        ) {
          if (now - order.deliveredTimestamp > CONFIRMATION_PERIOD_MS) {
            console.log(`Order #${order.id} auto-finalized.`);
            needsUpdate = true;
            return { ...order, status: OrderStatus.Completed };
          }
        }
        return order;
      });

      if (needsUpdate) {
        setOrders(updatedOrders);
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [orders]);

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        console.log("Requesting wallet connection...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const mockAddress = "0x1234...AbCd";
        setWalletAddress(mockAddress);
        setIsWalletConnected(true);
      } catch (error) {
        console.error("User denied account access or error occurred:", error);
      }
    } else {
      alert("Please install a Web3 wallet like MetaMask!");
    }
  };

  const generateDescription = async (itemName: string): Promise<string> => {
    // TODO!!!
    return `A high-quality ${itemName}.`;
  };

  const createOffer = async (
    name: string,
    description: string,
    price: number,
    imageUrl: string,
  ) => {
    const seller = users.find((u) => u.role.includes(UserRole.Seller))!;
    let finalDescription = description;
    if (!description) {
      finalDescription = await generateDescription(name);
    }
    const newOffer: Offer = {
      id:
        offers.length > 0
          ? Math.max(
              ...offers.map((o) => o.id),
              ...initialOrders.map((o) => o.offer.id),
            ) + 1
          : 1,
      name,
      description: finalDescription,
      price,
      imageUrls: [imageUrl],
      seller,
      bids: [],
    };
    setOffers((prev) => [newOffer, ...prev]);
  };

  const buyOfferWithCarrier = (offerId: number, bid: CarrierBid) => {
    const offer = offers.find((o) => o.id === offerId);
    const buyer = users.find((u) => u.role.includes(UserRole.Buyer))!;
    if (offer && buyer && bid) {
      const newOrder: Order = {
        id: orders.length > 0 ? Math.max(...orders.map((o) => o.id)) + 1 : 1,
        offer,
        buyer,
        carrier: bid.carrier,
        deliveryFee: bid.fee,
        status: OrderStatus.AwaitingCarrierAcceptance,
        eta: null,
        trackingId: `TRK-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      };
      setOrders((prev) => [newOrder, ...prev]);
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
      setViewingOffer(null);
    }
  };

  const acceptDelivery = (orderId: number) => {
    setOrders(
      orders.map((o) =>
        o.id === orderId
          ? { ...o, status: OrderStatus.AwaitingPickupConfirmation }
          : o,
      ),
    );
  };

  const declineDelivery = (orderId: number) => {
    const orderToDecline = orders.find((o) => o.id === orderId);
    if (!orderToDecline) return;

    const restoredOffer = { ...orderToDecline.offer };
    restoredOffer.bids = restoredOffer.bids.filter(
      (bid) => bid.carrier.id !== orderToDecline.carrier.id,
    );

    setOffers((prev) => [restoredOffer, ...prev].sort((a, b) => a.id - b.id));
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const handlePlaceBid = (offerId: number, fee: number) => {
    const carrier = users.find((u) => u.role.includes(UserRole.Carrier))!; // Simplified
    setOffers(
      offers.map((o) => {
        if (o.id === offerId) {
          const existingBidIndex = o.bids.findIndex(
            (b) => b.carrier.id === carrier.id,
          );
          const newBids = [...o.bids];
          if (existingBidIndex > -1) {
            newBids[existingBidIndex] = { carrier, fee };
          } else {
            newBids.push({ carrier, fee });
          }
          return { ...o, bids: newBids };
        }
        return o;
      }),
    );
    setBiddingOffer(null);
  };

  const confirmCarrierPickup = (orderId: number) => {
    setOrders(
      orders.map((o) =>
        o.id === orderId ? { ...o, status: OrderStatus.InTransit } : o,
      ),
    );
  };

  const updateETA = (orderId: number, newEta: string) => {
    setOrders(
      orders.map((o) => (o.id === orderId ? { ...o, eta: newEta } : o)),
    );
    setUpdatingEtaOrder(null);
  };

  const markAsDelivered = (orderId: number) => {
    setOrders(
      orders.map((o) =>
        o.id === orderId ? { ...o, status: OrderStatus.AwaitingScan } : o,
      ),
    );
  };

  const scanAndConfirmDelivery = (orderId: number) => {
    setOrders(
      orders.map((o) =>
        o.id === orderId && o.status === OrderStatus.AwaitingScan
          ? {
              ...o,
              status: OrderStatus.Delivered,
              deliveredTimestamp: Date.now(),
            }
          : o,
      ),
    );
  };

  const confirmDelivery = (orderId: number) => {
    setOrders(
      orders.map((o) =>
        o.id === orderId
          ? { ...o, status: OrderStatus.Completed, deliveredTimestamp: null }
          : o,
      ),
    );
  };

  const openDispute = (orderId: number) => {
    setOrders(
      orders.map((o) =>
        o.id === orderId ? { ...o, status: OrderStatus.DisputeOpened } : o,
      ),
    );
  };

  const handleManageDispute = (
    orderId: number,
    resolution: DisputeResolutionType,
    reason: string,
  ) => {
    let newStatus: OrderStatus;
    switch (resolution) {
      case "refund":
        newStatus = OrderStatus.Refunded;
        break;
      case "reject":
        newStatus = OrderStatus.Completed;
        break;
      case "escalate":
        newStatus = OrderStatus.AwaitingArbitration;
        break;
      case "confiscate":
        newStatus = OrderStatus.CarrierDepositConfiscated;
        break;
      default:
        newStatus = OrderStatus.DisputeOpened;
    }
    setOrders(
      orders.map((o) =>
        o.id === orderId
          ? { ...o, status: newStatus, deliveredTimestamp: null }
          : o,
      ),
    );
    setManagingDisputeOrder(null);
  };

  const rateUser = (
    orderId: number,
    roleToRate: "buyer" | "seller" | "carrier",
    rating: number,
  ) => {
    setOrders((prevOrders) => {
      return prevOrders.map((order) => {
        if (order.id !== orderId) return order;
        const newRankings = { ...order.rankings };
        if (currentRole === UserRole.Buyer) {
          newRankings.buyer = { ...newRankings.buyer };
          if (roleToRate === "seller") newRankings.buyer.ratedSeller = true;
          if (roleToRate === "carrier") newRankings.buyer.ratedCarrier = true;
        } else if (currentRole === UserRole.Seller) {
          newRankings.seller = { ...newRankings.seller, ratedBuyer: true };
        } else if (currentRole === UserRole.Carrier) {
          newRankings.carrier = { ...newRankings.carrier, ratedBuyer: true };
        }
        return { ...order, rankings: newRankings };
      });
    });
  };

  const visibleOffers =
    currentRole === UserRole.Carrier
      ? offers
      : offers.filter((offer) => {
          if (currentRole === UserRole.Buyer) return true;
          if (currentRole === UserRole.Seller)
            return (
              offer.seller.id ===
              users.find((u) => u.role.includes(UserRole.Seller))!.id
            );
          return false;
        });

  const allVisibleOrders = orders.filter((order) => {
    const buyer = users.find((u) => u.role.includes(UserRole.Buyer))!;
    const seller = users.find((u) => u.role.includes(UserRole.Seller))!;
    const carrier = users.find((u) => u.role.includes(UserRole.Carrier))!;

    if (currentRole === UserRole.Buyer) return order.buyer.id === buyer.id;
    if (currentRole === UserRole.Seller)
      return order.offer.seller.id === seller.id;
    if (currentRole === UserRole.Carrier)
      return order.carrier?.id === carrier.id;
    return false;
  });

  const getSectionTitle = () => {
    switch (currentRole) {
      case UserRole.Buyer:
        return "Available Offers";
      case UserRole.Seller:
        return "Your Active Offers";
      case UserRole.Carrier:
        return "Offers Available for Bidding";
      default:
        return "Offers";
    }
  };

  const carrierPendingOrders =
    currentRole === UserRole.Carrier
      ? allVisibleOrders.filter(
          (o) => o.status === OrderStatus.AwaitingCarrierAcceptance,
        )
      : [];
  const carrierActiveOrders =
    currentRole === UserRole.Carrier
      ? allVisibleOrders.filter(
          (o) => o.status !== OrderStatus.AwaitingCarrierAcceptance,
        )
      : [];

  return (
    <div className="bg-brand-background min-h-screen text-brand-text-primary font-sans">
      <Header
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        isWalletConnected={isWalletConnected}
        walletAddress={walletAddress}
        connectWallet={connectWallet}
      />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 xl:col-span-9">
            {currentRole === UserRole.Seller && (
              <CreateOfferForm createOffer={createOffer} />
            )}

            <h2 className="text-2xl font-bold mb-6">{getSectionTitle()}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
              {visibleOffers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  currentRole={currentRole}
                  onViewDetails={setViewingOffer}
                  onPlaceBid={setBiddingOffer}
                />
              ))}
              {visibleOffers.length === 0 && (
                <p className="text-brand-text-secondary md:col-span-2 xl:col-span-3">
                  No offers available.
                </p>
              )}
            </div>

            {currentRole === UserRole.Carrier ? (
              <>
                <h2 className="text-2xl font-bold mb-6">
                  Awaiting Your Acceptance
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
                  {carrierPendingOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      currentRole={currentRole}
                      acceptDelivery={acceptDelivery}
                      declineDelivery={declineDelivery}
                      confirmCarrierPickup={confirmCarrierPickup}
                      onUpdateETA={() => setUpdatingEtaOrder(order)}
                      markAsDelivered={markAsDelivered}
                      scanAndConfirmDelivery={scanAndConfirmDelivery}
                      confirmDelivery={confirmDelivery}
                      openDispute={openDispute}
                      onManageDispute={() => setManagingDisputeOrder(order)}
                      rateUser={rateUser}
                      confirmationPeriod={CONFIRMATION_PERIOD_MS}
                    />
                  ))}
                  {carrierPendingOrders.length === 0 && (
                    <p className="text-brand-text-secondary md:col-span-2 xl:col-span-3">
                      No orders awaiting your acceptance.
                    </p>
                  )}
                </div>

                <h2 className="text-2xl font-bold mb-6">Active Deliveries</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {carrierActiveOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      currentRole={currentRole}
                      acceptDelivery={acceptDelivery}
                      declineDelivery={declineDelivery}
                      confirmCarrierPickup={confirmCarrierPickup}
                      onUpdateETA={() => setUpdatingEtaOrder(order)}
                      markAsDelivered={markAsDelivered}
                      scanAndConfirmDelivery={scanAndConfirmDelivery}
                      confirmDelivery={confirmDelivery}
                      openDispute={openDispute}
                      onManageDispute={() => setManagingDisputeOrder(order)}
                      rateUser={rateUser}
                      confirmationPeriod={CONFIRMATION_PERIOD_MS}
                    />
                  ))}
                  {carrierActiveOrders.length === 0 && (
                    <p className="text-brand-text-secondary md:col-span-2 xl:col-span-3">
                      No active deliveries.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-6">
                  {currentRole === UserRole.Buyer
                    ? "Your Orders"
                    : "Your Sales"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {allVisibleOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      currentRole={currentRole}
                      acceptDelivery={acceptDelivery}
                      declineDelivery={declineDelivery}
                      confirmCarrierPickup={confirmCarrierPickup}
                      onUpdateETA={() => setUpdatingEtaOrder(order)}
                      markAsDelivered={markAsDelivered}
                      scanAndConfirmDelivery={scanAndConfirmDelivery}
                      confirmDelivery={confirmDelivery}
                      openDispute={openDispute}
                      onManageDispute={() => setManagingDisputeOrder(order)}
                      rateUser={rateUser}
                      confirmationPeriod={CONFIRMATION_PERIOD_MS}
                    />
                  ))}
                  {allVisibleOrders.length === 0 && (
                    <p className="text-brand-text-secondary md:col-span-2 xl:col-span-3">
                      No orders to display.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="lg:col-span-4 xl:col-span-3">
            <Ranking users={users} />
          </div>
        </div>
      </main>

      {viewingOffer && (
        <OfferModal
          offer={viewingOffer}
          onClose={() => setViewingOffer(null)}
          onBuy={buyOfferWithCarrier}
        />
      )}

      {biddingOffer && (
        <BidModal
          offer={biddingOffer}
          onClose={() => setBiddingOffer(null)}
          onSubmit={handlePlaceBid}
        />
      )}

      {updatingEtaOrder && (
        <EtaModal
          order={updatingEtaOrder}
          onClose={() => setUpdatingEtaOrder(null)}
          onSubmit={updateETA}
        />
      )}

      {managingDisputeOrder && (
        <DisputeModal
          order={managingDisputeOrder}
          onClose={() => setManagingDisputeOrder(null)}
          onSubmit={handleManageDispute}
        />
      )}
    </div>
  );
};

export default App;
