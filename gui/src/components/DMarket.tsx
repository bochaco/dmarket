import React, {
  useCallback,
  Dispatch,
  SetStateAction,
  useState,
  useEffect,
} from "react";
import {
  UserRole,
  User,
  Offer,
  OfferStatus,
  DisputeResolutionType,
  DisputeReasonType,
  CarrierBid,
} from "../types";
import Header from "./Header";
import WorkInProgressModal, {
  WorkInProgressInfo,
  handleErrorForRendering,
} from "./WorkInProgressModal";
import CreateOfferForm from "./CreateOfferForm";
import OfferCard from "./OfferCard";
import OrderCard from "./OrderCard";
import Ranking from "./Ranking";
import SetupScreen, { SetupData } from "./SetupScreen";
import EtaModal from "./EtaModal";
import DisputeReasonModal from "./DisputeReasonModal";
import DisputeModal from "./DisputeModal";
import OfferModal from "./OfferModal";
import BidModal from "./BidModal";
import { useDeployedDMarketContext } from "../hooks";
import { type DMarketDeployment } from "../contexts";
import { type Observable } from "rxjs";
import {
  type DMarketDerivedState,
  type DeployedDMarketAPI,
} from "../../../api/src/index";
import { toHex } from "@midnight-ntwrk/midnight-js-utils";

// Props to pass to Modals displaying a form and using the dMarket API
export interface FormProps {
  dMarketApi: DeployedDMarketAPI | undefined;
  setIsWorking: Dispatch<SetStateAction<WorkInProgressInfo | null>>;
}

export interface DMarketProps {
  /** The observable DMarket deployment. */
  dMarketDeployment$?: Observable<DMarketDeployment>;
}

