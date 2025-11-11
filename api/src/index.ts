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
 * Provides types and utilities for working with DMarket contracts.
 *
 * @packageDocumentation
 */

import contractModule, { Offer, Carrier, Seller } from '../../contract/src/managed/dmarket/contract/index.cjs';
const { Contract, ledger, pureCircuits } = contractModule;

import {
  tokenType,
  type ContractAddress,
  encodeContractAddress,
  encodeCoinPublicKey,
} from '@midnight-ntwrk/compact-runtime';
import { MidnightBech32m } from '@midnight-ntwrk/wallet-sdk-address-format';
import { type Logger } from 'pino';
import {
  type DMarketDerivedState,
  type DMarketContract,
  type DMarketProviders,
  type DeployedDMarketContract,
  dMarketPrivateStateKey,
} from './common-types.js';
import { type DMarketPrivateState, createDMarketPrivateState, witnesses } from '../../contract/src/index';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, map, tap, from, type Observable } from 'rxjs';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
import { createCoinInfo, encodeCoinInfo } from '@midnight-ntwrk/ledger';
import * as Rx from 'rxjs';

/** @internal */
const dMarketContractInstance: DMarketContract = new Contract(witnesses);

/**
 * An API for a deployed DMarket.
 */
export interface DeployedDMarketAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<DMarketDerivedState>;

  mintCoins: () => Promise<void>;
  offerItem: (id: Uint8Array, price: bigint, itemMeta: string, sellerMeta: string) => Promise<Offer>;
  decrypt: (cipher: string) => string;
  setCarrierBid: (offerId: string, fee: bigint, carrierMeta: string) => Promise<void>;
  purchaseItem: (offerId: string, carrierId: string, totalAmount: bigint, deliveryAddress: string) => Promise<void>;
  itemPickedUp: (offerId: string, depositAmount: bigint, eta: bigint | null) => Promise<void>;
  confirmItemInTransit: (offerId: string) => Promise<void>;
  setOfferEta: (offerId: string, timestamp: bigint) => Promise<void>;
  delivered: (offerId: string) => Promise<void>;
  confirmDelivered: (offerId: string) => Promise<void>;
  disputeItem: (offerId: string) => Promise<void>;
  resolveDispute: (offerId: string) => Promise<void>;
  rateSeller: (offerId: string, rating: bigint) => Promise<void>;
  rateCarrier: (offerId: string, rating: bigint) => Promise<void>;
  rateBuyer: (offerId: string, rating: bigint) => Promise<void>;
}

function pad(utf8Bytes: Uint8Array, n: number): Uint8Array {
  if (n < utf8Bytes.length) {
    throw new Error(`The padded length n must be at least ${utf8Bytes.length}`);
  }
  const paddedArray = new Uint8Array(n);
  paddedArray.set(utf8Bytes);
  return paddedArray;
}
/**
 * Provides an implementation of {@link DeployedDMarketAPI} by adapting a deployed DMarket
 * contract.
 */
export class DMarketAPI implements DeployedDMarketAPI {
  /** @internal */
  private constructor(
    public readonly deployedContract: DeployedDMarketContract,
    providers: DMarketProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    this.state$ = combineLatest(
      [
        // Combine public (ledger) state with...
        providers.publicDataProvider.contractStateObservable(this.deployedContractAddress, { type: 'latest' }).pipe(
          map((contractState) => ledger(contractState.data)),
          tap((ledgerState) =>
            logger?.trace({
              ledgerStateChanged: {
                ledgerState: {
                  ...ledgerState,
                  carriers: ledgerState.carriers,
                  sellers: ledgerState.sellers,
                  offers: ledgerState.offers,
                },
              },
            }),
          ),
        ),
        // ...private state...
        //    since the private state of the DMarket application never changes, we can query the
        //    private state once and always use the same value with `combineLatest`. In applications
        //    where the private state is expected to change, we would need to make this an `Observable`.
        from(providers.privateStateProvider.get(dMarketPrivateStateKey) as Promise<DMarketPrivateState>),
      ],
      // ...and combine them to produce the required derived state.
      (ledgerState, privateState) => {
        const carriers = new Map<string, Carrier>();
        const sellers = new Map<string, Seller>();
        const offers = new Map<string, Offer>();
        const carrierBids = new Map<string, Map<string, bigint>>();

        for (const [id, offer] of ledgerState.offers) {
          const offerId = toHex(id);
          offers.set(offerId, offer);

          if (ledgerState.carrierBids.member(id)) {
            const bids = ledgerState.carrierBids.lookup(id);
            const offerBids = new Map<string, bigint>();
            for (const [id, fee] of bids) {
              offerBids.set(toHex(id), fee);
            }
            carrierBids.set(offerId, offerBids);
          }
        }

        for (const [id, carrier] of ledgerState.carriers) {
          const carrierId = toHex(id);
          carriers.set(carrierId, carrier);
        }

        for (const [id, seller] of ledgerState.sellers) {
          const sellerId = toHex(id);
          sellers.set(sellerId, seller);
        }

        const pk = providers.walletProvider.coinPublicKey;
        const zswapPk = { bytes: MidnightBech32m.parse(pk).data };
        const nonce = privateState.secretKey;
        const contractAddr = encodeContractAddress(this.deployedContractAddress);

        const userIdAsSeller = pureCircuits.Utils_genSellerId(zswapPk, nonce, contractAddr);
        const userIdAsCarrier = pureCircuits.Utils_genCarrierId(zswapPk, nonce, contractAddr);
        const userIdAsBuyer = pureCircuits.Utils_genBuyerId(zswapPk, nonce, contractAddr);

        return {
          carriers: carriers,
          sellers: sellers,
          offers: offers,
          carrierBids: carrierBids,
          coinDomainSeparator: ledgerState.coinDomainSeparator,
          userIdAsSeller: toHex(userIdAsSeller),
          userIdAsCarrier: toHex(userIdAsCarrier),
          userIdAsBuyer: toHex(userIdAsBuyer),
          treasuryBalance: ledgerState.treasury.value,
        };
      },
    );
  }

