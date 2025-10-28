import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, UserRole } from '../types';
import RankingInput from './RankingInput';

interface OrderCardProps {
  order: Order;
  currentRole: UserRole;
  acceptDelivery: (orderId: number) => void;
  declineDelivery: (orderId: number) => void;
  confirmCarrierPickup: (orderId: number) => void;
  onUpdateETA: (order: Order) => void;
  markAsDelivered: (orderId: number) => void;
  scanAndConfirmDelivery: (orderId: number) => void;
  confirmDelivery: (orderId: number) => void;
  openDispute: (orderId: number) => void;
  onManageDispute: (order: Order) => void;
  rateUser: (orderId: number, roleToRate: 'buyer' | 'seller' | 'carrier', rating: number) => void;
  confirmationPeriod: number;
}

const Timer: React.FC<{ expiry: number }> = ({ expiry }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeLeft = expiry - now;

  if (timeLeft <= 0) {
    return (
       <div className="text-center bg-brand-background p-3 rounded-lg border border-fuchsia-500/50">
        <p className="text-xs text-brand-text-secondary mb-1">Auto-finalizing...</p>
        <p className="font-mono text-lg font-bold text-brand-text-secondary">00:00:00</p>
      </div>
    );
  }

  const seconds = Math.floor((timeLeft / 1000) % 60);
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const format = (num: number) => num.toString().padStart(2, '0');

  return (
     <div className="text-center bg-brand-background p-3 rounded-lg border border-fuchsia-500/50">
      <p className="text-xs text-brand-text-secondary mb-1">Auto-finalizes in:</p>
      <p className="font-mono text-lg font-bold text-fuchsia-400 tracking-wider">
        {days > 0 && `${format(days)}d `}
        {format(hours)}:{format(minutes)}:{format(seconds)}
      </p>
    </div>
  );
};


