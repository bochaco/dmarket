# Decentralized Escrow Marketplace (dMarket)

[![React 19.x](https://img.shields.io/badge/React-18.x-blue.svg)](https://react.dev)
[![TypeScript 5.x](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org)

## Summary

dMarket is a privacy-aware decentralized marketplace (dApp) that implements a three-party escrow flow (Seller, Carrier, Buyer) with secure handoff, dispute resolution, and selective disclosure. It demonstrates how Midnight-native privacy and ZK tooling can be combined with an intuitive web UI to create trustworthy, user-friendly commerce workflows that lowers logistics and selling costs.

## Core idea and problem solved

Many physical-good marketplaces suffer from trust, logistics, and dispute risks: buyers worry about receiving items, sellers worry about payment, and carriers need guarantees for delivery payment. dMarket solves this with a coordinated escrow + carrier-commitment flow where funds and reputations are protected, on-chain, and a secure handoff verifies physical delivery.

Beyond trust and dispute reduction, dMarket lowers the cost of selling by removing dependency on centralized marketplace intermediaries that typically charge platform usage fees and commissions (commonly around 15%). By enabling direct buyer–seller–carrier coordination and on-chain or Midnight-managed settlement, sellers keep more margin or can pass savings to buyers.

The platform also democratises access to carriers and couriers: independent drivers, local couriers, and small logistics providers can bid alongside larger carriers, making delivery services available to sellers of all product types and sizes while fostering competition that lowers logistics costs.

## Privacy & selective disclosure of delivery data

When an order is placed and a carrier is selected, the buyer's delivery address is encrypted specifically for the selected carrier's public key (or a transient delivery key derived for that carrier). Only the designated carrier can decrypt and view the delivery address — other parties, including non-selected carriers and the public, never see the address. This selective disclosure model reduces data exposure, limits the attack surface for sensitive information, and aligns directly with Midnight's privacy-first ethos and the hackathon's goals around selective disclosure and data minimization.

## Ratings & reputation — building trust

Ratings and reputation are a core security and trust mechanism in dMarket. After an order completes (or is auto-finalized), Buyer, Seller, and Carrier are prompted to rate each other. Key properties:

- 5-star mutual ratings: participants rate one another on a 1–5 star scale (in future versions with optional short feedback).
- Reputation impact: ratings update participant reputation scores which are visible in profiles and can be used to sort carrier bids and seller listings.
- Weighting & stake signals: reputation can be combined with recent performance and stake/deposit behavior (e.g., carriers who repeatedly lose disputes receive harsher penalties) to discourage bad actors.
- Sybil resistance & decay: the system favors sustained good behavior by decaying old ratings and requiring continual activity or minimal staking to maintain high visibility, raising the cost of sybil attacks.
- Transparency & privacy: public reputation aggregates are shown (e.g., average rating, number of reviews) while detailed feedback can be selectively disclosed to involved parties to preserve privacy using the same asymetric encryption technique used on delivery addresses.

These mechanics reduce counterparty risk, help buyers choose reliable carriers, and create economic incentives for honest behavior.

## Main end-to-end (E2E) flow — primary demo use case

This is most common flow which describes the product value and technical depth.

1. Seller publishes an offer to the marketplace.
2. Carriers place bids on the offer (delivery fee + reputation shown).
3. Buyer purchases the item and selects a carrier from the bidder list.
4. Selected Carrier accepts the job and stakes a security deposit (equal to the deposit made by the buyer).
5. Seller confirms carrier pickup (item leaves seller custody).
6. Carrier arrives to deliver, confirms buyer's identity offchain, and marks the order as delivered onchain.
7. A timed confirmation window opens during which the buyer can finalize or raise a dispute.
   - If buyer finalizes: funds are released to seller and carrier, and rating prompts are shown.
   - If buyer raises a dispute: the dispute flow (refund / confiscate deposit / escalate) is triggered and the order is paused until resolution.
   - If buyer does nothing: the confirmation window expires and the system finalizes the order automatically.

This flow demonstrates trust guarantees, carrier commitment, verifiable physical handoff, timed failsafes, and dispute handling.

## How dMarket maps to the Midnight Summit 2025 Hackathon judging rubric

Below is a concise mapping to help judges score the project across the core domains of [Midnight Summit 2025 Hackathon](https://midnight.network/blog/everything-you-need-to-know-for-the-2025-midnight-summit-hackathon).

- Product & Vision
  - Problem: reduces friction and risk for peer-to-peer physical goods via escrow + carrier guarantees.
  - Vision: privacy-preserving commerce where off-chain logistics and on-chain guarantees coexist. The README and UI focus on clarity of roles and the real-world value proposition.
  - Midnight fit: the project uses Midnight contracts and tooling to model escrow, deposit, and selective disclosures.
  - Selective disclosure: delivery addresses and other sensitive buyer data are encrypted and only revealed to the selected carrier, demonstrating a concrete, privacy-first implementation of Midnight principles.

- Engineering & Implementation
  - Architecture: front-end (`gui/`), backend/API (`api/`), contract logic (`contract/`), and test harnesses (`contract/test`) are separated for maintainability. The `api/` package implements the HTTP endpoints used by the UI, and helpers that interact with contracts and the local proof server.
  - Reproducibility: repo contains test artifacts and contract sources under `contract/` and contract tests under `contract/test`.
  - Midnight tech: ZK artifacts, witness code and compact contracts live in `contract/managed/dmarket` showing concrete use of Midnight ZK/contract primitives.

- User Experience & Design
  - Role-based dashboards (Buyer, Seller, Carrier) and clear modals for bidding/purchase/delivery minimize cognitive load.
  - Simple handoff and dispute flows provide a trustworthy UX for the critical physical verification step.

- Quality Assurance & Reliability
  - Contract-level tests and a simulator are present under `contract/test` and `contract/test/dmarket-simulator.ts`.
  - The UI is developed with a local dev server and can be used to execute a complete demo flow.

- Communication & Advocacy
  - This repository includes a focused README (this file) that maps features to judging domains and points to the demo flow.
  - The UI is designed to be screen-share friendly to showcase the E2E flow in demo conditions.

- Business Development & Viability
  - Target audience: peer-to-peer sellers and local delivery networks.
  - Monetization paths: marketplace fees, premium carrier subscriptions, or escrow service fees.
  - Seller cost savings: dMarket reduces reliance on centralized platform commissions (often ~15%), allowing sellers to retain higher margins or offer lower prices to buyers.
  - Democratized carrier access: the carrier bidding model opens delivery to independent couriers and small logistics providers as well as large firms, expanding coverage and lowering logistics costs through competition.
  - Scaling: off-chain order/book management with on-chain settlement patterns keeps per-order cost low while preserving key guarantees.

## Quick architecture / where to look in the repo

- `gui/` — React + TypeScript web UI, demo-ready front-end (components, modals, and the main app).
- `contract/` — contract sources, compact artifacts, ZK witness code and a `managed/dmarket` folder containing compiled artifacts and keys.
- `api/` — backend integration and off-chain logic: server entrypoint, API routes, and utility wrappers for calling contracts and proof-server endpoints.

## Getting started (local demo)

Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/) for running the [local proof server](https://docs.midnight.network/quickstart/builder-quickstart#install-docker-desktop) as instructed in the Midnight Network documentation.
- [Midnight Lace wallet](https://chromewebstore.google.com/detail/lace-beta/hgeekaiplokcnmakghbdfbgnlfheichg) browser extension (for GUI usage).
- [Compact developer tools](https://docs.midnight.network/blog/compact-developer-tools).

Install and run

### 1. Clone the Repository

```sh
git clone https://github.com/bochaco/dmarket.git
cd dmarket
```

### 2. Install Dependencies

Install dependencies for all packages:

```sh
npm install
# or, if using yarn:
# yarn install
```

### 3. Build the dMarket contract

Install the Compact toolchain, the dependencies, and compile the contract:

```sh
cd contract
npm install
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
npm run compact
```

### 4. Run the Midnight proof server

Follow the Midnight [documentation to start the local proof server](https://docs.midnight.network/quickstart/builder-quickstart#set-up-the-proof-server).

### 5. Running the GUI with Testnet

- Start the Backend Server
```sh
cd gui
npm install
npm run build:start
```
- Open [http://localhost:8080](http://localhost:8080) in your browser.
- Ensure you have the [Midnight Lace wallet extension](https://chromewebstore.google.com/detail/lace-beta/hgeekaiplokcnmakghbdfbgnlfheichg) installed, connected, and with available `tDUST` funds.

## Tests & verification

- Contract/unit tests: see `contract/test` for unit and simulation tests (use the contract test runner configured in that folder).

- Running the contract unit tests
```sh
cd contract
npm install
npm run test --test-timeout=7000
```

## Demo checklist

1. Start the GUI dev server and open the app.
2. As Seller: publish a new offer.
3. As Carrier: place a bid on the offer and accept assignment when selected.
4. As Buyer: purchase the offer and select the bidder.
5. As Seller: confirm pickup.
6. As Carrier: mark item as delivered.
7. As Buyer: confirm delivery to finalize the order and optionally rate participants.
