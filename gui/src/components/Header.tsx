import React from 'react';
import { UserRole } from '../types';
import { USER_ROLES } from '../constants';

interface HeaderProps {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  isWalletConnected: boolean;
  walletAddress: string | null;
  connectWallet: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentRole, setCurrentRole, isWalletConnected, walletAddress, connectWallet }) => {
  const Icon = ({ role }: { role: UserRole }) => {
    switch (role) {
      case UserRole.Buyer:
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>;
      case UserRole.Seller:
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>;
      case UserRole.Carrier:
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v5a1 1 0 001 1h2.05a2.5 2.5 0 014.9 0H19a1 1 0 001-1V8a1 1 0 00-1-1h-5z" /></svg>;
      default:
        return null;
    }
  }

  const WalletButton = () => {
    if (isWalletConnected) {
      return (
        <div className="flex items-center bg-brand-accent/20 text-lime-400 font-medium px-4 py-2 rounded-full text-sm">
          <span className="w-2 h-2 bg-brand-accent rounded-full mr-2"></span>
          {walletAddress}
        </div>
      );
    }
    return (
      <button
        onClick={connectWallet}
        className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-background focus:ring-brand-primary bg-gradient-to-r from-brand-accent to-brand-primary text-white hover:from-lime-400 hover:to-cyan-400 shadow-lg shadow-cyan-500/20"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
        </svg>
        Connect Wallet
      </button>
    );
  };

  return (
    <header className="bg-brand-surface sticky top-0 z-10 shadow-lg shadow-slate-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-primary" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
            <h1 className="text-2xl font-bold ml-3 bg-clip-text text-transparent bg-gradient-to-r from-brand-accent to-brand-primary">EscrowChain</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-brand-background rounded-full p-1">
              {USER_ROLES.map(role => (
                <button
                  key={role}
                  onClick={() => setCurrentRole(role)}
                  className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-background focus:ring-brand-primary ${
                    currentRole === role
                      ? 'bg-gradient-to-r from-brand-accent to-brand-primary text-white shadow-md shadow-cyan-500/20'
                      : 'text-brand-text-secondary hover:bg-slate-700 hover:text-brand-text-primary'
                  }`}
                >
                  <Icon role={role} />
                  {role}
                </button>
              ))}
            </div>
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;