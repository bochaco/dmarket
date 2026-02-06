export * from "./witnesses";
export * from "./managed/dmarket/contract/index.js";

import { CompiledContract } from "@midnight-ntwrk/compact-js";
import * as CompiledDMarketContract from "./managed/dmarket/contract/index.js";
import * as Witnesses from "./witnesses";

export const CompiledDMarketContractContract = CompiledContract.make<
  CompiledDMarketContract.Contract<Witnesses.DMarketPrivateState>
>(
  "dMarket",
  CompiledDMarketContract.Contract<Witnesses.DMarketPrivateState>,
).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets("./compiled/dmarket"),
);
