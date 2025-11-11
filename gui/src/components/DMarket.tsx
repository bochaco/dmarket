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
import { updatedOffers, sellersAsUsers, carriersAsUsers } from "../utils.js";

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
  DMarketAPI,
  type DMarketDerivedState,
  type DeployedDMarketAPI,
} from "../../../api/src/index";

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
  const [userName, setUserName] = useState("");
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
      setUserName("");
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
      let offers = updatedOffers(dMarketState, dMarketApi, updatedUsers);
      setUsers(updatedUsers);
      setOffers(offers);
    }
  }, [dMarketState, dMarketApi]);

  const handleSetupComplete = useCallback(
    async (data: SetupData) => {
      if (dMarketApiProvider) {
        setUserName(data.username);
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
      setUserName("");
      setContractAddress("");
      setIsWorking(null);
      setIsSetupComplete(false);
    }
  }, [dMarketApiProvider]);

  const offersAvailable = offers.filter((offer) => {
    if (offer.status !== OfferStatus.Available || !dMarketState) {
      return false;
    }
    switch (currentRole) {
      case UserRole.Carrier:
      case UserRole.Buyer:
        return dMarketState?.userIdAsSeller !== offer.seller.id;
      case UserRole.Seller:
        return dMarketState?.userIdAsSeller === offer.seller.id;
    }
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
                userName={userName}
                formProps={{
                  dMarketApi,
                  setIsWorking,
                }}
              />
            )}

            <h2 className="text-2xl font-bold mb-6">{getSectionTitle()}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
              {offersAvailable.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  currentRole={currentRole}
                  userIdAsCarrier={dMarketState?.userIdAsCarrier}
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
          userIdAsCarrier={dMarketState?.userIdAsCarrier}
          onClose={() => setViewingOffer(null)}
          formProps={{ dMarketApi, setIsWorking }}
        />
      )}

      {biddingOffer && (
        <BidModal
          offer={biddingOffer}
          userName={userName}
          userIdAsCarrier={dMarketState?.userIdAsCarrier}
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
