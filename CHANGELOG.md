# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [2.15.0](https://github.com/BigThunderSR/OnStarJS/compare/v2.14.3...v2.15.0) (2025-12-14)


### Features

* add simulateReauth function for Xvfb diagnostics ([37f0a0c](https://github.com/BigThunderSR/OnStarJS/commit/37f0a0c7c3372d1bc7527caf62b620f55d91ffe2))
* enhance simulateReauth function with token deletion and Xvfb diagnostics ([6271eb1](https://github.com/BigThunderSR/OnStarJS/commit/6271eb1110d4e2298dd71e251f4e257e1a8332b3))


### Bug Fixes

* **deps:** bump chromium-bidi from 11.0.1 to 12.0.0 ([711a7e4](https://github.com/BigThunderSR/OnStarJS/commit/711a7e4fa5f88c5c15bf4a7a049a4cd3ab90fd30))
* enhance Xvfb handling with proactive cleanup and detailed diagnostics ([2623eb6](https://github.com/BigThunderSR/OnStarJS/commit/2623eb666678c99a108e8e9f07d13e5ddf17e33c))
* require not defined ([e817f91](https://github.com/BigThunderSR/OnStarJS/commit/e817f91ab5d7aded9a93b79d20d9798db6b2cd6a))

## [2.14.3](https://github.com/BigThunderSR/OnStarJS/compare/v2.14.2...v2.14.3) (2025-12-06)


### Bug Fixes

* add git lfs update command to onCreateCommand in devcontainer configuration ([ea23ad8](https://github.com/BigThunderSR/OnStarJS/commit/ea23ad88972ab58993bc822c4b812b51c353f3d6))
* **deps:** bump jsonwebtoken from 9.0.2 to 9.0.3 ([4730d76](https://github.com/BigThunderSR/OnStarJS/commit/4730d76e969d144fcf8230d76bfdde0c220fbf85))
* reorder steps in publish workflow to ensure dependencies are installed after updating npm ([bc00867](https://github.com/BigThunderSR/OnStarJS/commit/bc00867fee77b6078db76bab4f6d0b1733ca0492))
* update npm to latest for trusted publishing ([1f9d85f](https://github.com/BigThunderSR/OnStarJS/commit/1f9d85f7906e58f2ef5b1676e1c1c1d2defe4185))
* **xvfb:** improve stability for long-running sessions and container restarts ([e56a130](https://github.com/BigThunderSR/OnStarJS/commit/e56a130f62c6ed625ad141ef17d36d0b9a572aee))

## [2.14.2](https://github.com/BigThunderSR/OnStarJS/compare/v2.14.1...v2.14.2) (2025-11-30)


### Bug Fixes

* **deps:** bump patchright from 1.56.1 to 1.57.0 ([93f6d50](https://github.com/BigThunderSR/OnStarJS/commit/93f6d509a7a2a6d54336c0436d1372f0037dd389))

## [2.14.1](https://github.com/BigThunderSR/OnStarJS/compare/v2.14.0...v2.14.1) (2025-11-21)


### Bug Fixes

* **deps:** bump chromium-bidi from 11.0.0 to 11.0.1 ([dcf151d](https://github.com/BigThunderSR/OnStarJS/commit/dcf151dc0d7d0db47825088aa39ce27c25c098b3))
* **deps:** bump http-cookie-agent from 7.0.2 to 7.0.3 ([4c33738](https://github.com/BigThunderSR/OnStarJS/commit/4c3373866d4fe384651ab7ac410dc9379470c0f5))

## [2.14.0](https://github.com/BigThunderSR/OnStarJS/compare/v2.13.0...v2.14.0) (2025-11-13)


### Features

* add refreshEVChargingMetrics method for live vehicle charging metrics ([d9b83be](https://github.com/BigThunderSR/OnStarJS/commit/d9b83be12f0392a260b0dc75b0a15579a614ef04))

## [2.13.0](https://github.com/BigThunderSR/OnStarJS/compare/v2.12.1...v2.13.0) (2025-11-10)


### Features

* **auth:** enhance JWT clock tolerance handling for IdP tokens ([f46bc25](https://github.com/BigThunderSR/OnStarJS/commit/f46bc257285b0511e6309626cb266e225c3ba28e))
* **auth:** improve JWT expiration handling by decoding exp in milliseconds ([1737eaf](https://github.com/BigThunderSR/OnStarJS/commit/1737eafeba6f8e555184e19b2cbbf396aff49ecb))
* **auth:** update decodeJwtExp to decodeJwtExpMs for millisecond precision ([6651989](https://github.com/BigThunderSR/OnStarJS/commit/6651989825d05428ecef121af23e8a4239c98214))
* **auth:** update decodeJwtExp to decodeJwtExpMs for milliseconds handling ([9a13295](https://github.com/BigThunderSR/OnStarJS/commit/9a13295674051d4de63c8bbc7ffa007af165d555))


### Bug Fixes

* **auth:** update browser launch arguments for improved performance and stability ([ac17602](https://github.com/BigThunderSR/OnStarJS/commit/ac1760242818b9a872df30fc623a0b9e56db00a2))
* await TOTP.generate for totp-generator 1.1.0 compatibility ([5080fa9](https://github.com/BigThunderSR/OnStarJS/commit/5080fa9db8060335d2f287a97eedefa3fc11f2d2))
* **deps:** bump axios from 1.12.2 to 1.13.1 ([729bb1a](https://github.com/BigThunderSR/OnStarJS/commit/729bb1a97ac399e88d48beda37f0ee87dff9af2e))
* **deps:** bump axios from 1.13.1 to 1.13.2 ([62ae1ac](https://github.com/BigThunderSR/OnStarJS/commit/62ae1ac404e5f24a76e953a27767f8a8bd53399c))
* **deps:** bump chromium-bidi from 10.6.0 to 10.6.1 ([3f3e36a](https://github.com/BigThunderSR/OnStarJS/commit/3f3e36a2ced29b371a9e0522b12f856c8a0b08cd))
* **deps:** bump chromium-bidi from 10.6.1 to 11.0.0 ([9f1495b](https://github.com/BigThunderSR/OnStarJS/commit/9f1495bb92a996e3f7718502c8d9f81540af6f89))
* **deps:** bump totp-generator from 1.0.0 to 2.0.0 ([f463b09](https://github.com/BigThunderSR/OnStarJS/commit/f463b093ba7c7f07fc4d2b6fd464efa32b802009))
* **xvfb:** enhance cleanup process and enable reuse of existing Xvfb server ([523249d](https://github.com/BigThunderSR/OnStarJS/commit/523249d9c1faf85a520e17b6fc6ebc18d57d6316))

## [2.12.1](https://github.com/BigThunderSR/OnStarJS/compare/v2.12.0...v2.12.1) (2025-10-21)

### Bug Fixes

* **deps:** bump chromium-bidi from 10.2.0 to 10.6.0 ([c80dc0f](https://github.com/BigThunderSR/OnStarJS/commit/c80dc0fc99477d121e02fb292b2ee37ca4d3be2e))
* **deps:** bump patchright from 1.56.0 to 1.56.1 ([05c14f8](https://github.com/BigThunderSR/OnStarJS/commit/05c14f891a48b3f5ec7addf7d4a48a0ba570facf))

## [2.12.0](https://github.com/BigThunderSR/OnStarJS/compare/v2.11.1...v2.12.0) (2025-10-12)

### Features

* **OnStar:** add method to retrieve current EV charging metrics ([a1104ce](https://github.com/BigThunderSR/OnStarJS/commit/a1104ce5abcae4d0cb3d0e536cae78445b4680b5))
* **RequestService:** add getOnstarPlan method and corresponding tests ([6f61437](https://github.com/BigThunderSR/OnStarJS/commit/6f61437d5da6933ea7c2ec89e3f2648ff026be79))
* **RequestService:** add getVehicleDetails method and corresponding tests ([1628b82](https://github.com/BigThunderSR/OnStarJS/commit/1628b82792f7cee1f78415b2b1207bdbe77a9edb))
* **RequestService:** add getVehicleRecallInfo method and corresponding tests ([7b6c29a](https://github.com/BigThunderSR/OnStarJS/commit/7b6c29aa2b74a356b5ddc5aa4629831d1dfacfb8))
* **RequestService:** add interactive option to retrieve EV charging metrics ([346225e](https://github.com/BigThunderSR/OnStarJS/commit/346225e516d23016dc71b8ec1505ebacbbb1d35d))
* **RequestService:** add tests ([36024e4](https://github.com/BigThunderSR/OnStarJS/commit/36024e4bc8ac75a3140dc69a821a8030224ad21b))

## [2.11.1](https://github.com/BigThunderSR/OnStarJS/compare/v2.11.0...v2.11.1) (2025-10-11)

### Bug Fixes

* **deps:** bump chromium-bidi from 10.1.0 to 10.2.0 ([dc41a43](https://github.com/BigThunderSR/OnStarJS/commit/dc41a434c2a348fd3e4f0f22845cef3f41b80cbe))
* **RequestService:** update alert command request structure for v3 and v1 API compatibility ([65ab9b3](https://github.com/BigThunderSR/OnStarJS/commit/65ab9b3a53516d2c0a19498f8b118a7a5a6a898d))

## [2.11.0](https://github.com/BigThunderSR/OnStarJS/compare/v2.10.0...v2.11.0) (2025-10-10)

### Features

* **auth:** enhance TokenSet with refresh token metadata and improve expiry checks ([835d67d](https://github.com/BigThunderSR/OnStarJS/commit/835d67df121c71ca46501f94f75c4bdefb8baf6a))
* **RequestService:** add automatic v3→v1 API fallback for action commands ([215853f](https://github.com/BigThunderSR/OnStarJS/commit/215853f5496d9b09a0d492298b1255a8dd3141fe))

### Bug Fixes

* **deps:** bump chromium-bidi from 9.2.1 to 10.1.0 ([18e3d0b](https://github.com/BigThunderSR/OnStarJS/commit/18e3d0b26c965916072f773063157a9bca4cabd9))

## [2.10.0](https://github.com/BigThunderSR/OnStarJS/compare/v2.9.0...v2.10.0) (2025-10-07)

### Features

* **get-vehicles:** add script to fetch vehicle data with error handling and environment variable validation ([e858e80](https://github.com/BigThunderSR/OnStarJS/commit/e858e8037df4b50eb0fcb3c4680872af6d51467e))
* **request-service-cli:** add interactive CLI for OnStar request service ([f133c64](https://github.com/BigThunderSR/OnStarJS/commit/f133c64ed0793d6c5b6f00b1ce5896c87120d534))
* **RequestService, index, types:** add cabinTemperature option to start method for EV remote start ([20a7005](https://github.com/BigThunderSR/OnStarJS/commit/20a70059193219d82410f34780309860d598eded))
* **RequestService, index, types:** enhance diagnostics and account vehicle retrieval; add HealthStatusResponse and TypedResult types ([3037b3f](https://github.com/BigThunderSR/OnStarJS/commit/3037b3fd6dda43d5f8f90b21271202767e935c8c))
* **RequestService, index:** add flashLights and stopLights methods for enhanced vehicle control ([50b102c](https://github.com/BigThunderSR/OnStarJS/commit/50b102c7fd2a28fb191f66098bdec25aef91c25b))
* **RequestService, index:** add setChargeLevelTarget method for EV charge level management ([2e252f8](https://github.com/BigThunderSR/OnStarJS/commit/2e252f8f0c1886bf55aa602c275269d653d14ea3))
* **RequestService, index:** add stopCharging method for EV charging session management ([28797ad](https://github.com/BigThunderSR/OnStarJS/commit/28797ad09ae3c5507fa67f8140dd743e8a49c6c9))
* **RequestService, index:** enhance diagnostics method to remove options parameter for simplified usage ([0807249](https://github.com/BigThunderSR/OnStarJS/commit/080724991d92fa9a6dc96309b6cbe14e6ac5941a))
* **RequestService, index:** update getAccountVehicles method to use GarageVehiclesResponse type; add GarageVehiclesResponse interface ([7535255](https://github.com/BigThunderSR/OnStarJS/commit/753525524a4b469394d638abb63da0f8f7ce2ee0))
* **RequestService:** add diagnostics and account vehicle retrieval; update scripts for diagnostics and location requests ([fedb1bd](https://github.com/BigThunderSR/OnStarJS/commit/fedb1bd06a335f49b8b06b7c8403a4c67ab0f2a2))
* **RequestService:** implement 429 error handling with retry logic and configuration options ([449d8ce](https://github.com/BigThunderSR/OnStarJS/commit/449d8cedba246b6ec30848661c4ad503f9da92ec))
* **RequestService:** implement diagnostics and account vehicle retrieval using new API; add utility functions for token handling and query parameter construction ([0c63061](https://github.com/BigThunderSR/OnStarJS/commit/0c63061b4841ec4dcc04943660e7cd94836123e6))
* update build scripts to use rimraf for directory cleanup and add lazy-loading for Xvfb module ([5771d64](https://github.com/BigThunderSR/OnStarJS/commit/5771d64358020792b6de16730c0a196152d0099a))

### Bug Fixes

* **deps:** bump axios from 1.11.0 to 1.12.2 ([d1907da](https://github.com/BigThunderSR/OnStarJS/commit/d1907da2e89594f14f70038269fdef20508d708e))
* **deps:** bump chromium-bidi from 7.2.0 to 7.3.2 ([fe67532](https://github.com/BigThunderSR/OnStarJS/commit/fe67532d0d33a905f7f55923ad1a344d37f04e31))
* **deps:** bump chromium-bidi from 7.3.2 to 8.0.0 ([9ce5e1c](https://github.com/BigThunderSR/OnStarJS/commit/9ce5e1c26d63e1e88c15efa78a429ce325330045))
* **deps:** bump chromium-bidi from 8.0.0 to 9.2.1 ([a80c4a6](https://github.com/BigThunderSR/OnStarJS/commit/a80c4a67d4517a1ec892abe7d56558e986227464))
* **deps:** bump patchright from 1.52.5 to 1.56.0 ([54be0e6](https://github.com/BigThunderSR/OnStarJS/commit/54be0e6fc698442093496fa29224388212945e01))
* **RequestService:** remove redundant headers from request methods for cleaner code ([efbf30f](https://github.com/BigThunderSR/OnStarJS/commit/efbf30f932b0cdaae20f490fcfeda7cd5401a7b4))
* **RequestService:** standardize header casing and update user agent in config ([1df5864](https://github.com/BigThunderSR/OnStarJS/commit/1df586405bcd4debf765594b47c17c902399905f))
* **RequestService:** update request headers for improved compatibility and dynamic host resolution ([049b0b0](https://github.com/BigThunderSR/OnStarJS/commit/049b0b047bb5fe4c52b940571cde8160d29ca09f))

## [2.9.0](https://github.com/BigThunderSR/OnStarJS/compare/v2.8.0...v2.9.0) (2025-07-30)

### Features

* **auth:** add logging for partial browser state detection during reinitialization ([90a4feb](https://github.com/BigThunderSR/OnStarJS/commit/90a4feb551e67958dc40a5dc3362c969d7b60795))
* **auth:** add reauthentication tests and improve cleanup logic ([751a69d](https://github.com/BigThunderSR/OnStarJS/commit/751a69d82451ba53ccd6337b48759edf683841f9))
* **auth:** add xvfb support for Linux virtual display ([d87cfd7](https://github.com/BigThunderSR/OnStarJS/commit/d87cfd76f3b8c748236ffc353e6b37fddaea1aca))
* **auth:** adjust warmup logic to visit 2-3 sites for improved browser initialization ([6745f8c](https://github.com/BigThunderSR/OnStarJS/commit/6745f8cc6de0530b1f22a1d5ec7d067c6649ca74))
* **auth:** enable randomized fingerprinting for all authentication attempts ([dbfb2d1](https://github.com/BigThunderSR/OnStarJS/commit/dbfb2d11b094fff89d4a508f0132da025a3b8e25))
* **auth:** enhance browser and Xvfb management for improved long-running reliability ([a61c517](https://github.com/BigThunderSR/OnStarJS/commit/a61c5171fb51554d123e54a4ff58e07118a381c9))
* **auth:** enhance browser automation ([49a24ea](https://github.com/BigThunderSR/OnStarJS/commit/49a24ea31c274e28328d5a6c98a776c40766bef3))
* **auth:** enhance browser automation stealth with additional arguments and realistic human behavior simulation ([3559700](https://github.com/BigThunderSR/OnStarJS/commit/3559700e78837729c8e811f082147a785ea4cfd8))
* **auth:** enhance browser automation with additional Chrome flags and retry logic for authentication ([7cf83c7](https://github.com/BigThunderSR/OnStarJS/commit/7cf83c747fdc5c9fbd14f4336a00eba41add43c8))
* **auth:** enhance browser automation with advanced anti-detection flags and human-like behavior simulation ([29ac8dd](https://github.com/BigThunderSR/OnStarJS/commit/29ac8dd21dac4d666f1749bf6bdc1ca5b4f1f9e5))
* **auth:** enhance browser by simulating more realistic user interactions ([7ff63f8](https://github.com/BigThunderSR/OnStarJS/commit/7ff63f8e7b2797b135251d2fb42a1959dd0f6ae1))
* **auth:** enhance browser context initialization with error handling and logging ([4f9dc87](https://github.com/BigThunderSR/OnStarJS/commit/4f9dc87f377bc9f4aa9ebe443be317a88f611e34))
* **auth:** enhance browser fingerprinting with device profiles for improved randomness ([2448a1d](https://github.com/BigThunderSR/OnStarJS/commit/2448a1d37b50469914a34c2b3084216f900cafcf))
* **auth:** enhance browser initialization with Xvfb state detection for Linux ([ab1f4ce](https://github.com/BigThunderSR/OnStarJS/commit/ab1f4ceeea60b402e8fdecde51ec3a87dc11333b))
* **auth:** enhance browser profile management and streamline browser arguments for improved reliability ([705443e](https://github.com/BigThunderSR/OnStarJS/commit/705443ea20ed390bd5bce41706ba7b4d92c82620))
* **auth:** enhance browser stealth by spoofing navigator properties ([9035f2d](https://github.com/BigThunderSR/OnStarJS/commit/9035f2d94aa64c6ab8e2c558b2200de5ca1e132d))
* **auth:** enhance browser usability checks during initialization ([108500f](https://github.com/BigThunderSR/OnStarJS/commit/108500f64598ee551ad9bd1040873e6afc1608e3))
* **auth:** enhance credential submission with human-like behavior and progressive delays for retries ([77a259f](https://github.com/BigThunderSR/OnStarJS/commit/77a259f4300b0f08d5a9c1194d04556450c26e56))
* **auth:** enhance display detection logic for Linux environments ([543fef0](https://github.com/BigThunderSR/OnStarJS/commit/543fef0c691552f634159673c0591a2f80bfc09d))
* **auth:** enhance display detection logic for Xvfb usage on Linux ([0fe7371](https://github.com/BigThunderSR/OnStarJS/commit/0fe737125857f7fac1ff1d0d80ce1417cc96fd32))
* **auth:** enhance MFA and authentication logging with detailed messages and emojis for better clarity ([2b11fa2](https://github.com/BigThunderSR/OnStarJS/commit/2b11fa28a8eea053e6ecf91525e95dcf15a9d060))
* **auth:** implement browser warmup for improved session state and increase test timeouts for authentication and reauthentication ([4a63087](https://github.com/BigThunderSR/OnStarJS/commit/4a63087fdc00eedb3732492433852275e88cf32b))
* **auth:** implement fallback browser launch method with enhanced logging ([afb7bed](https://github.com/BigThunderSR/OnStarJS/commit/afb7bed31521b2256b707fed5031e265aea2b172))
* **auth:** implement randomized browser fingerprinting for enhanced authentication retries ([3c239c8](https://github.com/BigThunderSR/OnStarJS/commit/3c239c806dc84a2af5e447667c3750e9d069c237))
* **auth:** implement retry mechanism for access denied errors during credential submission ([91ad704](https://github.com/BigThunderSR/OnStarJS/commit/91ad7045ab2a55ea28df00c4eaad2163f0e5b386))
* **auth:** improve browser usability checks and warmup logic for session state ([0d4a6b3](https://github.com/BigThunderSR/OnStarJS/commit/0d4a6b3a6b7d4d5748c6237c3c712a19a2ddbab7))
* **auth:** improve natural display detection logic for Linux environments ([be8ede0](https://github.com/BigThunderSR/OnStarJS/commit/be8ede0121811d4f7462caa5c899f1f4b33462a5))
* **auth:** improve Xvfb initialization with enhanced checks and multiple display attempts for Linux ([8cb74d5](https://github.com/BigThunderSR/OnStarJS/commit/8cb74d53b560bd9f4ae7729ce99cd4fbb8cf7ebe))
* **auth:** improve Xvfb management for better reliability and error handling ([33011a7](https://github.com/BigThunderSR/OnStarJS/commit/33011a78ffb4fa0440b5643c0fab0025466ba4bf))
* **auth:** increase max authentication retries and implement exponential backoff with jitter ([b926a04](https://github.com/BigThunderSR/OnStarJS/commit/b926a0405f2e686d97bc0eb179167ace426d05e6))
* **auth:** increase timeout for authentication and reauthentication tests to accommodate retries and browser warmup ([569cc3b](https://github.com/BigThunderSR/OnStarJS/commit/569cc3b154a2865861d4e571975b40d630d89841))
* **auth:** increase timeout for full reauthentication cycle to support exponential backoff ([343d899](https://github.com/BigThunderSR/OnStarJS/commit/343d899b01fc74ea021e92183c5b25e401b59b12))
* **auth:** modify Xvfb handling to allow reuse for retries and ensure proper cleanup on success or failure ([24cf870](https://github.com/BigThunderSR/OnStarJS/commit/24cf8701cd4db96cddf2ea01a1f2565446b59f9c))
* **auth:** optimize browser profile management during initialization ([5d5f225](https://github.com/BigThunderSR/OnStarJS/commit/5d5f225731704c3cc412b603d38b202b47d10064))
* **auth:** refine browser context usability checks and remove fallback launch flag ([3dac71d](https://github.com/BigThunderSR/OnStarJS/commit/3dac71da236880a655ed637de6e8ac7aecea801f))
* **auth:** streamline browser warming logic for natural session state establishment ([c979b79](https://github.com/BigThunderSR/OnStarJS/commit/c979b79e705e02395195aab32ff272da1424def5))
* enhance environment setup with interactive credential manager and improved scripts ([761834a](https://github.com/BigThunderSR/OnStarJS/commit/761834ae6e202fd6d021cdc06855f687678dda3b))

### Bug Fixes

* add 'echo y' to corepack install command in devcontainer configuration ([07ed5da](https://github.com/BigThunderSR/OnStarJS/commit/07ed5da61c0867da4bf9a76a43ec235579f8db2f))
* **auth:** fix encoding error in emoji from access denied error message for clarity ([33946ab](https://github.com/BigThunderSR/OnStarJS/commit/33946ab00651dc73fd0f9b0bfd1f12a5e6a5047b))
* **auth:** improve error handling for Xvfb initialization and provide installation guidance ([fe07842](https://github.com/BigThunderSR/OnStarJS/commit/fe0784238b5b2a03729e193032eb350043105ed1))
* consolidate postCreateCommand into a single string for improved execution flow ([2722002](https://github.com/BigThunderSR/OnStarJS/commit/2722002e1b9243738fd85d130ac2ff9dbc9cf529))
* **deps:** bump axios from 1.10.0 to 1.11.0 ([#401](https://github.com/BigThunderSR/OnStarJS/issues/401)) ([0f63e11](https://github.com/BigThunderSR/OnStarJS/commit/0f63e11136776ec45d69d769b5ca690223a76f3a))
* **docs:** update web app link in README for TOTP token generation ([7f887a4](https://github.com/BigThunderSR/OnStarJS/commit/7f887a47d87b10c7c510e5cd9890726ce96032d9))
* enhance postCreateCommand logging for better visibility during setup ([240580e](https://github.com/BigThunderSR/OnStarJS/commit/240580e9df522b034d89e955692fdf7f5cb4dd28))
* refactor postCreateCommand to improve readability and include loading of pnpm environment ([c528439](https://github.com/BigThunderSR/OnStarJS/commit/c5284393672df8e09fdbc83983830be87be27f49))
* remove unnecessary piping of 'yes' in corepack install command for clarity ([1e2791e](https://github.com/BigThunderSR/OnStarJS/commit/1e2791e711191b0f55e7909cf2de3e4abb4db5e7))
* replace 'echo y' with 'yes' in corepack install command for consistency ([0deb37e](https://github.com/BigThunderSR/OnStarJS/commit/0deb37e4ee03cebbd759ff8784fcf1a6e240f1d5))
* restore detailed logging in postCreateCommand for better visibility during setup ([ec817f6](https://github.com/BigThunderSR/OnStarJS/commit/ec817f6418fde06ab62f86d211edd11c6270a18a))
* revert corepack install command to use echo for compatibility in devcontainer configuration ([890702a](https://github.com/BigThunderSR/OnStarJS/commit/890702a0c74c36456fc38453148775b742072694))
* **tests:** increase global timeout to 900000ms for authentication tests ([cc04659](https://github.com/BigThunderSR/OnStarJS/commit/cc046590f7dcbefadfabc8baf078031d667c29ea))
* update .gitignore and .npmignore for improved security and consistency ([8eadc4b](https://github.com/BigThunderSR/OnStarJS/commit/8eadc4b249c95a133ecae087cf34ccc6c6ab75fa))
* update corepack install command in devcontainer configuration for conditional execution ([0e8146e](https://github.com/BigThunderSR/OnStarJS/commit/0e8146ec180c8012d4c0cc1f3fa41dae76d10eaa))
* update error assertion methods in RequestService tests to resolve failing tests ([46af836](https://github.com/BigThunderSR/OnStarJS/commit/46af83666f3e5b1a67da0096baf5b0d2c8d45ec1))
* update postCreateCommand in devcontainer configuration to use printf for compatibility ([4717ea5](https://github.com/BigThunderSR/OnStarJS/commit/4717ea51f544e954e482b195b8c5a253f8a16f63))
* update postCreateCommand to include pnpm setup for improved environment configuration ([5db72da](https://github.com/BigThunderSR/OnStarJS/commit/5db72daf8b8f8d22a7da3cd32c021fe4c51c744e))
* update postCreateCommand to install patchright globally for consistency ([d764201](https://github.com/BigThunderSR/OnStarJS/commit/d764201831904c7d7ba52ca36876e6f982a733ed))
* update postCreateCommand to load pnpm environment for improved setup consistency ([d0d5d60](https://github.com/BigThunderSR/OnStarJS/commit/d0d5d6054eac7ddd0c5e4e546265ffbd5336c8e7))
* update postCreateCommand to source bashrc for environment consistency ([7234a1c](https://github.com/BigThunderSR/OnStarJS/commit/7234a1c25a8e1eb24cdf91ebf9e4af69f93cab47))
* update postCreateCommand to use 'env' for patchright installation for improved environment consistency ([1d27310](https://github.com/BigThunderSR/OnStarJS/commit/1d27310c573245fdbd2c948cfb8d25827405f01f))
* update README formatting for consistency in section headers ([470a1b1](https://github.com/BigThunderSR/OnStarJS/commit/470a1b119c80274794d70409f50149e6b3078a81))
* update README to replace 'npm' with 'pnpm' for consistency in setup commands ([91e827a](https://github.com/BigThunderSR/OnStarJS/commit/91e827abedd3b74809e289c19655c7e0755bc6cf))

## [2.8.0](https://github.com/BigThunderSR/OnStarJS/compare/v2.7.0...v2.8.0) (2025-07-22)

### Features

* **tests:** adjust test timeout settings for improved reliability ([#400](https://github.com/BigThunderSR/OnStarJS/issues/400)) ([7c508c2](https://github.com/BigThunderSR/OnStarJS/commit/7c508c22e9ab989b74c27d26b6499538e5b8ede7))

### Bug Fixes

* **deps:** bump chromium-bidi from 7.1.1 to 7.2.0 ([#398](https://github.com/BigThunderSR/OnStarJS/issues/398)) ([ae5cd2e](https://github.com/BigThunderSR/OnStarJS/commit/ae5cd2eb32ff6f906364a239345fbecaafe25cc5))

## [2.7.0](https://github.com/BigThunderSR/OnStarJS/compare/v2.6.7...v2.7.0) (2025-07-17)

### Features

* **auth:** enhance browser automation ([#395](https://github.com/BigThunderSR/OnStarJS/issues/395)) ([065f6fa](https://github.com/BigThunderSR/OnStarJS/commit/065f6faef8b2a4f624ababe455d87ee3222c17b7))
* **deps:** add chromium-bidi dependency ([8d87ec0](https://github.com/BigThunderSR/OnStarJS/commit/8d87ec08e3e4cd70133192f95b5952bae7404d52))

### Bug Fixes

* **deps:** bump http-cookie-agent from 7.0.1 to 7.0.2 ([a8b90c4](https://github.com/BigThunderSR/OnStarJS/commit/a8b90c43cd5efa2413124d298d15e3ff7eedb1f5))

## [2.6.7](https://github.com/BigThunderSR/OnStarJS/compare/v2.6.6...v2.6.7) (2025-06-19)

## [2.6.6](https://github.com/BigThunderSR/OnStarJS/compare/v2.6.5...v2.6.6) (2025-06-17)

### Bug Fixes

* change browser channel from 'chrome' to 'chromium' in GMAuth ([a70e90c](https://github.com/BigThunderSR/OnStarJS/commit/a70e90ca53ed90c4d5e8a8be284db41bac067d8b))
* **deps:** bump axios from 1.8.4 to 1.9.0 ([8714ee2](https://github.com/BigThunderSR/OnStarJS/commit/8714ee2762037d9e8e56130cace1846a602c3817))
* **deps:** bump axios from 1.9.0 to 1.10.0 ([54680d6](https://github.com/BigThunderSR/OnStarJS/commit/54680d62d50e00c8f9c0c9789c8dfd2accb2fe08))
* **test:** revert timeout value for authentication test ([45b4cb1](https://github.com/BigThunderSR/OnStarJS/commit/45b4cb1a001ceb6085741d0e22dcc5a467716f9e))

## [2.6.5](https://github.com/BigThunderSR/OnStarJS/compare/v2.6.4...v2.6.5) (2025-04-18)

## [2.6.4](https://github.com/BigThunderSR/OnStarJS/compare/v2.6.3...v2.6.4) (2025-04-18)

### Bug Fixes

* **deps:** bump http-cookie-agent from 6.0.8 to 7.0.1 ([62b76c9](https://github.com/BigThunderSR/OnStarJS/commit/62b76c9e305850c652eaef312db5d30474257f50))

## [2.6.3](https://github.com/BigThunderSR/OnStarJS/compare/v2.6.2...v2.6.3) (2025-04-05)

### Bug Fixes

* **deps:** bump axios from 1.8.1 to 1.8.2 ([b9c1d50](https://github.com/BigThunderSR/OnStarJS/commit/b9c1d504622b7a6ea3a0b11455a125e9daa81df1))
* **deps:** bump axios from 1.8.2 to 1.8.4 ([e627229](https://github.com/BigThunderSR/OnStarJS/commit/e6272296ca7e7c2153b8fac8a4ed0ed764f46f7c))
* update license text to reflect current copyright holder ([7f52380](https://github.com/BigThunderSR/OnStarJS/commit/7f5238072c79cccbde4f0cc36fda8d673fd78f49))

## [2.6.2](https://github.com/BigThunderSR/OnStarJS/compare/v2.6.1...v2.6.2) (2025-03-03)

### Bug Fixes

* **deps:** bump axios from 1.7.9 to 1.8.1 ([f859bd7](https://github.com/BigThunderSR/OnStarJS/commit/f859bd71292b4f3bb502ddef1b1f70e174583c40))
* **deps:** bump tough-cookie from 5.0.0 to 5.1.0 ([a1d09fd](https://github.com/BigThunderSR/OnStarJS/commit/a1d09fdbd9f21cb16f82621e305316e9d25ded1c))
* **deps:** bump tough-cookie from 5.1.0 to 5.1.1 ([2d2b29f](https://github.com/BigThunderSR/OnStarJS/commit/2d2b29f26dd2580f3b4741021c453edc00610623))
* **deps:** bump tough-cookie from 5.1.1 to 5.1.2 ([d27cb7c](https://github.com/BigThunderSR/OnStarJS/commit/d27cb7cc8d5e511e7951e70591cb562c482aaade))
* **deps:** bump uuid from 11.0.3 to 11.0.4 ([bfe4298](https://github.com/BigThunderSR/OnStarJS/commit/bfe4298a1571407fc8c7e00be05f648cd482d4e0))
* **deps:** bump uuid from 11.0.4 to 11.0.5 ([cc49e5d](https://github.com/BigThunderSR/OnStarJS/commit/cc49e5d614e8a0da750c1a019c9233435d9a0fd1))
* **deps:** bump uuid from 11.0.5 to 11.1.0 ([97cc93f](https://github.com/BigThunderSR/OnStarJS/commit/97cc93fca1095a2df793801e48b4cfea3fe359f6))

### [2.6.1](https://github.com/BigThunderSR/OnStarJS/compare/v2.6.0...v2.6.1) (2024-12-04)

### Bug Fixes

* **deps:** update dependency openid-client to ^5.7.1 ([1d3f5ca](https://github.com/BigThunderSR/OnStarJS/commit/1d3f5ca296dbaf45e4d01a37f539f9a0aa0e3c7c))

## What's Changed

* Bump rollup from 4.27.3 to 4.27.4 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/190>
* Bump axios from 1.7.7 to 1.7.8 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/196>
* fix(deps): update dependency openid-client to ^5.7.1 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/188>
* Bump prettier from 3.3.3 to 3.4.1 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/195>
* Bump dotenv from 16.4.5 to 16.4.6 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/200>
* Bump rollup from 4.27.4 to 4.28.0 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/198>
* Add more token validity checks to prevent 403 errors by @metheos in <https://github.com/BigThunderSR/OnStarJS/pull/201>
* Improve test coverage by @BigThunderSR in <https://github.com/BigThunderSR/OnStarJS/pull/203>
* Update dependency dotenv to ^16.4.7 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/202>
* Bump husky from 8.0.3 to 9.1.7 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/181>
* Update pnpm to v9 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/83>
* Update dependency typescript to ^5.7.2 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/187>
* Bump @rollup/plugin-typescript from 11.1.6 to 12.1.1 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/168>

## New Contributors

* @metheos made their first contribution in <https://github.com/BigThunderSR/OnStarJS/pull/201>

## [2.6.0](https://github.com/BigThunderSR/OnStarJS/compare/v2.3.30...v2.6.0) (2024-11-23)

### Features

* Add new TOTP login method by @metheos
* include shared vehicles with getAccountVehicles ([#241](https://github.com/BigThunderSR/OnStarJS/issues/241)) ([09a173c](https://github.com/BigThunderSR/OnStarJS/commit/09a173c544ff7f97c472c903da0146047c11d6ab))

### Bug Fixes

* **deps:** update dependency axios to ^1.6.5 ([5e79a41](https://github.com/BigThunderSR/OnStarJS/commit/5e79a41ff32f1af0dee5cc86fb9a5f7a947520bc))
* **deps:** update dependency jsonwebtoken to ^9.0.2 ([f0450a9](https://github.com/BigThunderSR/OnStarJS/commit/f0450a966af9b9663f38bc52bb4b51c4eb05ed7a))
* **deps:** update dependency uuid to ^9.0.1 ([7b342f9](https://github.com/BigThunderSR/OnStarJS/commit/7b342f9502751e71fd2aca9c3e6065f84f197445))

## What's Changed

* chore(deps): update pnpm to v8.14.1 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/1>
* chore(deps): update pnpm/action-setup action to v2.4.0 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/2>
* chore(deps): update actions/checkout action to v4 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/3>
* chore(deps): update actions/setup-node action to v4 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/4>
* chore(deps): update dependency lint-staged to v15 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/5>
* chore(deps): update dependency prettier to v3 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/6>
* chore(deps): update dependency rollup to v4 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/7>
* chore(deps): update dependency @rollup/plugin-typescript to ^11.1.6 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/22>
* chore(deps): update dependency lint-staged to ^15.2.0 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/23>
* chore(deps): update dependency rollup to ^4.9.5 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/24>
* chore(deps): update dependency ts-jest to ^29.1.1 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/25>
* chore(deps): update jest monorepo by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/26>
* fix(deps): update dependency axios to ^1.6.5 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/27>
* fix(deps): update dependency jsonwebtoken to ^9.0.2 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/28>
* fix(deps): update dependency uuid to ^9.0.1 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/29>
* chore(deps): update dependency @rollup/plugin-json to ^6.1.0 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/30>
* chore(deps): update dependency dotenv to ^16.3.2 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/31>
* chore(deps): update dependency tslib to ^2.6.2 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/32>
* chore(deps): update dependency typescript to ^5.3.3 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/33>
* chore(deps): update ffurrer2/extract-release-notes action to v2 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/40>
* chore(deps-dev): bump rollup from 4.9.5 to 4.9.6 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/10>
* chore(deps): update pnpm to v8.15.1 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/21>
* chore(deps): bump axios from 1.6.5 to 1.6.7 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/43>
* chore(deps-dev): bump dotenv from 16.3.2 to 16.4.1 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/41>
* chore(deps): update dependency ts-jest to ^29.1.2 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/35>
* chore(deps-dev): bump @types/uuid from 9.0.7 to 9.0.8 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/42>
* chore(deps-dev): bump @types/jest from 29.5.11 to 29.5.12 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/48>
* chore(deps): bump pnpm/action-setup from 2.4.0 to 3.0.0 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/53>
* chore(deps-dev): bump lint-staged from 15.2.0 to 15.2.2 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/47>
* chore(deps-dev): bump husky from 8.0.3 to 9.0.11 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/58>
* chore(deps-dev): bump rollup from 4.9.6 to 4.12.0 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/59>
* chore(deps-dev): bump dotenv from 16.4.1 to 16.4.5 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/61>
* chore(deps-dev): bump prettier from 3.2.4 to 3.2.5 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/49>
* chore(deps): update pnpm to v8.15.4 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/57>
* chore(deps-dev): bump @types/jsonwebtoken from 9.0.5 to 9.0.6 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/64>
* chore(deps-dev): bump rollup from 4.12.0 to 4.13.0 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/71>
* chore(deps): bump axios from 1.6.7 to 1.6.8 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/70>
* chore(deps): update pnpm to v8.15.5 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/74>
* chore(deps-dev): bump rollup from 4.13.0 to 4.13.2 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/76>
* chore(deps-dev): bump rollup from 4.13.2 to 4.14.1 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/79>
* chore(deps-dev): bump typescript from 5.3.3 to 5.4.5 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/80>
* chore(deps): update pnpm to v8.15.6 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/77>
* chore(deps-dev): bump rollup from 4.14.1 to 4.14.3 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/82>
* chore(deps): update pnpm to v8.15.7 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/81>
* chore(deps): bump pnpm/action-setup from 3.0.0 to 4.0.0 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/89>
* chore(deps-dev): bump rollup from 4.14.3 to 4.17.2 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/87>
* chore(deps): bump axios from 1.6.8 to 1.7.2 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/95>
* chore(deps-dev): bump ts-jest from 29.1.2 to 29.1.3 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/94>
* Bump lint-staged from 15.2.2 to 15.2.5 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/98>
* Bump prettier from 3.2.5 to 3.3.0 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/100>
* Bump ts-jest from 29.1.3 to 29.1.4 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/101>
* chore(deps-dev): bump rollup from 4.17.2 to 4.18.0 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/96>
* chore(deps): update pnpm to v8.15.8 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/86>
* Bump prettier from 3.3.0 to 3.3.1 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/103>
* Bump tslib from 2.6.2 to 2.6.3 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/104>
* Bump lint-staged from 15.2.5 to 15.2.7 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/109>
* Bump uuid from 9.0.1 to 10.0.0 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/105>
* Bump prettier from 3.3.1 to 3.3.2 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/110>
* Bump ts-jest from 29.1.4 to 29.1.5 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/111>
* Bump prettier from 3.3.2 to 3.3.3 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/121>
* Bump @types/uuid from 9.0.8 to 10.0.0 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/114>
* Bump axios from 1.7.2 to 1.7.3 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/133>
* Bump lint-staged from 15.2.7 to 15.2.8 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/132>
* Bump ts-jest from 29.1.5 to 29.2.4 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/134>
* Bump rollup from 4.18.0 to 4.20.0 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/135>
* Bump lint-staged from 15.2.8 to 15.2.9 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/137>
* Bump axios from 1.7.3 to 1.7.4 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/138>
* Bump axios from 1.7.4 to 1.7.5 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/146>
* Bump lint-staged from 15.2.9 to 15.2.10 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/149>
* Bump ts-jest from 29.2.4 to 29.2.5 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/145>
* Bump axios from 1.7.5 to 1.7.7 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/150>
* Bump @types/jest from 29.5.12 to 29.5.13 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/154>
* Bump tslib from 2.6.3 to 2.7.0 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/144>
* Bump rollup from 4.20.0 to 4.21.3 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/156>
* Update pnpm to v8.15.9 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/124>
* Bump @types/jsonwebtoken from 9.0.6 to 9.0.7 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/159>
* Bump rollup from 4.21.3 to 4.22.4 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/160>
* Bump rollup from 4.22.4 to 4.22.5 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/164>
* Added new TOTP authentication mechanism from @metheos by @BigThunderSR in <https://github.com/BigThunderSR/OnStarJS/pull/183>
* Migrate renovate config by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/182>
* Bump @types/jest from 29.5.13 to 29.5.14 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/172>
* Bump tslib from 2.7.0 to 2.8.1 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/175>
* Update dependency typescript to ^5.6.3 by @renovate in <https://github.com/BigThunderSR/OnStarJS/pull/113>
* Bump uuid from 10.0.0 to 11.0.3 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/178>
* Bump rollup from 4.22.5 to 4.27.3 by @dependabot in <https://github.com/BigThunderSR/OnStarJS/pull/180>
* Add token location folder by @metheos and add test for this feature by @BigThunderSR by @BigThunderSR in <https://github.com/BigThunderSR/OnStarJS/pull/189>

### [2.5.3](https://github.com/samrum/OnStarJS/compare/v2.5.2...v2.5.3) (2024-07-27)

### Bug Fixes

* new secrets ([#256](https://github.com/samrum/OnStarJS/issues/256)) ([e4459ba](https://github.com/samrum/OnStarJS/commit/e4459ba7e82b8db21e021a25cde1c43d17299b7c))

### [2.5.2](https://github.com/samrum/OnStarJS/compare/v2.5.1...v2.5.2) (2024-06-05)

### Bug Fixes

* update secrets ([#253](https://github.com/samrum/OnStarJS/issues/253)) ([cb24704](https://github.com/samrum/OnStarJS/commit/cb247045ba25eecae1983b729ec4df4585f7f244))

### [2.5.1](https://github.com/samrum/OnStarJS/compare/v2.5.0...v2.5.1) (2024-04-17)

### Bug Fixes

* update secrets ([#252](https://github.com/samrum/OnStarJS/issues/252)) ([abd5e8b](https://github.com/samrum/OnStarJS/commit/abd5e8bbcc81fe367badfa53033aff7bc41d9ffa))

## [2.5.0](https://github.com/samrum/OnStarJS/compare/v2.4.0...v2.5.0) (2024-03-26)

### Features

* lock/unlock trunk ([#250](https://github.com/samrum/OnStarJS/issues/250)) ([b35d305](https://github.com/samrum/OnStarJS/commit/b35d305666ce90bce6818fe46072ef602c09fec5))

## [2.4.0](https://github.com/samrum/OnStarJS/compare/v2.3.30...v2.4.0) (2024-03-24)

### Features

* include shared vehicles with getAccountVehicles ([#241](https://github.com/samrum/OnStarJS/issues/241)) ([09a173c](https://github.com/samrum/OnStarJS/commit/09a173c544ff7f97c472c903da0146047c11d6ab))

### Bug Fixes

* update secrets ([#249](https://github.com/samrum/OnStarJS/issues/249)) ([0b8a1c9](https://github.com/samrum/OnStarJS/commit/0b8a1c95446ccc6c83c65f8f2bf5d79bb84676a8))

### [2.3.30](https://github.com/samrum/OnStarJS/compare/v2.3.29...v2.3.30) (2024-01-18)

### Bug Fixes

* update app config values ([#243](https://github.com/samrum/OnStarJS/issues/243)) ([3af9326](https://github.com/samrum/OnStarJS/commit/3af93266e55b6c5ba67d335d392223cffccb6530))

### [2.3.29](https://github.com/samrum/OnStarJS/compare/v2.3.28...v2.3.29) (2023-11-15)

### Bug Fixes

* new secrets ([#240](https://github.com/samrum/OnStarJS/issues/240)) ([7278588](https://github.com/samrum/OnStarJS/commit/72785885ed19bb5177ee1e8e4d2dd44dc730ebf9))

### [2.3.28](https://github.com/samrum/OnStarJS/compare/v2.3.27...v2.3.28) (2023-11-01)

### Bug Fixes

* updated OnStar Credentials ([#237](https://github.com/samrum/OnStarJS/issues/237)) ([5dc5bc3](https://github.com/samrum/OnStarJS/commit/5dc5bc3b0c1a41e7271d781f79ab8a0b2e588541))

### [2.3.27](https://github.com/samrum/OnStarJS/compare/v2.3.26...v2.3.27) (2023-10-10)

### Bug Fixes

* android credentials no longer working  ([#234](https://github.com/samrum/OnStarJS/issues/234)) ([0351f78](https://github.com/samrum/OnStarJS/commit/0351f78ed7dea2db33ed9352445f5938b6a46f65))

### [2.3.26](https://github.com/samrum/OnStarJS/compare/v2.3.25...v2.3.26) (2023-09-03)

### [2.3.25](https://github.com/samrum/OnStarJS/compare/v2.3.24...v2.3.25) (2023-08-04)

### [2.3.24](https://github.com/samrum/OnStarJS/compare/v2.3.23...v2.3.24) (2023-06-24)

### [2.3.23](https://github.com/samrum/OnStarJS/compare/v2.3.22...v2.3.23) (2023-06-06)

### Bug Fixes

* update app config values (4175) ([#226](https://github.com/samrum/OnStarJS/issues/226)) ([81fbffc](https://github.com/samrum/OnStarJS/commit/81fbffc24d8e2fe76890a7450b4801efe0d13fd1))

### [2.3.22](https://github.com/samrum/OnStarJS/compare/v2.3.21...v2.3.22) (2023-04-30)

### Bug Fixes

* update app config values (4170) ([#225](https://github.com/samrum/OnStarJS/issues/225)) ([f6709b6](https://github.com/samrum/OnStarJS/commit/f6709b644acb08369dbd0641c31258f8053bcf95))

### [2.3.21](https://github.com/samrum/OnStarJS/compare/v2.3.20...v2.3.21) (2023-04-26)

### [2.3.20](https://github.com/samrum/OnStarJS/compare/v2.3.19...v2.3.20) (2023-04-26)

### [2.3.19](https://github.com/samrum/OnStarJS/compare/v2.3.18...v2.3.19) (2023-04-26)

### Bug Fixes

* update app config values (4169) ([#220](https://github.com/samrum/OnStarJS/issues/220)) ([9a893f1](https://github.com/samrum/OnStarJS/commit/9a893f10a7761eb0c59837739d8f2b3f582bc4a3))

### [2.3.18](https://github.com/samrum/OnStarJS/compare/v2.3.17...v2.3.18) (2023-03-30)

### Bug Fixes

* update app config values (4164) ([#218](https://github.com/samrum/OnStarJS/issues/218)) ([52ed972](https://github.com/samrum/OnStarJS/commit/52ed972fc84050624d41c42043ead9ebe8beea9c))

### [2.3.17](https://github.com/samrum/OnStarJS/compare/v2.3.16...v2.3.17) (2023-03-08)

### Bug Fixes

* update app config values (4158) ([#217](https://github.com/samrum/OnStarJS/issues/217)) ([1bc1068](https://github.com/samrum/OnStarJS/commit/1bc106805f1c2486e8721fdeb49bf209f384e5d2))

### [2.3.16](https://github.com/samrum/OnStarJS/compare/v2.3.15...v2.3.16) (2023-02-11)

### [2.3.15](https://github.com/samrum/OnStarJS/compare/v2.3.14...v2.3.15) (2023-01-25)

### Bug Fixes

* disable default token upgrades ([#215](https://github.com/samrum/OnStarJS/issues/215)) ([2f5bb01](https://github.com/samrum/OnStarJS/commit/2f5bb01d4d0dbd9801423a208e7e461d158e734f))

### [2.3.14](https://github.com/samrum/OnStarJS/compare/v2.3.13...v2.3.14) (2022-12-31)

### Bug Fixes

* update app config values (4151) ([#213](https://github.com/samrum/OnStarJS/issues/213)) ([6e159a5](https://github.com/samrum/OnStarJS/commit/6e159a523870323040c5018e68fdc30644abc8ce))

### [2.3.13](https://github.com/samrum/OnStarJS/compare/v2.3.12...v2.3.13) (2022-11-03)

### Bug Fixes

* 403 insufficient_scope when running commands ([#210](https://github.com/samrum/OnStarJS/issues/210)) ([95ab4d8](https://github.com/samrum/OnStarJS/commit/95ab4d872ebdf8ba455108f913ada8b5c3bc46f1))

### [2.3.12](https://github.com/samrum/OnStarJS/compare/v2.3.11...v2.3.12) (2022-11-02)

### Bug Fixes

* update app config values (4142) ([#209](https://github.com/samrum/OnStarJS/issues/209)) ([478e9fa](https://github.com/samrum/OnStarJS/commit/478e9fa683c1225d674ee65adfb39fc67c7fd3ee))

### [2.3.11](https://github.com/samrum/OnStarJS/compare/v2.3.10...v2.3.11) (2022-10-08)

### Bug Fixes

* update app config values (4134) ([#206](https://github.com/samrum/OnStarJS/issues/206)) ([cf7d425](https://github.com/samrum/OnStarJS/commit/cf7d4257567a1e8cd946b98c15411980abced5ed))

### [2.3.10](https://github.com/samrum/OnStarJS/compare/v2.3.9...v2.3.10) (2022-09-14)

### Bug Fixes

* update app config values (4130) ([#203](https://github.com/samrum/OnStarJS/issues/203)) ([a01b5e4](https://github.com/samrum/OnStarJS/commit/a01b5e4a5e418b1c36e0f2349d963a2b660e0c75))

### [2.3.9](https://github.com/samrum/OnStarJS/compare/v2.3.8...v2.3.9) (2022-07-19)

### Bug Fixes

* update app config values (3659024) ([#200](https://github.com/samrum/OnStarJS/issues/200)) ([4f381e5](https://github.com/samrum/OnStarJS/commit/4f381e50e4795aef2fbdb831b1cb4aa7090fcb96))

### [2.3.8](https://github.com/samrum/OnStarJS/compare/v2.3.7...v2.3.8) (2022-05-30)

### Bug Fixes

* update app config values (3500127) ([#198](https://github.com/samrum/OnStarJS/issues/198)) ([623f869](https://github.com/samrum/OnStarJS/commit/623f86927191eb12859834fe9ca360caad4665bc))

### [2.3.7](https://github.com/samrum/OnStarJS/compare/v2.3.6...v2.3.7) (2022-05-01)

### Bug Fixes

* update app config values (3425710) ([#197](https://github.com/samrum/OnStarJS/issues/197)) ([20d6bfd](https://github.com/samrum/OnStarJS/commit/20d6bfddaccc1cb3c8a825fca643ede54d68e3f2))

### [2.3.6](https://github.com/samrum/OnStarJS/compare/v2.3.5...v2.3.6) (2022-03-30)

### Bug Fixes

* update app config values (3323459) ([#196](https://github.com/samrum/OnStarJS/issues/196)) ([80e926c](https://github.com/samrum/OnStarJS/commit/80e926c903016fdc15b9a22b833a425b29c369e7))

### [2.3.5](https://github.com/samrum/OnStarJS/compare/v2.3.4...v2.3.5) (2022-03-20)

### Bug Fixes

* update app config values (3286103) ([#194](https://github.com/samrum/OnStarJS/issues/194)) ([87fab2f](https://github.com/samrum/OnStarJS/commit/87fab2fa781098c87a3263083a96ce8020dce7d2))

### [2.3.4](https://github.com/samrum/OnStarJS/compare/v2.3.3...v2.3.4) (2022-02-21)

### Bug Fixes

* update app config values (3191181) ([#193](https://github.com/samrum/OnStarJS/issues/193)) ([2cd7269](https://github.com/samrum/OnStarJS/commit/2cd726974a459e7c0c05327fdf2bd6c5fdb358ff))

### [2.3.3](https://github.com/samrum/OnStarJS/compare/v2.3.2...v2.3.3) (2022-01-25)

### Bug Fixes

* update app config values (3080291) ([#192](https://github.com/samrum/OnStarJS/issues/192)) ([018ed94](https://github.com/samrum/OnStarJS/commit/018ed94c363027d5e5dda1d7d781f03e63a7abd2))

### [2.3.2](https://github.com/samrum/OnStarJS/compare/v2.3.1...v2.3.2) (2022-01-13)

### Bug Fixes

* update app config values (2993541) ([#187](https://github.com/samrum/OnStarJS/issues/187)) ([369b296](https://github.com/samrum/OnStarJS/commit/369b296cc8e8a268cc68364e5a331ffc09a584ee))

### [2.3.1](https://github.com/samrum/OnStarJS/compare/v2.3.0...v2.3.1) (2021-12-07)

### Bug Fixes

* update app config values (2879762) ([98544a4](https://github.com/samrum/OnStarJS/commit/98544a49d4270ada01f6ced84766fdce3c2cde43))

## [2.3.0](https://github.com/samrum/OnStarJS/compare/v2.2.4...v2.3.0) (2021-10-17)

### Features

* add support for the location command ([#149](https://github.com/samrum/OnStarJS/issues/149)) ([84108ee](https://github.com/samrum/OnStarJS/commit/84108ee4854e9ef99b4e9d445c6df861957a99af)), closes [#139](https://github.com/samrum/OnStarJS/issues/139)

### Bug Fixes

* **deps:** bump ansi-regex from 5.0.0 to 5.0.1 ([#150](https://github.com/samrum/OnStarJS/issues/150)) ([56bb4c7](https://github.com/samrum/OnStarJS/commit/56bb4c749575a9e79f6fbd6f3bf8a0ab9469b1c6))
* **deps:** bump axios from 0.21.1 to 0.21.2 ([#151](https://github.com/samrum/OnStarJS/issues/151)) ([b7f4166](https://github.com/samrum/OnStarJS/commit/b7f4166c1f48187ab972e4860071674426b8173d))
* **deps:** bump tmpl from 1.0.4 to 1.0.5 ([#142](https://github.com/samrum/OnStarJS/issues/142)) ([1e98f30](https://github.com/samrum/OnStarJS/commit/1e98f3091aca5ed09f9971e4e9bdffd975b56202))
* update app config values (2751711) ([#148](https://github.com/samrum/OnStarJS/issues/148)) ([a34ed98](https://github.com/samrum/OnStarJS/commit/a34ed98a9eacefef6e35a3b9ae8e4fa5585db017))

### [2.2.4](https://github.com/samrum/OnStarJS/compare/v2.2.3...v2.2.4) (2021-08-21)

### Bug Fixes

* update app config values (2539908) ([#130](https://github.com/samrum/OnStarJS/issues/130)) ([185dd32](https://github.com/samrum/OnStarJS/commit/185dd322b45ad13dbc1da490df84708c69d2f89a))

### [2.2.3](https://github.com/samrum/OnStarJS/compare/v2.2.2...v2.2.3) (2021-08-03)

### Bug Fixes

* update app config values (2461527) ([#117](https://github.com/samrum/OnStarJS/issues/117)) ([12d9e82](https://github.com/samrum/OnStarJS/commit/12d9e829d077e0c09502ab0778b0defb75903cdd))

### [2.2.2](https://github.com/samrum/OnStarJS/compare/v2.2.1...v2.2.2) (2021-06-18)

### Bug Fixes

* update app config values (2344580) ([#97](https://github.com/samrum/OnStarJS/issues/97)) ([8499944](https://github.com/samrum/OnStarJS/commit/849994482e6ec0e020d5764459d28f985e0e2d54))

### [2.2.1](https://github.com/samrum/OnStarJS/compare/v2.2.0...v2.2.1) (2021-05-30)

### Bug Fixes

* **deps:** bump ws from 7.4.1 to 7.4.6 ([#84](https://github.com/samrum/OnStarJS/issues/84)) ([a6ed96e](https://github.com/samrum/OnStarJS/commit/a6ed96e67546c0226e5dea596f9d179a7365a43e))
* update app config values (2239589) ([#85](https://github.com/samrum/OnStarJS/issues/85)) ([f0eb7d1](https://github.com/samrum/OnStarJS/commit/f0eb7d14a9ee2f8ae69f90b8db6026d4dd545858))

## [2.2.0](https://github.com/samrum/OnStarJS/compare/v2.1.1...v2.2.0) (2021-05-28)

### Features

* add the ability to configure custom request polling timeout and interval values ([#82](https://github.com/samrum/OnStarJS/issues/82)) ([0d7286c](https://github.com/samrum/OnStarJS/commit/0d7286c4a291fc1b09c5451ee066664a7f1d72ab))

### Bug Fixes

* prioritize command failure over command timeout ([#83](https://github.com/samrum/OnStarJS/issues/83)) ([14e7ebc](https://github.com/samrum/OnStarJS/commit/14e7ebc039074b4d73488ff1b1b657c785cafe3f))
* **deps:** bump handlebars from 4.7.6 to 4.7.7 ([#70](https://github.com/samrum/OnStarJS/issues/70)) ([e1cd5bd](https://github.com/samrum/OnStarJS/commit/e1cd5bda47de8ae5f8d5e197b29cbfd89c76770c))

### [2.1.1](https://github.com/samrum/OnStarJS/compare/v2.1.0...v2.1.1) (2021-05-03)

### Bug Fixes

* **requests:** maintain checkRequestStatus while checking requests ([#63](https://github.com/samrum/OnStarJS/issues/63)) ([9f24339](https://github.com/samrum/OnStarJS/commit/9f243390d37bccbfc90607df3009c8c22bdc2427))

## [2.1.0](https://github.com/samrum/OnStarJS/compare/v2.0.14...v2.1.0) (2021-05-02)

### Features

* **requests:** add support for toggling checkRequestStatus option ([#60](https://github.com/samrum/OnStarJS/issues/60)) ([4f75d55](https://github.com/samrum/OnStarJS/commit/4f75d555283d9a4a506bcf9f11438e10da64611c))

### Bug Fixes

* **deps:** bump uuid from 3.4.0 to 8.3.2 ([#54](https://github.com/samrum/OnStarJS/issues/54)) ([843709e](https://github.com/samrum/OnStarJS/commit/843709ed452b2110edd65663b7c25403ea469adc))
* **request-service:** prevent api errors due to non-uppercase config vin ([#57](https://github.com/samrum/OnStarJS/issues/57)) ([d3e26b0](https://github.com/samrum/OnStarJS/commit/d3e26b03f950b411fee11dc8fa90e53f58f2eabf))
* update app config values (2105716) ([#52](https://github.com/samrum/OnStarJS/issues/52)) ([d3f56ff](https://github.com/samrum/OnStarJS/commit/d3f56ffc3e573f19a1d476c5bf29ca385cd5d289))

### [2.0.14](https://github.com/samrum/OnStarJS/compare/v2.0.13...v2.0.14) (2021-04-14)

### Bug Fixes

* **appconfig:** update app config using myChevrolet 5.0.1 values ([#40](https://github.com/samrum/OnStarJS/issues/40)) ([c2b6970](https://github.com/samrum/OnStarJS/commit/c2b6970a042de95c4612d08dd1090020a0b9c5e8))

### [2.0.13](https://github.com/samrum/OnStarJS/compare/v2.0.12...v2.0.13) (2021-02-02)

### Bug Fixes

* **appconfig:** update app config using myChevrolet 4.4.0 values ([#36](https://github.com/samrum/OnStarJS/issues/36)) ([b05f560](https://github.com/samrum/OnStarJS/commit/b05f5604a6c94794b462bc6141668567ba47f9cc))
* **requestserver:** remove connectAndUpgradeAuthToken unused return value and fix return type ([#35](https://github.com/samrum/OnStarJS/issues/35)) ([6d59fe4](https://github.com/samrum/OnStarJS/commit/6d59fe4649ec875029760f1d09f9c267565bddb7))
