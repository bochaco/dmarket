import React, { useState } from "react";

export interface SetupData {
  username: string;
  password: string;
  contractAddress?: string;
}

interface SetupScreenProps {
  onComplete: (data: SetupData) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onComplete }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [contractOption, setContractOption] = useState<"new" | "existing">(
    "new",
  );
  const [contractAddress, setContractAddress] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contractOption === "new" && !username.trim()) {
      setError("Username is required when deploying a new contract.");
      return;
    }
    if (contractOption === "existing" && !contractAddress.trim()) {
      setError("Contract address is required for existing contracts.");
      return;
    }
    // Simple validation for mock address
    if (contractOption === "existing" && contractAddress.length < 68) {
      setError("Please enter a valid contract address.");
      return;
    }

    setError("");
    onComplete({
      username,
      password: password,
      contractAddress:
        contractOption === "existing" ? contractAddress : undefined,
    });
  };

  const isButtonDisabled =
    !username.trim() ||
    !password.trim() ||
    (contractOption === "existing" && !contractAddress.trim());

  return (
    <div className="fixed inset-0 bg-brand-background flex items-center justify-center z-[100] animate-fade-in p-4">
      <div className="w-full max-w-md bg-brand-surface p-8 rounded-2xl shadow-2xl shadow-slate-900/50 border border-slate-700">
        <div className="text-center mb-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-brand-primary mx-auto mb-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
              clipRule="evenodd"
            />
          </svg>
          <h1 className="text-3xl font-bold text-brand-text-primary">
            Welcome to dMarket
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            placeholder="Username/nickname"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-brand-background border border-slate-700 rounded-lg px-4 py-3 text-brand-text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
            required
          />
          <input
            type="password"
            placeholder="Enter a Password"
            value={password}
            autoComplete="off"
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-brand-background border border-slate-700 rounded-lg px-4 py-3 text-brand-text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
            required
          />

          <div>
            <label className="text-sm font-medium text-brand-text-secondary mb-2 block">
              Contract Options
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label
                className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${contractOption === "new" ? "border-brand-primary bg-cyan-500/10" : "border-slate-700 hover:border-brand-secondary"}`}
              >
                <input
                  type="radio"
                  name="contractOption"
                  value="new"
                  checked={contractOption === "new"}
                  onChange={() => setContractOption("new")}
                  className="h-4 w-4 text-brand-primary bg-slate-600 border-slate-500 focus:ring-brand-primary focus:ring-offset-brand-surface"
                />
                <span className="ml-3 text-sm font-semibold text-brand-text-primary">
                  Deploy New
                </span>
              </label>
              <label
                className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${contractOption === "existing" ? "border-brand-primary bg-cyan-500/10" : "border-slate-700 hover:border-brand-secondary"}`}
              >
                <input
                  type="radio"
                  name="contractOption"
                  value="existing"
                  checked={contractOption === "existing"}
                  onChange={() => setContractOption("existing")}
                  className="h-4 w-4 text-brand-primary bg-slate-600 border-slate-500 focus:ring-brand-primary focus:ring-offset-brand-surface"
                />
                <span className="ml-3 text-sm font-semibold text-brand-text-primary">
                  Use Existing
                </span>
              </label>
            </div>
          </div>

          {contractOption === "existing" && (
            <input
              type="text"
              placeholder="Enter Existing Contract Address"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="w-full bg-brand-background border border-slate-700 rounded-lg px-4 py-3 text-brand-text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary transition animate-fade-in"
              required
            />
          )}

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <button
            type="submit"
            disabled={isButtonDisabled}
            className="w-full bg-gradient-to-r from-brand-accent to-brand-primary text-white font-bold py-3 px-6 rounded-lg hover:from-lime-400 hover:to-cyan-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect & Enter
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupScreen;