const OrderCard: React.FC<OrderCardProps> = ({
  order,
  currentRole,
  acceptDelivery,
  declineDelivery,
  confirmCarrierPickup,
  onUpdateETA,
  markAsDelivered,
  scanAndConfirmDelivery,
  confirmDelivery,
  openDispute,
  onManageDispute,
  rateUser,
  confirmationPeriod,
}) => {
  const { offer, buyer, offer: { seller }, carrier, status, eta, deliveryFee } = order;

  const renderActions = () => {
    switch (currentRole) {
      case UserRole.Carrier:
        if (status === OrderStatus.AwaitingCarrierAcceptance) {
          return (
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={() => declineDelivery(order.id)} className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md bg-red-600 text-white hover:bg-red-500">Decline</button>
              <button onClick={() => acceptDelivery(order.id)} className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 bg-gradient-to-r from-brand-accent to-brand-primary text-white hover:from-lime-400 hover:to-cyan-400">Accept & Stake Deposit</button>
            </div>
          );
        }
        if (status === OrderStatus.InTransit) {
          return (
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={() => onUpdateETA(order)} className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md bg-slate-700 text-brand-text-primary border border-slate-600 hover:bg-slate-600">Update ETA</button>
              <button onClick={() => markAsDelivered(order.id)} className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 bg-gradient-to-r from-brand-accent to-brand-primary text-white hover:from-lime-400 hover:to-cyan-400">Mark as Delivered</button>
            </div>
          );
        }
        if (status === OrderStatus.AwaitingScan) {
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order.trackingId}`;
          return (
            <div className="flex flex-col items-center text-center p-4 bg-brand-background rounded-lg">
              <p className="text-sm text-brand-text-secondary mb-3">Buyer must scan this code to confirm receipt.</p>
              <img src={qrCodeUrl} alt={`QR Code for Order #${order.id}`} className="rounded-lg bg-white p-2 w-40 h-40" />
            </div>
          );
        }
        return null;
      case UserRole.Seller:
        if (status === OrderStatus.AwaitingPickupConfirmation) {
          return <button onClick={() => confirmCarrierPickup(order.id)} className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 bg-gradient-to-r from-brand-accent to-brand-primary text-white hover:from-lime-400 hover:to-cyan-400">Confirm Carrier Pickup</button>;
        }
        if (status === OrderStatus.DisputeOpened) {
          return <button onClick={() => onManageDispute(order)} className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500 to-red-500 text-white hover:from-fuchsia-400 hover:to-red-400">Manage Dispute</button>;
        }
        return null;
      case UserRole.Buyer:
        if (status === OrderStatus.AwaitingScan) {
           return <button onClick={() => scanAndConfirmDelivery(order.id)} className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 bg-gradient-to-r from-brand-accent to-brand-primary text-white hover:from-lime-400 hover:to-cyan-400">Scan QR to Confirm Receipt</button>;
        }
        if (status === OrderStatus.Delivered) {
          return (
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={() => confirmDelivery(order.id)} className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 bg-gradient-to-r from-brand-accent to-brand-primary text-white hover:from-lime-400 hover:to-cyan-400">Confirm & Finalize Payment</button>
              <button onClick={() => openDispute(order.id)} className="w-full flex-grow font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md bg-red-600 text-white hover:bg-red-500">File Dispute</button>
            </div>
          );
        }
        return null;
      default:
        return null;
    }
  };

  const renderRating = () => {
    if (status !== OrderStatus.Completed) return null;

    const hasRatedSeller = order.rankings?.buyer?.ratedSeller;
    const hasRatedCarrier = order.rankings?.buyer?.ratedCarrier;
    const hasRatedBuyerBySeller = order.rankings?.seller?.ratedBuyer;
    const hasRatedBuyerByCarrier = order.rankings?.carrier?.ratedBuyer;

    return (
      <div className="mt-4 pt-4 border-t border-slate-700">
        <h4 className="text-sm font-bold mb-2 text-brand-text-primary">Rate Participants</h4>
        {currentRole === UserRole.Buyer && (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-brand-text-secondary">Rate Seller ({seller.name}):</span>
              <RankingInput onRate={(rating) => rateUser(order.id, 'seller', rating)} disabled={hasRatedSeller} />
            </div>
            {carrier && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-brand-text-secondary">Rate Carrier ({carrier.name}):</span>
                <RankingInput onRate={(rating) => rateUser(order.id, 'carrier', rating)} disabled={hasRatedCarrier} />
              </div>
            )}
          </>
        )}
        {currentRole === UserRole.Seller && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-brand-text-secondary">Rate Buyer ({buyer.name}):</span>
            <RankingInput onRate={(rating) => rateUser(order.id, 'buyer', rating)} disabled={hasRatedBuyerBySeller} />
          </div>
        )}
        {currentRole === UserRole.Carrier && carrier && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-brand-text-secondary">Rate Buyer ({buyer.name}):</span>
            <RankingInput onRate={(rating) => rateUser(order.id, 'buyer', rating)} disabled={hasRatedBuyerByCarrier} />
          </div>
        )}
      </div>
    );
  };

  const statusStyleMapping: { [key in OrderStatus]?: string } = {
    [OrderStatus.AwaitingCarrierAcceptance]: 'text-yellow-300 bg-yellow-500',
    [OrderStatus.AwaitingPickupConfirmation]: 'text-cyan-300 bg-cyan-500',
    [OrderStatus.InTransit]: 'text-blue-300 bg-blue-500',
    [OrderStatus.AwaitingScan]: 'text-purple-300 bg-purple-500',
    [OrderStatus.Delivered]: 'text-fuchsia-300 bg-fuchsia-500',
    [OrderStatus.Completed]: 'text-green-300 bg-green-500',
    [OrderStatus.DisputeOpened]: 'text-red-300 bg-red-500',
    [OrderStatus.Cancelled]: 'text-gray-300 bg-gray-500',
    [OrderStatus.Refunded]: 'text-orange-300 bg-orange-500',
    [OrderStatus.AwaitingArbitration]: 'text-indigo-300 bg-indigo-500',
    [OrderStatus.CarrierDepositConfiscated]: 'text-pink-300 bg-pink-500',
  };

  const statusStyle = statusStyleMapping[status] || 'text-gray-300 bg-gray-400';

  return (
    <div className="bg-brand-surface rounded-xl shadow-lg overflow-hidden flex flex-col p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-1 border border-transparent hover:border-brand-primary/50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-brand-text-primary">{offer.name}</h3>
          <p className="text-xs text-brand-text-secondary">Order #{order.id}</p>
        </div>
        <span className={`text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-opacity-20 ${statusStyle} text-center`}>{status}</span>
      </div>
      <div className="text-sm text-brand-text-secondary space-y-2 mb-4 flex-grow">
        <p><span className="font-semibold text-brand-text-primary">Item Price:</span> {offer.price} ETH</p>
        <p><span className="font-semibold text-brand-text-primary">Delivery Fee:</span> {deliveryFee.toFixed(2)} ETH</p>
        <p><span className="font-semibold text-brand-text-primary">Seller:</span> {seller.name}</p>
        <p><span className="font-semibold text-brand-text-primary">Buyer:</span> {buyer.name}</p>
        <p><span className="font-semibold text-brand-text-primary">Carrier:</span> {carrier ? carrier.name : 'Not Assigned'}</p>
        {eta && <p><span className="font-semibold text-brand-text-primary">ETA:</span> {eta}</p>}
        <p><span className="font-semibold text-brand-text-primary">Tracking ID:</span> <span className="font-mono text-xs">{order.trackingId}</span></p>
      </div>
      
      {order.status === OrderStatus.Delivered && order.deliveredTimestamp && (
        <div className="my-4">
          <Timer expiry={order.deliveredTimestamp + confirmationPeriod} />
        </div>
      )}

      <div className="mt-auto">
        {renderActions()}
        {renderRating()}
      </div>
    </div>
  );
};

export default OrderCard;