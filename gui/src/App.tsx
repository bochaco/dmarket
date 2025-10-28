import React, { useState } from "react";
import WalletCard from "./WalletCard";
import "./App.css";

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const handleConnect = async () => {
    let isConnected = false;
    let address = null;
    try {
      const connectorAPI = await window.midnight?.mnLace.enable();

      const isEnabled = await window.midnight?.mnLace.isEnabled();
      if (isEnabled) {
        isConnected = true;
        console.log("Connected to the wallet:", connectorAPI);
        const state = await connectorAPI.state();
        address = state.address;
      }
    } catch (error) {
      console.log("An error occurred:", error.reason || error);
    }

    setIsConnected(isConnected);
    setWalletAddress(address);
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
    setIsConnected(false);
  };

  return (
    <div className="bg-gray-900 flex flex-col items-center justify-center p-4 font-sans">
      <header className="text-center mb-10">
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Midnight Wallet Connector
        </h1>
        <p className="text-gray-400 mt-2">
          A simple and elegant interface for Midnight wallet interactions.
        </p>
      </header>
      <main>
        <WalletCard
          isConnected={isConnected}
          walletAddress={walletAddress}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      </main>
      <footer className="absolute bottom-4 text-gray-500 text-sm">
        <p>Built with React, TypeScript, and Tailwind CSS</p>
      </footer>
    </div>
  );
};

export default App;
