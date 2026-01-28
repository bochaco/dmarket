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

import {
  BehaviorSubject,
  type Observable,
  concatMap,
  filter,
  firstValueFrom,
  interval,
  map,
  of,
  take,
  tap,
  throwError,
  timeout,
  catchError,
} from "rxjs";
import { pipe as fnPipe } from "fp-ts/function";
import { type Logger } from "pino";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { type BalancedProvingRecipe } from "@midnight-ntwrk/midnight-js-types";
import { type ShieldedCoinInfo } from "@midnight-ntwrk/ledger-v6";
import { type DMarketPrivateState } from "../../../contract/src/index";
import {
  DMarketAPI,
  type DMarketCircuitKeys,
  type DMarketProviders,
  type DeployedDMarketAPI,
} from "../../../api/src/index";
import { inMemoryPrivateStateProvider } from "../inMemoryPrivateState";
import {
  type ContractAddress,
  fromHex,
  toHex,
} from "@midnight-ntwrk/compact-runtime";
import semver from "semver";
import {
  FinalizedTransaction,
  PreBinding,
  PreProof,
  SignatureEnabled,
  Transaction,
  TransactionId,
  UnprovenTransaction,
} from "@midnight-ntwrk/ledger-v6";
import {
  ConnectedAPI,
  type InitialAPI,
} from "@midnight-ntwrk/dapp-connector-api";

/**
 * A fresh new DMarket deployment instance.
 */
export interface InitDMarketDeployment {
  readonly status: "init";
}

/**
 * An in-progress DMarket deployment.
 */
export interface InProgressDMarketDeployment {
  readonly status: "in-progress";
}

/**
 * A deployed DMarket deployment.
 */
export interface DeployedDMarketDeployment {
  readonly status: "deployed";

  /**
   * The {@link DeployedDMarketAPI} instance when connected to an on network DMarket contract.
   */
  readonly api: DeployedDMarketAPI;
}

/**
 * A failed DMarket deployment.
 */
export interface FailedDMarketDeployment {
  readonly status: "failed";

  /**
   * The error that caused the deployment to fail.
   */
  readonly error: Error;
}

/**
 * A DMarket deployment.
 */
export type DMarketDeployment =
  | InitDMarketDeployment
  | InProgressDMarketDeployment
  | DeployedDMarketDeployment
  | FailedDMarketDeployment;

/**
 * Provides access to an DMarket deployment.
 */
export interface DeployedDMarketAPIProvider {
  /**
   * Gets the observable DMarket deployment.
   *
   * @remarks
   * This property represents an observable {@link DMarketDeployment}.
   */
  readonly dMarketDeployment$: Observable<Observable<DMarketDeployment>>;

  /**
   * Resets it to the initial state.
   */
  readonly reset: () => Observable<DMarketDeployment>;

  /**
   * Joins an DMarket contract.
   *
   * @param contractAddress A contract address to use when resolving.
   * @param accountPassword A password for the account.
   * @returns An observable DMarket deployment.
   */
  readonly resolve: (
    contractAddress: ContractAddress,
    accountPassword: Uint8Array,
  ) => Observable<DMarketDeployment>;

  /**
   * Creates a new DMarket contract.
   *
   * @param assetName Name of the NFT create for the assets.
   * @param assetSymbol Symbol of the NFT created for the assets.
   * @param opsFee Fee the contract will charge for each operation.
   * @param accountPassword A password for the account.
   * @returns An observable DMarket deployment.
   */
  readonly create: (
    initNonce: Uint8Array,
    accountPassword: Uint8Array,
  ) => Observable<DMarketDeployment>;
}

/**
 * A {@link DeployedDMarketAPIProvider} that manages DMarket deployments in a browser setting.
 *
 * @remarks
 * {@link BrowserDeployedDMarketManager} configures and manages a connection to the Midnight Lace
 * wallet, along with a collection of additional providers that work in a web-browser setting.
 */
export class BrowserDeployedDMarketManager implements DeployedDMarketAPIProvider {
  readonly #DMarketDeploymentsSubject: BehaviorSubject<
    BehaviorSubject<DMarketDeployment>
  >;
  #initializedProviders: Promise<DMarketProviders> | undefined;

