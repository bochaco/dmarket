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

import React, { useEffect, useState } from 'react';
import { DMarket } from './components';
import { useDeployedDMarketContext } from './hooks';
import { type DMarketDeployment } from './contexts';
import { type Observable } from 'rxjs';

/**
 * The root DMarket application component.
 * @internal
 */
const App: React.FC = () => {
  const dMarketApiProvider = useDeployedDMarketContext();
  const [dMarketDeployment, setDMarketDeployment] = useState<Observable<DMarketDeployment>>();

  useEffect(() => {
    const subscription = dMarketApiProvider.dMarketDeployment$.subscribe(setDMarketDeployment);
    return () => {
      subscription.unsubscribe();
    };
  }, [dMarketApiProvider]);

  return <DMarket dMarketDeployment$={dMarketDeployment} />;
};

export default App;