export const DMarket: React.FC<Readonly<DMarketProps>> = ({
  dMarketDeployment$,
}) => {
  const dMarketApiProvider = useDeployedDMarketContext();
  const [dMarketDeployment, setDMarketDeployment] =
    useState<DMarketDeployment>();
  const [dMarketApi, setDMarketAPI] = useState<DeployedDMarketAPI>();
  const [dMarketState, setDMarketState] = useState<DMarketDerivedState>();
  const [isWorking, setIsWorking] = useState<WorkInProgressInfo | null>(null);

  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [contractAddress, setContractAddress] = useState("");

  const [users, setUsers] = useState<User[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.Buyer);

  const [viewingOffer, setViewingOffer] = useState<Offer | null>(null);
  const [biddingOffer, setBiddingOffer] = useState<Offer | null>(null);
  const [updatingEtaOrder, setUpdatingEtaOrder] = useState<Offer | null>(null);
  const [openingDispute, setOpeningDispute] = useState<Offer | null>(null);
  const [managingDisputeOrder, setManagingDisputeOrder] =
    useState<Offer | null>(null);

  // Subscribes to the `dMarketDeployment$` observable so that we can receive updates on the deployment.
  useEffect(() => {
    if (!dMarketDeployment$) {
      return;
    }
    const subscription = dMarketDeployment$.subscribe(setDMarketDeployment);
    return () => {
      subscription.unsubscribe();
    };
  }, [dMarketDeployment$]);

  // Subscribes to the `state$` observable on a `DeployedDMarketAPI` if we receive one, allowing the
  // component to receive updates to the change in contract state; otherwise we update the UI to
  // reflect the error was received instead.
  useEffect(() => {
    if (!dMarketDeployment) {
      console.log(`No dMarket connection.`);
      return;
    }
    if (dMarketDeployment.status === "init") {
      console.log(`dMarket connection status: ${dMarketDeployment.status}`);
      return;
    }
    if (dMarketDeployment.status === "in-progress") {
      console.log(`dMarket connection status: ${dMarketDeployment.status}`);
      return;
    }
    if (dMarketDeployment.status === "failed") {
      console.log(
        `dMarket connection failed: ${JSON.stringify(dMarketDeployment.error)}`,
      );
      setContractAddress("");
      setIsWorking({
        ...handleErrorForRendering(
          dMarketDeployment.error,
          "Establishing connection to the Contract",
        ),
        onClose: () => {
          setIsSetupComplete(false);
        },
      });
      return;
    }
    console.log(`dMarket connection status: ${dMarketDeployment.status}`);

    setDMarketAPI(dMarketDeployment.api);
    setContractAddress(dMarketDeployment.api.deployedContractAddress);
    setIsWorking(null);
    setIsSetupComplete(true);

    // We need the DMarket API as well as subscribing to its `state$` observable, so that we can invoke
    // the methods later.
    const subscription =
      dMarketDeployment.api.state$.subscribe(setDMarketState);
    return () => {
      subscription.unsubscribe();
    };
  }, [dMarketDeployment, setDMarketAPI]);

  // Read current list of offers when we get a state update
  useEffect(() => {
    if (dMarketState) {
      let updatedUsers = carriersAsUsers(dMarketState).concat(
        sellersAsUsers(dMarketState),
      );
      let offers = updatedOffers(dMarketState, updatedUsers);
      setUsers(updatedUsers);
      setOffers(offers);
    }
  }, [dMarketState]);

  const handleSetupComplete = useCallback(
    async (data: SetupData) => {
      if (dMarketApiProvider) {
        const passwordEncoder = new TextEncoder();
        const accountPassword = passwordEncoder.encode(data.password);
        if (data.contractAddress) {
          setIsWorking({
            onClose: null,
            status: "in-progress",
            task: "Establishing connection to the dMarket Contract",
            desc: "Please wait while...",
          });
          dMarketApiProvider.resolve(data.contractAddress, accountPassword);
        } else {
          setIsWorking({
            onClose: null,
            status: "in-progress",
            task: "Deploying new dMarket Contract",
            desc: `Please wait...`,
          });
          const initNonce = new Uint8Array(32);
          window.crypto.getRandomValues(initNonce);
          dMarketApiProvider.create(initNonce, accountPassword);
        }
        setIsSetupComplete(true);
      }
    },
    [dMarketApiProvider],
  );

  // Handlers
  const handleDisconnect = useCallback(async () => {
    if (dMarketApiProvider) {
      setIsWorking({
        onClose: null,
        status: "in-progress",
        task: "Deconnecting from dMarket Contract",
        desc: `Address: ${contractAddress}`,
      });
      dMarketApiProvider.reset();
      setUsers([]);
      setOffers([]);
      setContractAddress("");
      setIsWorking(null);
      setIsSetupComplete(false);
    }
  }, [dMarketApiProvider]);

  const declineDelivery = (offerId: string) => {
    // TODO!!!!!!
  };

  const offersAvailable = offers.filter((offer) => {
    if (offer.status !== OfferStatus.Available) {
      return false;
    }
    if (currentRole === UserRole.Carrier || currentRole === UserRole.Buyer) {
      return true;
    }
    return dMarketState && dMarketState?.userIdAsSeller === offer.seller.id;
  });

  const allVisibleOrders = offers.filter((offer) => {
    if (offer.status === OfferStatus.Available || !dMarketState) {
      return false;
    }

    // try to filter by user Id
    switch (currentRole) {
      case UserRole.Seller:
        return dMarketState?.userIdAsSeller === offer.seller.id;
      case UserRole.Buyer:
        return dMarketState?.userIdAsBuyer === offer.purchaseDetails?.buyer.id;
      case UserRole.Carrier:
        return (
          dMarketState?.userIdAsCarrier === offer.purchaseDetails?.carrier.id
        );
    }
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
          (o) => o.status === OfferStatus.AwaitingCarrierAcceptance,
        )
      : [];
  const carrierActiveOrders =
    currentRole === UserRole.Carrier
      ? allVisibleOrders.filter(
          (o) => o.status !== OfferStatus.AwaitingCarrierAcceptance,
        )
      : [];

  if (!isSetupComplete) {
    return <SetupScreen onComplete={handleSetupComplete} />;
  }

  return (
    <div className="bg-brand-background min-h-screen text-brand-text-primary font-sans">
      <Header
        currentRole={currentRole}
        contractAddress={contractAddress}
        setCurrentRole={setCurrentRole}
        disconnectContract={handleDisconnect}
        formProps={{ dMarketApi, setIsWorking }}
      />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 xl:col-span-9">
            {currentRole === UserRole.Seller && (
              <CreateOfferForm
                dMarketApi={dMarketApi}
                setIsWorking={setIsWorking}
              />
            )}

            <h2 className="text-2xl font-bold mb-6">{getSectionTitle()}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
              {offersAvailable.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  currentRole={currentRole}
                  onViewDetails={setViewingOffer}
                  onPlaceBid={setBiddingOffer}
                />
              ))}
              {offersAvailable.length === 0 && (
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
                  {carrierPendingOrders.map((offer) => (
                    <OrderCard
                      key={offer.id}
                      offer={offer}
                      currentRole={currentRole}
                      formProps={{ dMarketApi, setIsWorking }}
                      declineDelivery={declineDelivery}
                      onUpdateEta={() => setUpdatingEtaOrder(offer)}
                      openDispute={() => setOpeningDispute(offer)}
                      onManageDispute={() => setManagingDisputeOrder(offer)}
                    />
                  ))}
                  {carrierPendingOrders.length === 0 && (
                    <p className="text-brand-text-secondary md:col-span-2 xl:col-span-3">
                      No offers awaiting your acceptance.
                    </p>
                  )}
                </div>

                <h2 className="text-2xl font-bold mb-6">Active Deliveries</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {carrierActiveOrders.map((offer) => (
                    <OrderCard
                      key={offer.id}
                      offer={offer}
                      currentRole={currentRole}
                      formProps={{ dMarketApi, setIsWorking }}
                      declineDelivery={declineDelivery}
                      onUpdateEta={() => setUpdatingEtaOrder(offer)}
                      openDispute={() => setOpeningDispute(offer)}
                      onManageDispute={() => setManagingDisputeOrder(offer)}
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
                    ? "Your Purchases"
                    : "Your Sales"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {allVisibleOrders.map((offer) => (
                    <OrderCard
                      key={offer.id}
                      offer={offer}
                      currentRole={currentRole}
                      formProps={{ dMarketApi, setIsWorking }}
                      declineDelivery={declineDelivery}
                      onUpdateEta={() => setUpdatingEtaOrder(offer)}
                      openDispute={() => setOpeningDispute(offer)}
                      onManageDispute={() => setManagingDisputeOrder(offer)}
                    />
                  ))}
                  {allVisibleOrders.length === 0 && (
                    <p className="text-brand-text-secondary md:col-span-2 xl:col-span-3">
                      No offers to display.
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

      {isWorking && (
        <WorkInProgressModal
          isWorking={isWorking}
          setIsWorking={setIsWorking}
        />
      )}

      {viewingOffer && (
        <OfferModal
          offer={viewingOffer}
          onClose={() => setViewingOffer(null)}
          formProps={{ dMarketApi, setIsWorking }}
        />
      )}

      {biddingOffer && (
        <BidModal
          offer={biddingOffer}
          onClose={() => setBiddingOffer(null)}
          formProps={{ dMarketApi, setIsWorking }}
        />
      )}

      {updatingEtaOrder && (
        <EtaModal
          offer={updatingEtaOrder}
          formProps={{ dMarketApi, setIsWorking }}
          onClose={() => setUpdatingEtaOrder(null)}
        />
      )}

      {openingDispute && (
        <DisputeReasonModal
          offer={openingDispute}
          formProps={{ dMarketApi, setIsWorking }}
          onClose={() => setOpeningDispute(null)}
        />
      )}

      {managingDisputeOrder && (
        <DisputeModal
          offer={managingDisputeOrder}
          formProps={{ dMarketApi, setIsWorking }}
          onClose={() => setManagingDisputeOrder(null)}
        />
      )}
    </div>
  );
};

export default DMarket;

const deserializeUserMetadataJson = (string: string): { name: string } => {
  try {
    // Attempt to parse the JSON string
    const parsedData = JSON.parse(string);
    return { name: parsedData.name };
  } catch (error) {
    return { name: "Unknown" };
  }
};

const deserializeMetadataJson = (
  string: string,
): { name: string; imageUrl: string; description: string } => {
  try {
    // Attempt to parse the JSON string
    const parsedData = JSON.parse(string);
    const url = parseUrl(parsedData.imageUrl);
    return {
      name: parsedData.name,
      imageUrl: url,
      description: `${parsedData.description.slice(0, 200)}...`,
    };
  } catch (error) {
    const url = parseUrl(string);
    return { name: "", imageUrl: url, description: "" };
  }
};

const parseUrl = (urlStr: string): string => {
  try {
    const url = new URL(urlStr).href ? urlStr : "";
    return url;
  } catch (error) {
    return "";
  }
};

const carriersAsUsers = (dMarketState: DMarketDerivedState): User[] => {
  const users = [];
  for (const [id, carrier] of dMarketState.carriers) {
    const carrierMeta = deserializeUserMetadataJson(carrier.meta);
    const carrierUser: User = {
      id,
      name: carrierMeta.name,
      role: UserRole.Carrier,
      ratings: {
        average: 0n,
        count: 0n,
      },
    };
    users.push(carrierUser);
  }
  return users;
};

const sellersAsUsers = (dMarketState: DMarketDerivedState): User[] => {
  const users = [];
  for (const [id, seller] of dMarketState.sellers) {
    const sellerMeta = deserializeUserMetadataJson(seller.meta);
    const sellerUser: User = {
      id,
      name: sellerMeta.name,
      role: UserRole.Seller,
      ratings: {
        average: 0n,
        count: 0n,
      },
    };
    users.push(sellerUser);
  }
  return users;
};

const updatedOffers = (
  dMarketState: DMarketDerivedState,
  updatedUsers: User[],
): Offer[] => {
  let updatedOffers = [];
  for (const [id, offer] of dMarketState.offers) {
    const meta = deserializeMetadataJson(offer.meta);
    const sellerId = toHex(offer.seller);
    const sellerUser = updatedUsers.find((u) => u.id === sellerId);
    if (sellerUser) {
      const carrierBids = dMarketState.carrierBids.get(id);
      const bids = [];
      if (carrierBids) {
        for (const [carrierId, fee] of carrierBids) {
          const carrier = updatedUsers.find((u) => u.id === carrierId);
          if (carrier) {
            bids.push({ carrier, fee });
          }
        }
      }

      let purchaseDetails = null;
      if (offer.purchaseDetails.is_some) {
        const carrier = updatedUsers.find(
          (u) => u.id === toHex(offer.purchaseDetails.value.selectedCarrierId),
        );
        if (carrier) {
          const buyerId = toHex(offer.purchaseDetails.value.buyerId);
          const buyer: User = {
            id: buyerId,
            name: `${buyerId.substring(0, 6)}..${buyerId.substring(buyerId.length - 6)}`,
            role: UserRole.Buyer,
            ratings: {
              average: 0n,
              count: 0n,
            },
          };

          // calculate ratings for all users involved in this offer
          for (const rating of offer.sellerRatings) {
            sellerUser.ratings = calculateRatingAverage(
              sellerUser.ratings,
              rating,
            );
          }
          for (const rating of offer.carrierRatings) {
            carrier.ratings = calculateRatingAverage(carrier.ratings, rating);
          }

          for (const rating of offer.buyerRatings) {
            buyer.ratings = calculateRatingAverage(buyer.ratings, rating);
          }
          let b = updatedUsers.find((u) => u.id === buyerId);
          if (b) {
            b.ratings = buyer.ratings;
          } else {
            updatedUsers.push(buyer);
          }

          // set purchase details for this offer
          purchaseDetails = {
            deliveryFee: offer.purchaseDetails.value.carrierFee,
            carrier,
            buyer,
          };
        }
      }

      const o: Offer = {
        id: id,
        status: getOfferStatus(offer.state.valueOf()),
        eta:
          offer.deliveryEta > 0
            ? new Date(parseInt(offer.deliveryEta.toString()))
            : null,
        name: meta.name,
        description: meta.description,
        price: offer.price,
        imageUrls: [meta.imageUrl],
        seller: sellerUser,
        bids,
        purchaseDetails,
        ratings: {
          buyer: {
            ratedBySeller: offer.buyerRatings[0],
            ratedByCarrier: offer.buyerRatings[1],
          },
          seller: {
            ratedByCarrier: offer.sellerRatings[0],
            ratedByBuyer: offer.sellerRatings[1],
          },
          carrier: {
            ratedBySeller: offer.carrierRatings[0],
            ratedByBuyer: offer.carrierRatings[1],
          },
        },
      };
      updatedOffers.push(o);
    }
  }
  return updatedOffers;
};

const getOfferStatus = (state: number): OfferStatus => {
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

const calculateRatingAverage = (
  current: { average: bigint; count: bigint },
  rating: bigint,
): { average: bigint; count: bigint } => {
  if (rating === 0n) {
    // short-circiut as we don't count this rating
    return { average: current.average, count: current.count };
  }

  let average =
    (BigInt(current.average * current.count) + rating) /
    BigInt(current.count + 1n);
  return { average, count: current.count + 1n };
};