  /**
   * Initializes a new {@link BrowserDeployedDMarketManager} instance.
   *
   * @param logger The `pino` logger to for logging.
   */
  constructor(private readonly logger: Logger) {
    this.#DMarketDeploymentsSubject = new BehaviorSubject<
      BehaviorSubject<DMarketDeployment>
    >(new BehaviorSubject<DMarketDeployment>({ status: "init" }));
    this.dMarketDeployment$ = this.#DMarketDeploymentsSubject;
  }

  reset(): Observable<DMarketDeployment> {
    let deployment = new BehaviorSubject<DMarketDeployment>({
      status: "init",
    });

    this.#DMarketDeploymentsSubject.next(deployment);

    return deployment;
  }

  /** @inheritdoc */
  readonly dMarketDeployment$: Observable<Observable<DMarketDeployment>>;

  /** @inheritdoc */
  resolve(
    contractAddress: ContractAddress,
    accountPassword: Uint8Array,
  ): Observable<DMarketDeployment> {
    let deployment = this.#DMarketDeploymentsSubject.value;
    if (
      deployment.value.status === "deployed" &&
      deployment.value.api.deployedContractAddress === contractAddress
    ) {
      return deployment;
    }

    deployment = new BehaviorSubject<DMarketDeployment>({
      status: "in-progress",
    });

    void this.joinDeployment(deployment, contractAddress, accountPassword);

    this.#DMarketDeploymentsSubject.next(deployment);

    return deployment;
  }

  /** @inheritdoc */
  create(
    initNonce: Uint8Array,
    accountPassword: Uint8Array,
  ): Observable<DMarketDeployment> {
    let deployment = new BehaviorSubject<DMarketDeployment>({
      status: "in-progress",
    });

    void this.deployDeployment(deployment, initNonce, accountPassword);

    this.#DMarketDeploymentsSubject.next(deployment);

    return deployment;
  }

