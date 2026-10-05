import "./globals";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import * as pino from "pino";
import { DeployedDMarketProvider } from "./contexts";
import { NETWORK_ID } from "./config";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
// Create a default `pino` logger and configure it with the configured logging level.
export const logger = pino.pino({
  level: "trace",
});

// Ensure that the network IDs are set within the Midnight libraries.
setNetworkId(NETWORK_ID);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <DeployedDMarketProvider logger={logger}>
      <App />
    </DeployedDMarketProvider>
  </React.StrictMode>,
);