  /**
   * Gets the address of the current deployed contract.
   */
  readonly deployedContractAddress: ContractAddress;

  /**
   * Gets an observable stream of state changes based on the current public (ledger),
   * and private state data.
   */
  readonly state$: Observable<DMarketDerivedState>;

  async mintCoins(): Promise<void> {
    this.logger?.info(`minting shielded coins ...`);

    const txData = await this.deployedContract.callTx.mintCoins();
    this.logger?.trace({
      transactionAdded: {
        circuit: 'mintCoins',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async offerItem(id: Uint8Array, price: bigint, itemMeta: string, sellerMeta: string): Promise<Offer> {
    this.logger?.info(`creating offer for item ID ${toHex(id)} at a price of ${price}, with metadata: ${itemMeta}`);
    const idBytes = pad(id, 32);
    const txData = await this.deployedContract.callTx.offerItem(idBytes, price, itemMeta, sellerMeta);
    this.logger?.trace({
      transactionAdded: {
        circuit: 'offerItem',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
    return txData.private.result;
  }

  decrypt(cipher: string): string {
    this.logger?.info(`decrypting data: ${cipher}`);
    return this.deployedContract.deployTxData.private.initialPrivateState.decrypt(cipher);
  }

  async setCarrierBid(offerId: string, fee: bigint, carrierMeta: string): Promise<void> {
    this.logger?.info(`setting carrier fee bid: ${fee}`);
    const encryptionPk = this.deployedContract.deployTxData.private.initialPrivateState.encryptionKeyPair.publicKey;
    const txData = await this.deployedContract.callTx.setCarrierBid(fromHex(offerId), fee, encryptionPk, carrierMeta);
    this.logger?.trace({
      transactionAdded: {
        circuit: 'setCarrierBid',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async purchaseItem(offerId: string, carrierId: string, totalAmount: bigint, deliveryAddress: string): Promise<void> {
    const contractAddress = this.deployedContract.deployTxData.public.contractAddress;
    const domainSep = (await Rx.firstValueFrom(this.state$)).coinDomainSeparator;
    const coinColor: string = tokenType(domainSep, contractAddress);

    this.logger?.info(`purchasing offered item: ${offerId} amount: ${totalAmount}, coinColor: ${coinColor}`);
    const coinInfo = createCoinInfo(coinColor, totalAmount);
    const txData = await this.deployedContract.callTx.purchaseItem(
      fromHex(offerId),
      fromHex(carrierId),
      encodeCoinInfo(coinInfo),
      deliveryAddress,
    );
    this.logger?.trace({
      transactionAdded: {
        circuit: 'purchaseItem',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async itemPickedUp(offerId: string, depositAmount: bigint, eta: bigint | null): Promise<void> {
    const contractAddress = this.deployedContract.deployTxData.public.contractAddress;
    const domainSep = (await Rx.firstValueFrom(this.state$)).coinDomainSeparator;
    const coinColor: string = tokenType(domainSep, contractAddress);

    this.logger?.info(
      `accepting and picking up purchased item: ${offerId} deposit: ${depositAmount}, coinColor: ${coinColor}`,
    );
    const coinInfo = createCoinInfo(coinColor, depositAmount);
    const txData = await this.deployedContract.callTx.itemPickedUp(
      fromHex(offerId),
      encodeCoinInfo(coinInfo),
      eta ? { is_some: true, value: eta } : { is_some: false, value: 0n },
    );
    this.logger?.trace({
      transactionAdded: {
        circuit: 'itemPickedUp',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async confirmItemInTransit(offerId: string): Promise<void> {
    this.logger?.info(`confirming item is in transit: ${offerId}`);
    const txData = await this.deployedContract.callTx.confirmItemInTransit(fromHex(offerId));
    this.logger?.trace({
      transactionAdded: {
        circuit: 'confirmItemInTransit',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async setOfferEta(offerId: string, timestamp: bigint): Promise<void> {
    this.logger?.info(`setting new ETA for item: ${offerId}`);
    const txData = await this.deployedContract.callTx.setOfferEta(fromHex(offerId), timestamp);
    this.logger?.trace({
      transactionAdded: {
        circuit: 'setOfferEta',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async delivered(offerId: string): Promise<void> {
    this.logger?.info(`item delivered: ${offerId}`);
    const txData = await this.deployedContract.callTx.delivered(fromHex(offerId));
    this.logger?.trace({
      transactionAdded: {
        circuit: 'delivered',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async confirmDelivered(offerId: string): Promise<void> {
    this.logger?.info(`item delivery confirmed by buyer: ${offerId}`);
    const txData = await this.deployedContract.callTx.confirmDelivered(fromHex(offerId));
    this.logger?.trace({
      transactionAdded: {
        circuit: 'confirmDelivered',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async disputeItem(offerId: string): Promise<void> {
    this.logger?.info(`opening a dispute for item: ${offerId}`);
    const txData = await this.deployedContract.callTx.disputeItem(fromHex(offerId));
    this.logger?.trace({
      transactionAdded: {
        circuit: 'disputeItem',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async resolveDispute(offerId: string): Promise<void> {
    this.logger?.info(`resolving a dispute for item: ${offerId}`);
    const txData = await this.deployedContract.callTx.resolveDispute(fromHex(offerId));
    this.logger?.trace({
      transactionAdded: {
        circuit: 'resolveDispute',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async rateSeller(offerId: string, rating: bigint): Promise<void> {
    this.logger?.info(`ratig seller for item: ${offerId}`);
    const txData = await this.deployedContract.callTx.rateSeller(fromHex(offerId), rating);
    this.logger?.trace({
      transactionAdded: {
        circuit: 'rateSeller',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async rateCarrier(offerId: string, rating: bigint): Promise<void> {
    this.logger?.info(`ratig carrier for item: ${offerId}`);
    const txData = await this.deployedContract.callTx.rateCarrier(fromHex(offerId), rating);
    this.logger?.trace({
      transactionAdded: {
        circuit: 'rateCarrier',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async rateBuyer(offerId: string, rating: bigint): Promise<void> {
    this.logger?.info(`ratig buyer for item: ${offerId}`);
    const txData = await this.deployedContract.callTx.rateBuyer(fromHex(offerId), rating);
    this.logger?.trace({
      transactionAdded: {
        circuit: 'rateBuyer',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  /**
   * Deploys a new DMarket contract to the network.
   *
   * @returns A `Promise` that resolves with a {@link DMarketAPI} instance that manages the newly deployed
   * {@link DeployedDMarketContract}; or rejects with a deployment error.
   */
  static async deploy(
    providers: DMarketProviders,
    initNonce: Uint8Array,
    password: Uint8Array,
    logger?: Logger,
  ): Promise<DMarketAPI> {
    logger?.info('deployContract');

    const deployedDMarketContract = await deployContract<typeof dMarketContractInstance>(providers, {
      privateStateId: dMarketPrivateStateKey,
      contract: dMarketContractInstance,
      initialPrivateState: DMarketAPI.getPrivateState(providers, password),
      args: [initNonce],
    });

    logger?.trace({
      contractDeployed: {
        finalizedDeployTxData: deployedDMarketContract.deployTxData.public,
      },
    });

    return new DMarketAPI(deployedDMarketContract, providers, logger);
  }

  /**
   * Finds an already deployed DMarket contract on the network, and joins it.
   *
   * @param providers The DMarket providers.
   * @param contractAddress The contract address of the deployed DMarket contract to search for and join.
   * @param logger An optional 'pino' logger to use for logging.
   * @returns A `Promise` that resolves with a {@link DMarketAPI} instance that manages the joined
   * {@link DeployedDMarketContract}; or rejects with an error.
   */
  static async join(
    providers: DMarketProviders,
    contractAddress: ContractAddress,
    password: Uint8Array,
    logger?: Logger,
  ): Promise<DMarketAPI> {
    logger?.info({
      joinContract: {
        contractAddress,
      },
    });

    const deployedDMarketContract = await findDeployedContract<DMarketContract>(providers, {
      contractAddress,
      contract: dMarketContractInstance,
      privateStateId: dMarketPrivateStateKey,
      initialPrivateState: DMarketAPI.getPrivateState(providers, password),
    });

    logger?.trace({
      contractJoined: {
        finalizedDeployTxData: deployedDMarketContract.deployTxData.public,
      },
    });

    return new DMarketAPI(deployedDMarketContract, providers, logger);
  }

  private static getPrivateState(providers: DMarketProviders, password: Uint8Array): DMarketPrivateState {
    return createDMarketPrivateState(password);
  }
}

export * from './common-types.js';