  private getProviders(): Promise<DMarketProviders> {
    // We use a cached `Promise` to hold the providers. This will:
    //
    // 1. Cache and re-use the providers (including the configured connector API), and
    // 2. Act as a synchronization point if multiple contract deploys or joins run concurrently.
    //    Concurrent calls to `getProviders()` will receive, and ultimately await, the same
    //    `Promise`.
    return (
      this.#initializedProviders ??
      (this.#initializedProviders = initializeProviders(this.logger))
    );
  }

  private async deployDeployment(
    deployment: BehaviorSubject<DMarketDeployment>,
    initNonce: Uint8Array,
    accountPassword: Uint8Array,
  ): Promise<void> {
    try {
      const providers = await this.getProviders();

      const api = await DMarketAPI.deploy(
        providers,
        initNonce,
        accountPassword,
        this.logger,
      );

      deployment.next({
        status: "deployed",
        api,
      });
    } catch (error: unknown) {
      deployment.next({
        status: "failed",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  private async joinDeployment(
    deployment: BehaviorSubject<DMarketDeployment>,
    contractAddress: ContractAddress,
    accountPassword: Uint8Array,
  ): Promise<void> {
    try {
      const providers = await this.getProviders();

      const api = await DMarketAPI.join(
        providers,
        contractAddress,
        accountPassword,
        this.logger,
      );

      deployment.next({
        status: "deployed",
        api,
      });
    } catch (error: unknown) {
      deployment.next({
        status: "failed",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}

/** @internal */
const initializeProviders = async (
  logger: Logger,
): Promise<DMarketProviders> => {
  const networkId = "preview"; //import.meta.env.VITE_NETWORK_ID
  const connectedAPI = await connectToWallet(logger, networkId);
  const zkConfigPath = window.location.origin; // '../../../contract/src/managed/DMarket';
  const keyMaterialProvider = new FetchZkConfigProvider<DMarketCircuitKeys>(
    zkConfigPath,
    fetch.bind(window),
  );
  const config = await connectedAPI.getConfiguration();
  const inMemoryDMarketPrivateStateProvider = inMemoryPrivateStateProvider<
    string,
    DMarketPrivateState
  >();
  const shieldedAddresses = await connectedAPI.getShieldedAddresses();
  return {
    privateStateProvider: inMemoryDMarketPrivateStateProvider,
    zkConfigProvider: keyMaterialProvider,
    proofProvider: httpClientProofProvider(config.proverServerUri!),
    publicDataProvider: indexerPublicDataProvider(
      config.indexerUri,
      config.indexerWsUri,
    ),
    walletProvider: {
      getCoinPublicKey(): string {
        return shieldedAddresses.shieldedCoinPublicKey;
      },
      getEncryptionPublicKey(): string {
        return shieldedAddresses.shieldedEncryptionPublicKey;
      },
      balanceTx: async (
        tx: UnprovenTransaction,
        newCoins?: ShieldedCoinInfo[],
        ttl?: Date,
      ): Promise<BalancedProvingRecipe> => {
        try {
          logger.info(
            { tx, newCoins, ttl },
            "Balancing transaction via wallet",
          );
          const serializedTx = toHex(tx.serialize());
          const received =
            await connectedAPI.balanceUnsealedTransaction(serializedTx);
          const transaction: Transaction<
            SignatureEnabled,
            PreProof,
            PreBinding
          > = Transaction.deserialize<SignatureEnabled, PreProof, PreBinding>(
            "signature",
            "pre-proof",
            "pre-binding",
            fromHex(received.tx),
          );
          return {
            type: "TransactionToProve",
            transaction: transaction,
          };
        } catch (e) {
          logger.error({ error: e }, "Error balancing transaction via wallet");
          throw e;
        }
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
        await connectedAPI.submitTransaction(toHex(tx.serialize()));
        const txIdentifiers = tx.identifiers();
        const txId = txIdentifiers[0]; // Return the first transaction ID
        logger.info({ txIdentifiers }, "Submitted transaction via wallet");
        return txId;
      },
    },
  };
};

/** @internal */
const connectToWallet = (
  logger: Logger,
  networkId: string,
): Promise<ConnectedAPI> => {
  const COMPATIBLE_CONNECTOR_API_VERSION = "4.x";

  return firstValueFrom(
    fnPipe(
      interval(100),
      map(() => window.midnight?.mnLace),
      tap((connectorAPI) => {
        logger.info(connectorAPI, "Check for wallet connector API");
      }),
      filter((connectorAPI): connectorAPI is InitialAPI => !!connectorAPI),
      concatMap((connectorAPI) =>
        semver.satisfies(
          connectorAPI.apiVersion,
          COMPATIBLE_CONNECTOR_API_VERSION,
        )
          ? of(connectorAPI)
          : throwError(() => {
              logger.error(
                {
                  expected: COMPATIBLE_CONNECTOR_API_VERSION,
                  actual: connectorAPI.apiVersion,
                },
                "Incompatible version of wallet connector API",
              );

              return new Error(
                `Incompatible version of Midnight Lace wallet found. Require '${COMPATIBLE_CONNECTOR_API_VERSION}', got '${connectorAPI.apiVersion}'.`,
              );
            }),
      ),
      tap((connectorAPI) => {
        logger.info(
          connectorAPI,
          "Compatible wallet connector API found. Connecting.",
        );
      }),
      take(1),
      timeout({
        first: 1_000,
        with: () =>
          throwError(() => {
            logger.error("Could not find wallet connector API");

            return new Error(
              "Could not find Midnight Lace wallet. Extension installed?",
            );
          }),
      }),
      concatMap(async (initialAPI) => {
        const connectedAPI = await initialAPI.connect(networkId);
        const connectionStatus = await connectedAPI.getConnectionStatus();
        logger.info(connectionStatus, "Wallet connector API enabled status");
        return connectedAPI;
      }),
      timeout({
        first: 5_000,
        with: () =>
          throwError(() => {
            logger.error("Wallet connector API has failed to respond");

            return new Error(
              "Midnight Lace wallet has failed to respond. Extension enabled?",
            );
          }),
      }),
      catchError((error, apis) =>
        error
          ? throwError(() => {
              logger.error("Unable to enable connector API" + error);
              return new Error("Application is not authorized");
            })
          : apis,
      ),
    ),
  );
};
