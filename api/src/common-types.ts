// This file is part of midnightntwrk/example-counter.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * DMarket common types and abstractions.
 *
 * @module
 */

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { Carrier, Seller, Offer, DMarketPrivateState, Contract, Witnesses } from '../../contract/src/index';
import { DomainSeperator } from '@midnight-ntwrk/compact-runtime';

export const dMarketPrivateStateKey = 'dMarketPrivateState';
export type PrivateStateId = typeof dMarketPrivateStateKey;

/**
 * The private states consumed throughout the application.
 *
 * @public
 */
export type PrivateStates = {
  /**
   * Key used to provide the private state for {@link DMarketContract} deployments.
   */
  readonly dMarketPrivateState: DMarketPrivateState;
};

/**
 * Represents a DMarket contract and its private state.
 *
 * @public
 */
export type DMarketContract = Contract<DMarketPrivateState, Witnesses<DMarketPrivateState>>;

/**
 * The keys of the circuits exported from {@link DMarketContract}.
 *
 * @public
 */
export type DMarketCircuitKeys = Exclude<keyof DMarketContract['impureCircuits'], number | symbol>;

/**
 * The providers required by {@link DMarketContract}.
 *
 * @public
 */
export type DMarketProviders = MidnightProviders<DMarketCircuitKeys, PrivateStateId, DMarketPrivateState>;

/**
 * A {@link DMarketContract} that has been deployed to the network.
 *
 * @public
 */
export type DeployedDMarketContract = FoundContract<DMarketContract>;

/**
 * A type that represents the derived combination of public (or ledger), and private state.
 */
export type DMarketDerivedState = {
  readonly carriers: Map<string, Carrier>;
  readonly sellers: Map<string, Seller>;
  readonly offers: Map<string, Offer>;
  readonly carrierBids: Map<string, Map<string, bigint>>;
  readonly coinDomainSeparator: DomainSeperator;
  readonly treasuryBalance: bigint;
};
