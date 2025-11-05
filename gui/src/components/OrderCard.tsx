import React, { useState, useEffect, useCallback } from 'react';
import { Offer, OfferStatus, UserRole } from '../types';
import RankingInput from './RankingInput';
import { FormProps } from './DMarket';
import { handleErrorForRendering } from './WorkInProgressModal';

interface OrderCardProps {
  offer: Offer;
  currentRole: UserRole;
  formProps: FormProps;
  declineDelivery: (offerId: string) => void;
  onUpdateEta: (offer: Offer) => void;
  openDispute: (offerId: string) => void;
  onManageDispute: (offer: Offer) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({
  offer,
  currentRole,
  formProps,
  declineDelivery,
  onUpdateEta,
  openDispute,
  onManageDispute,
}) => {
  const { seller, status, eta, purchaseDetails } = offer;
  const carrier = purchaseDetails ? purchaseDetails.carrier : null;
  const buyer = purchaseDetails ? purchaseDetails.buyer : null;
  const deliveryFee = purchaseDetails ? purchaseDetails.deliveryFee : 0n;

  const acceptDeliveryOrder = useCallback(
    async (offerId: string, depositAmount: bigint, itemName: string) => {
      if (formProps.dMarketApi) {
        try {
          formProps.setIsWorking({
            onClose: null,
            status: 'in-progress',
            task: 'Accepting delivery order and changing status to Picked Up',
            desc: `Item: ${itemName} - Escrow Deposit: ${depositAmount} DMRK`,
          });
          await formProps.dMarketApi.itemPickedUp(offerId, depositAmount, null);
          formProps.setIsWorking(null);
        } catch (error) {
          formProps.setIsWorking(
            handleErrorForRendering(error, 'Accepting delivery order and changing status to Picked Up'),
          );
        }
      }
    },
    [formProps.dMarketApi],
  );

  const confirmCarrierPickup = useCallback(
    async (offerId: string, itemName: string) => {
      if (formProps.dMarketApi) {
        try {
          formProps.setIsWorking({
            onClose: null,
            status: 'in-progress',
            task: 'Confirming delivery order was accepted and is In Transit',
            desc: `Item: ${itemName}`,
          });
          await formProps.dMarketApi.confirmItemInTransit(offerId);
          formProps.setIsWorking(null);
        } catch (error) {
          formProps.setIsWorking(
            handleErrorForRendering(error, 'Confirming delivery order was accepted and is In Transit'),
          );
        }
      }
    },
    [formProps.dMarketApi],
  );

  const markAsDelivered = useCallback(
    async (offerId: string, itemName: string) => {
      if (formProps.dMarketApi) {
        try {
          formProps.setIsWorking({
            onClose: null,
            status: 'in-progress',
            task: 'Setting item as delivered',
            desc: `Item: ${itemName}`,
          });
          await formProps.dMarketApi.delivered(offerId);
          formProps.setIsWorking(null);
        } catch (error) {
          formProps.setIsWorking(handleErrorForRendering(error, 'Setting item as delivered'));
        }
      }
    },
    [formProps.dMarketApi],
  );

  const confirmDelivered = useCallback(
    async (offerId: string, itemName: string) => {
      if (formProps.dMarketApi) {
        try {
          formProps.setIsWorking({
            onClose: null,
            status: 'in-progress',
            task: 'Confirming item was delivered and releasing payment',
            desc: `Item: ${itemName}`,
          });
          await formProps.dMarketApi.confirmDelivered(offerId);
          formProps.setIsWorking(null);
        } catch (error) {
          formProps.setIsWorking(handleErrorForRendering(error, 'Confirming item was delivered and releasing payment'));
        }
      }
    },
    [formProps.dMarketApi],
  );

  const rateUser = useCallback(
    async (offerId: string, itemName: string, roleToRate: 'buyer' | 'seller' | 'carrier', rating: number) => {
      if (formProps.dMarketApi) {
        try {
          formProps.setIsWorking({
            onClose: null,
            status: 'in-progress',
            task: `Rating ${roleToRate}`,
            desc: `Item: ${itemName}`,
          });
          switch (roleToRate) {
            case 'seller':
              await formProps.dMarketApi.rateSeller(offerId, BigInt(rating));
              break;
            case 'carrier':
              await formProps.dMarketApi.rateCarrier(offerId, BigInt(rating));
              break;
            case 'buyer':
              await formProps.dMarketApi.rateBuyer(offerId, BigInt(rating));
              break;
          }
          formProps.setIsWorking(null);
        } catch (error) {
          formProps.setIsWorking(handleErrorForRendering(error, `Rating ${roleToRate}`));
        }
      }
    },
    [formProps.dMarketApi, currentRole],
  );

  const renderActions = () => {
    switch (currentRole) {
      case UserRole.Carrier:
        if (status === OfferStatus.AwaitingCarrierAcceptance) {
          return (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => declineDelivery(offer.id)}
                className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md bg-red-600 text-white hover:bg-red-500"
              >
                Decline
              </button>
              <button
                onClick={() => acceptDeliveryOrder(offer.id, offer.price + deliveryFee, offer.name)}
                className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 bg-gradient-to-r from-brand-accent to-brand-primary text-white hover:from-lime-400 hover:to-cyan-400"
              >
                Accept & Stake Deposit
              </button>
            </div>
          );
        }
        if (status === OfferStatus.InTransit) {
          return (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => onUpdateEta(offer)}
                className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md bg-slate-700 text-brand-text-primary border border-slate-600 hover:bg-slate-600"
              >
                Update ETA
              </button>
              <button
                onClick={() => markAsDelivered(offer.id, offer.name)}
                className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 bg-gradient-to-r from-brand-accent to-brand-primary text-white hover:from-lime-400 hover:to-cyan-400"
              >
                Mark as Delivered
              </button>
            </div>
          );
        }
        return null;
      case UserRole.Seller:
        if (status === OfferStatus.AwaitingPickupConfirmation) {
          return (
            <button
              onClick={() => confirmCarrierPickup(offer.id, offer.name)}
              className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 bg-gradient-to-r from-brand-accent to-brand-primary text-white hover:from-lime-400 hover:to-cyan-400"
            >
              Confirm Carrier Pickup
            </button>
          );
        }
        if (status === OfferStatus.DisputeOpened) {
          return (
            <button
              onClick={() => onManageDispute(offer)}
              className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500 to-red-500 text-white hover:from-fuchsia-400 hover:to-red-400"
            >
              Manage Dispute
            </button>
          );
        }
        return null;
      case UserRole.Buyer:
        if (status === OfferStatus.Delivered) {
          return (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => confirmDelivered(offer.id, offer.name)}
                className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 bg-gradient-to-r from-brand-accent to-brand-primary text-white hover:from-lime-400 hover:to-cyan-400"
              >
                Confirm & Finalize Payment
              </button>
              <button
                onClick={() => openDispute(offer.id)}
                className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md bg-red-600 text-white hover:bg-red-500"
              >
                File Dispute
              </button>
            </div>
          );
        }
        return null;
      default:
        return null;
    }
  };

  const renderRating = () => {
    if (status !== OfferStatus.Completed) return null;

    const buyerRatedSeller = offer.ratings.seller.ratedByBuyer;
    const buyerRatedCarrier = offer.ratings.carrier.ratedByBuyer;
    const sellerRatedBuyer = offer.ratings.buyer.ratedBySeller;
    const carrierRatedBuyer = offer.ratings.buyer.ratedByCarrier;

    return (
      <div className="mt-4 pt-4 border-t border-slate-700">
        <h4 className="text-sm font-bold mb-2 text-brand-text-primary">Rate Participants</h4>
        {currentRole === UserRole.Buyer && (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-brand-text-secondary">Rate Seller ({seller.name}):</span>
              <RankingInput
                currentRating={buyerRatedSeller}
                onRate={(rating) => rateUser(offer.id, offer.name, 'seller', rating)}
                disabled={buyerRatedSeller > 0}
              />
            </div>
            {carrier && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-brand-text-secondary">Rate Carrier ({carrier.name}):</span>
                <RankingInput
                  currentRating={buyerRatedCarrier}
                  onRate={(rating) => rateUser(offer.id, offer.name, 'carrier', rating)}
                  disabled={buyerRatedCarrier > 0}
                />
              </div>
            )}
          </>
        )}
        {currentRole === UserRole.Seller && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-brand-text-secondary">Rate Buyer ({buyer?.name}):</span>
            <RankingInput
              currentRating={sellerRatedBuyer}
              onRate={(rating) => rateUser(offer.id, offer.name, 'buyer', rating)}
              disabled={sellerRatedBuyer > 0}
            />
          </div>
        )}
        {currentRole === UserRole.Carrier && carrier && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-brand-text-secondary">Rate Buyer ({buyer?.name}):</span>
            <RankingInput
              currentRating={carrierRatedBuyer}
              onRate={(rating) => rateUser(offer.id, offer.name, 'buyer', rating)}
              disabled={carrierRatedBuyer > 0}
            />
          </div>
        )}
      </div>
    );
  };

  const statusStyleMapping: { [key in OfferStatus]?: string } = {
    [OfferStatus.AwaitingCarrierAcceptance]: 'text-yellow-300 bg-yellow-500',
    [OfferStatus.AwaitingPickupConfirmation]: 'text-cyan-300 bg-cyan-500',
    [OfferStatus.InTransit]: 'text-blue-300 bg-blue-500',
    [OfferStatus.Delivered]: 'text-fuchsia-300 bg-fuchsia-500',
    [OfferStatus.Completed]: 'text-green-300 bg-green-500',
    [OfferStatus.DisputeOpened]: 'text-red-300 bg-red-500',
    [OfferStatus.Cancelled]: 'text-gray-300 bg-gray-500',
    [OfferStatus.Refunded]: 'text-orange-300 bg-orange-500',
    [OfferStatus.CarrierDepositConfiscated]: 'text-pink-300 bg-pink-500',
  };

  const statusStyle = statusStyleMapping[status] || 'text-gray-300 bg-gray-400';

  return (
    <div className="bg-brand-surface rounded-xl shadow-lg overflow-hidden flex flex-col p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-1 border border-transparent hover:border-brand-primary/50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-brand-text-primary">{offer.name}</h3>
          <p className="text-xs text-brand-text-secondary">Offer #{`${offer.id.substring(0, 10)}...`}</p>
        </div>
        <span
          className={`text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-opacity-20 ${statusStyle} text-center`}
        >
          {status}
        </span>
      </div>
      <div className="text-sm text-brand-text-secondary space-y-2 mb-4 flex-grow">
        <p>
          <span className="font-semibold text-brand-text-primary">Item Price:</span>{' '}
          {offer.price > 0 ? `${offer.price} DMRK` : 'Free'}
        </p>
        <p>
          <span className="font-semibold text-brand-text-primary">Delivery Fee:</span> {deliveryFee} DMRK
        </p>
        <p>
          <span className="font-semibold text-brand-text-primary">Seller:</span> {seller.name}
        </p>
        <p>
          <span className="font-semibold text-brand-text-primary">Buyer:</span> {buyer?.name}
        </p>
        <p>
          <span className="font-semibold text-brand-text-primary">Carrier:</span>{' '}
          {carrier ? carrier.name : 'Not Assigned'}
        </p>
        {eta && (
          <p>
            <span className="font-semibold text-brand-text-primary">ETA:</span>
            {` ${eta.toLocaleString([], {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}`}
          </p>
        )}
      </div>

      <div className="mt-auto">
        {renderActions()}
        {renderRating()}
      </div>
    </div>
  );
};

export default OrderCard;
