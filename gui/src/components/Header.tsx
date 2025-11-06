import React, { useCallback } from 'react';
import { UserRole } from '../types';
import { USER_ROLES } from '../constants';
import { FormProps } from './DMarket';
import { handleErrorForRendering } from './WorkInProgressModal';

interface HeaderProps {
  currentRole: UserRole;
  contractAddress: string;
  setCurrentRole: (role: UserRole) => void;
  disconnectContract: () => void;
  formProps: FormProps;
}

const Header: React.FC<HeaderProps> = ({
  currentRole,
  contractAddress,
  setCurrentRole,
  disconnectContract,
  formProps,
}) => {
  const onMintCoins = useCallback(async () => {
    if (formProps.dMarketApi) {
      try {
        formProps.setIsWorking({
          onClose: null,
          status: 'in-progress',
          task: 'Minting dMarket (DMRK) coins',
          desc: 'Please wait...',
        });
        await formProps.dMarketApi.mintCoins();
        formProps.setIsWorking(null);
      } catch (error: unknown) {
        formProps.setIsWorking(handleErrorForRendering(error, 'Minting dMarket (DMRK) coins'));
      }
    }
  }, [formProps.dMarketApi, formProps.setIsWorking]);

  const Icon = ({ role }: { role: UserRole }) => {
    switch (role) {
      case UserRole.Buyer:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
          </svg>
        );
      case UserRole.Seller:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z"
              clipRule="evenodd"
            />
          </svg>
        );
      case UserRole.Carrier:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v5a1 1 0 001 1h2.05a2.5 2.5 0 014.9 0H19a1 1 0 001-1V8a1 1 0 00-1-1h-5z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <header className="bg-brand-surface sticky top-0 z-10 shadow-lg shadow-slate-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-brand-primary"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12 2L3 5v6c0 5.25 3.8 9.25 9 10.5 5.2-1.25 9-5.25 9-10.5V5L12 2zM12 13a2 2 0 100-4 2 2 0 000 4zm-1.5 4l1.5-3 1.5 3h-3z"
                clipRule="evenodd"
              />
            </svg>
            <h1 className="text-2xl font-bold ml-3 bg-clip-text text-transparent bg-gradient-to-r from-brand-accent to-brand-primary">
              dMarket
            </h1>
            <div className="flex items-center bg-brand-accent/20 text-lime-400 font-medium px-4 py-2 rounded-full text-sm">
              <span className="w-2 h-2 bg-brand-accent rounded-full mr-2"></span>
              {contractAddress}
            </div>
            <button onClick={disconnectContract} className="text-lime-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-brand-background rounded-full p-1">
              {USER_ROLES.map((role) => (
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
            <button
              onClick={onMintCoins}
              disabled={!formProps.dMarketApi}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-background focus:ring-brand-secondary bg-gradient-to-r from-brand-secondary to-purple-600 text-white hover:from-fuchsia-500 hover:to-purple-500 shadow-lg shadow-fuchsia-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:from-brand-secondary disabled:hover:to-purple-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8.433 7.418c.158-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-1.168-.217c-.165 0-.33.012-.488.037a18.118 18.118 0 00-3.478.655l.842 1.396a16.611 16.611 0 012.726-.549c.16-.023.323-.035.488-.035s.328.012.488.035c.78.113 1.517.312 2.18.582l.842-1.396a18.118 18.118 0 00-3.478-.655c-.158-.025-.323-.037-.488-.037a2.5 2.5 0 00-1.168.217V5.268a2.502 2.502 0 00-1.102 1.052l-1.223.815a1 1 0 00.22 1.634l1.223.815c.42.28.956.28 1.376 0l1.223-.815a.997.997 0 00.22-1.634l-1.223-.815z" />
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                  clipRule="evenodd"
                />
              </svg>
              Mint DMRK Coins
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
