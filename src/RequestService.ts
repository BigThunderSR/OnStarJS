// import TokenHandler from "./TokenHandler";
import Request, { RequestMethod } from "./Request";
import RequestResult from "./RequestResult";
import RequestError from "./RequestError";
import {
  AlertRequestAction,
  AlertRequestOptions,
  AlertRequestOverride,
  // ChargeOverrideMode,
  // ChargeOverrideOptions,
  // ChargingProfileChargeMode,
  // ChargingProfileRateType,
  // SetChargingProfileRequestOptions,
  DoorRequestOptions,
  TrunkRequestOptions,
  HttpClient,
  OAuthToken,
  OnStarConfig,
  RequestResponse,
  Result,
  CommandResponseStatus,
  GMAuthConfig,
} from "./types";
import onStarAppConfig from "./onStarAppConfig.json";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { getGMAPIJWT } from "./auth/GMAuth";

enum OnStarApiCommand {
  LockDoor = "lock",
  UnlockDoor = "unlock",
  Alert = "alert",
  CancelAlert = "cancelAlert",
  Start = "start",
  CancelStart = "cancelStart",
  LockTrunk = "lockTrunk",
  UnlockTrunk = "unlockTrunk",
  // ChargeOverride = "chargeOverride",
  // GetChargingProfile = "getChargingProfile",
  // SetChargingProfile = "setChargingProfile",
}

class RequestService {
  private config: OnStarConfig;
  private gmAuthConfig: GMAuthConfig;
  private authToken?: OAuthToken;
  private checkRequestStatus: boolean;
  private requestPollingTimeoutSeconds: number;
  private requestPollingIntervalSeconds: number;
  private cachedVehicleId?: string;
  // Cached EV session state (x-gm-token) and optional expiry
  private evSessionToken?: string;
  private evTokenExpiresAt?: number; // epoch ms, if decodable from JWT
  // Cache which API version works for action commands (v1 or v3)
  // This is only cached in memory (not disk) as API support may change over time
  private cachedActionCommandApiVersion?: "v1" | "v3";

  constructor(
    config: OnStarConfig,
    private client: HttpClient,
  ) {
    this.config = {
      ...config,
      vin: config.vin.toUpperCase(),
    };

    this.gmAuthConfig = {
      username: this.config.username,
      password: this.config.password,
      deviceId: this.config.deviceId,
      totpKey: this.config.onStarTOTP,
      tokenLocation: this.config.tokenLocation ?? "./",
    };

    this.checkRequestStatus = this.config.checkRequestStatus ?? true;
    this.requestPollingTimeoutSeconds =
      config.requestPollingTimeoutSeconds ?? 90;
    this.requestPollingIntervalSeconds =
      config.requestPollingIntervalSeconds ?? 6;
  }

  setClient(client: HttpClient) {
    this.client = client;

    return this;
  }

  setAuthToken(authToken: OAuthToken) {
    this.authToken = authToken;

    return this;
  }

  setRequestPollingTimeoutSeconds(seconds: number) {
    this.requestPollingTimeoutSeconds = seconds;

    return this;
  }

  setRequestPollingIntervalSeconds(seconds: number) {
    this.requestPollingIntervalSeconds = seconds;

    return this;
  }

  setCheckRequestStatus(checkStatus: boolean) {
    this.checkRequestStatus = checkStatus;

    return this;
  }

  async start(
    options?: import("./types").StartRequestOptions,
  ): Promise<Result> {
    // Try v3 API first, fallback to v1 API if v3 fails
    // This handles vehicles where v3 API doesn't support remote start commands
    const v3Url = this.getCommandUrl(OnStarApiCommand.Start);
    const requestBody: any = {};

    if (options && typeof options.cabinTemperature === "number") {
      // EV/Remote start can accept an optional cabin temperature (Celsius)
      const temp = Math.round(options.cabinTemperature);
      requestBody.cabinTemperature = temp;
    }

    return this.sendActionCommandWithFallback(
      v3Url,
      "start",
      Object.keys(requestBody).length > 0 ? requestBody : undefined,
    );
  }

  async cancelStart(): Promise<Result> {
    // Try v3 API first, fallback to v1 API if v3 fails
    // This handles vehicles where v3 API doesn't support cancelStart commands
    const v3Url = this.getCommandUrl(OnStarApiCommand.CancelStart);

    return this.sendActionCommandWithFallback(v3Url, "cancelStart");
  }

  async lockDoor(options: DoorRequestOptions = {}): Promise<Result> {
    // Try v3 API first, fallback to v1 API if v3 fails
    // This handles vehicles where v3 API doesn't support lock commands
    const v3Url = this.getCommandUrl(OnStarApiCommand.LockDoor);
    const requestBody = {
      lockDoorRequest: {
        delay: 0,
        ...options,
      },
    };

    return this.sendActionCommandWithFallback(v3Url, "lock", requestBody);
  }

  async unlockDoor(options: DoorRequestOptions = {}): Promise<Result> {
    // Try v3 API first, fallback to v1 API if v3 fails
    // This handles vehicles where v3 API doesn't support unlock commands
    const v3Url = this.getCommandUrl(OnStarApiCommand.UnlockDoor);
    const requestBody = {
      unlockDoorRequest: {
        delay: 0,
        ...options,
      },
    };

    return this.sendActionCommandWithFallback(v3Url, "unlock", requestBody);
  }

  async lockTrunk(options: TrunkRequestOptions = {}): Promise<Result> {
    // Try v3 API first, fallback to v1 API if v3 fails
    // This handles vehicles where v3 API doesn't support lockTrunk commands
    const v3Url = this.getCommandUrl(OnStarApiCommand.LockTrunk);
    const requestBody = {
      lockTrunkRequest: {
        delay: 0,
        ...options,
      },
    };

    return this.sendActionCommandWithFallback(v3Url, "lockTrunk", requestBody);
  }

  async unlockTrunk(options: DoorRequestOptions = {}): Promise<Result> {
    // Try v3 API first, fallback to v1 API if v3 fails
    // This handles vehicles where v3 API doesn't support unlockTrunk commands
    const v3Url = this.getCommandUrl(OnStarApiCommand.UnlockTrunk);
    const requestBody = {
      unlockTrunkRequest: {
        delay: 0,
        ...options,
      },
    };

    return this.sendActionCommandWithFallback(
      v3Url,
      "unlockTrunk",
      requestBody,
    );
  }

  async alert(options: AlertRequestOptions = {}): Promise<Result> {
    // Try v3 API first, fallback to v1 API if v3 fails
    // This handles vehicles where v3 API doesn't support alert commands (e.g., some ICE vehicles)
    const v3Url = this.getApiUrlForPath(`alert/${this.config.vin}`);
    // v3 expects top-level fields; v1 expects nested under alertRequest
    const v3Body = {
      action: [AlertRequestAction.Honk, AlertRequestAction.Flash],
      delay: 0,
      duration: 1,
      override: [
        AlertRequestOverride.DoorOpen,
        AlertRequestOverride.IgnitionOn,
      ],
      ...options,
    };
    const v1Body = { alertRequest: { ...v3Body } };

    return this.sendActionCommandWithFallback(v3Url, "alert", {
      __v3Body: v3Body,
      __v1Body: v1Body,
    });
  }

  async cancelAlert(): Promise<Result> {
    // Try v3 API first, fallback to v1 API if v3 fails
    // This handles vehicles where v3 API doesn't support cancelAlert commands
    const v3Url = this.getApiUrlForPath(`cancelAlert/${this.config.vin}`);

    return this.sendActionCommandWithFallback(v3Url, "cancelAlert");
  }

  async flashLights(options: AlertRequestOptions = {}): Promise<Result> {
    // Try v3 API first, fallback to v1 API if v3 fails
    // This handles vehicles where v3 API doesn't support flashLights commands
    const v3Url = this.getApiUrlForPath(`alert/${this.config.vin}`);
    // v3 expects top-level fields; v1 expects nested under alertRequest
    const v3Body = {
      action: [AlertRequestAction.Flash],
      delay: 0,
      duration: 1,
      override: [
        AlertRequestOverride.DoorOpen,
        AlertRequestOverride.IgnitionOn,
      ],
      ...options,
    };
    const v1Body = { alertRequest: { ...v3Body } };

    return this.sendActionCommandWithFallback(v3Url, "alert", {
      __v3Body: v3Body,
      __v1Body: v1Body,
    });
  }

  async stopLights(): Promise<Result> {
    // Try v3 API first, fallback to v1 API if v3 fails
    // This handles vehicles where v3 API doesn't support stopLights/cancelAlert commands
    const v3Url = this.getApiUrlForPath(`cancelAlert/${this.config.vin}`);

    return this.sendActionCommandWithFallback(v3Url, "cancelAlert");
  }

  // Charging-related APIs are temporarily disabled pending new API implementation
  // async chargeOverride(options: ChargeOverrideOptions = {}): Promise<Result> { /* ... */ }
  // async getChargingProfile(): Promise<Result> { /* ... */ }
  // async setChargingProfile(options: SetChargingProfileRequestOptions = {}): Promise<Result> { /* ... */ }

  /**
   * EV: Set the target charge level percentage (tcl)
   * Always fetches a fresh short-lived EV session token before issuing the command.
   */
  async setChargeLevelTarget(
    tcl: number,
    opts?: {
      noMetricsRefresh?: boolean;
      clientRequestId?: string;
      clientVersion?: string; // default 7.18.0.8006
      os?: "A" | "I"; // Android or iOS indicator for EV API metadata
    },
  ): Promise<Result> {
    if (tcl < 1 || tcl > 100 || !Number.isFinite(tcl)) {
      throw new Error("tcl must be a number between 1 and 100");
    }

    const gmMobileToken = (await this.getAuthToken()).access_token;
    // Ensure we have a valid EV session token (cached or freshly initialized)
    let { token: evToken, vehicleId: sessionVehicleId } =
      await this.ensureEVSession(gmMobileToken);
    let vehicleId = sessionVehicleId!; // must come from initSession metrics

    const baseUrl = `https://eve-vcn.ext.gm.com/api/gmone/v1/vehicle/performSetChargingSettings`;
    const clientVersion = opts?.clientVersion ?? "7.18.0.8006";
    const os = opts?.os ?? "A"; // default Android metadata
    const query = new URLSearchParams({
      vehicleVin: this.config.vin,
      clientVersion,
      clientType: "bev-myowner",
      buildType: "r",
      clientLocale: "en-US",
      deviceId: this.config.deviceId,
      os,
      ts: String(Date.now()),
      varch: "globalb",
      sid: this.randomHex(8).toUpperCase(),
      pid: this.randomHex(8).toUpperCase(),
    });

    const bodyParams = new URLSearchParams({
      tcl: String(Math.round(tcl)),
      vehicleId,
      noMetricsRefresh: String(opts?.noMetricsRefresh ?? false),
      clientRequestId: opts?.clientRequestId ?? uuidv4(),
    });

    // VehicleId is derived exclusively from initSession metrics

    const makeReq = (token: string) =>
      new Request(`${baseUrl}?${query.toString()}`)
        .setMethod(RequestMethod.Post)
        .setAuthRequired(false)
        .setContentType("application/x-www-form-urlencoded")
        .setHeaders({
          accept: "*/*",
          "x-gm-mobiletoken": gmMobileToken,
          "x-gm-token": token,
        })
        .setBody(bodyParams.toString())
        .setCheckRequestStatus(false); // EV API responds synchronously

    try {
      return await this.sendRequest(makeReq(evToken));
    } catch (err: any) {
      if (this.isEVAuthError(err)) {
        // Invalidate and retry once with a fresh EV session
        this.invalidateEVSession();
        ({ token: evToken, vehicleId: vehicleId } =
          await this.ensureEVSession(gmMobileToken));
        return this.sendRequest(makeReq(evToken));
      }
      throw err;
    }
  }

  /**
   * EV: Stop charging session
   * Always initializes a fresh short-lived EV session token (like setChargeLevelTarget)
   * so we derive the correct vehicleId from metrics. API responds synchronously.
   */
  async stopCharging(opts?: {
    noMetricsRefresh?: boolean;
    clientRequestId?: string;
    clientVersion?: string; // default 7.18.0.8006
    os?: "A" | "I"; // Android or iOS indicator for EV API metadata
  }): Promise<Result> {
    const gmMobileToken = (await this.getAuthToken()).access_token;
    let { token: evToken, vehicleId: sessionVehicleId } =
      await this.ensureEVSession(gmMobileToken);
    let vehicleId = sessionVehicleId!;

    const baseUrl = `https://eve-vcn.ext.gm.com/api/gmone/v1/vehicle/performStopCharging`;
    const clientVersion = opts?.clientVersion ?? "7.18.0.8006";
    const os = opts?.os ?? "A";
    const query = new URLSearchParams({
      vehicleVin: this.config.vin,
      clientVersion,
      clientType: "bev-myowner",
      buildType: "r",
      clientLocale: "en-US",
      deviceId: this.config.deviceId,
      os,
      ts: String(Date.now()),
      varch: "globalb",
      sid: this.randomHex(8).toUpperCase(),
      pid: this.randomHex(8).toUpperCase(),
    });

    const bodyParams = new URLSearchParams({
      vehicleId,
      noMetricsRefresh: String(opts?.noMetricsRefresh ?? false),
      clientRequestId: opts?.clientRequestId ?? uuidv4(),
    });

    const makeReq = (token: string) =>
      new Request(`${baseUrl}?${query.toString()}`)
        .setMethod(RequestMethod.Post)
        .setAuthRequired(false)
        .setContentType("application/x-www-form-urlencoded")
        .setHeaders({
          accept: "*/*",
          "x-gm-mobiletoken": gmMobileToken,
          "x-gm-token": token,
        })
        .setBody(bodyParams.toString())
        .setCheckRequestStatus(false);

    try {
      return await this.sendRequest(makeReq(evToken));
    } catch (err: any) {
      if (this.isEVAuthError(err)) {
        this.invalidateEVSession();
        ({ token: evToken, vehicleId } =
          await this.ensureEVSession(gmMobileToken));
        return this.sendRequest(makeReq(evToken));
      }
      throw err;
    }
  }

  /**
   * EV: Retrieve current vehicle charging metrics
   * API responds synchronously with metrics payload.
   */
  async getEVChargingMetrics(opts?: {
    clientVersion?: string; // default 7.18.0.8006
    os?: "A" | "I"; // Android or iOS indicator for EV API metadata
  }): Promise<Result> {
    const gmMobileToken = (await this.getAuthToken()).access_token;
    let { token: evToken, vehicleId } =
      await this.ensureEVSession(gmMobileToken);

    const baseUrl = `https://eve-vcn.ext.gm.com/api/gmone/v1/vehicle/getVehicleChargingMetrics`;
    const clientVersion = opts?.clientVersion ?? "7.18.0.8006";
    const os = opts?.os ?? "A";
    const query = new URLSearchParams({
      vehicleId: vehicleId!,
      vehicleVin: this.config.vin,
      clientVersion,
      clientType: "bev-myowner",
      buildType: "r",
      clientLocale: "en-US",
      deviceId: this.config.deviceId,
      os,
      ts: String(Date.now()),
      varch: "globalb",
      sid: this.randomHex(8).toUpperCase(),
      pid: this.randomHex(8).toUpperCase(),
    });

    const makeReq = (token: string) =>
      new Request(`${baseUrl}?${query.toString()}`)
        .setMethod(RequestMethod.Get)
        .setAuthRequired(false)
        .setContentType("application/json")
        .setHeaders({
          accept: "*/*",
          "x-gm-mobiletoken": gmMobileToken,
          "x-gm-token": token,
        })
        .setCheckRequestStatus(false);

    try {
      return await this.sendRequest(makeReq(evToken));
    } catch (err: any) {
      if (this.isEVAuthError(err)) {
        this.invalidateEVSession();
        ({ token: evToken, vehicleId } =
          await this.ensureEVSession(gmMobileToken));
        return this.sendRequest(makeReq(evToken));
      }
      throw err;
    }
  }

  /**
   * EV: Force-refresh and retrieve live vehicle charging metrics
   * This issues a POST to performVehicleChargingMetricsQuery with refreshTrigger
   * and returns the synchronous metrics payload. Retries once on EV auth errors.
   */
  async refreshEVChargingMetrics(opts?: {
    clientVersion?: string; // default 7.18.0.8006
    os?: "A" | "I"; // Android or iOS indicator for EV API metadata
  }): Promise<Result> {
    const gmMobileToken = (await this.getAuthToken()).access_token;
    let { token: evToken, vehicleId } =
      await this.ensureEVSession(gmMobileToken);

    const baseUrl =
      "https://eve-vcn.ext.gm.com/api/gmone/v1/vehicle/performVehicleChargingMetricsQuery";
    const clientVersion = opts?.clientVersion ?? "7.18.0.8006";
    const os = opts?.os ?? "A";
    const query = new URLSearchParams({
      vehicleVin: this.config.vin,
      clientVersion,
      clientType: "bev-myowner",
      buildType: "r",
      clientLocale: "en-US",
      deviceId: this.config.deviceId,
      os,
      ts: String(Date.now()),
      varch: "globalb",
      sid: this.randomHex(8).toUpperCase(),
      pid: this.randomHex(8).toUpperCase(),
    });

    const bodyParams = new URLSearchParams({
      vehicleId: vehicleId!,
      refreshTrigger: "useEvVehicleTelemetry",
    });

    const makeReq = (token: string) =>
      new Request(`${baseUrl}?${query.toString()}`)
        .setMethod(RequestMethod.Post)
        .setAuthRequired(false)
        .setContentType("application/x-www-form-urlencoded")
        .setHeaders({
          accept: "*/*",
          "x-gm-mobiletoken": gmMobileToken,
          "x-gm-token": token,
        })
        .setBody(bodyParams.toString())
        .setCheckRequestStatus(false);

    try {
      return await this.sendRequest(makeReq(evToken));
    } catch (err: any) {
      if (this.isEVAuthError(err)) {
        this.invalidateEVSession();
        ({ token: evToken, vehicleId } =
          await this.ensureEVSession(gmMobileToken));
        return this.sendRequest(makeReq(evToken));
      }
      throw err;
    }
  }

  async diagnostics(): Promise<
    import("./types").TypedResult<import("./types").HealthStatusResponse>
  > {
    // vehicle health status API
    const url = `${onStarAppConfig.serviceUrl}/api/v1/vh/vehiclehealth/v1/healthstatus/${this.config.vin}`;

    const request = new Request(url)
      .setMethod(RequestMethod.Get)
      .setContentType("application/json")
      .setCheckRequestStatus(false);

    return this.sendRequest(request) as Promise<
      import("./types").TypedResult<import("./types").HealthStatusResponse>
    >;
  }

  async getAccountVehicles(): Promise<
    import("./types").GarageVehiclesResponse
  > {
    // v3 GraphQL garage API per captured data
    const url = `${onStarAppConfig.serviceUrl}/mbff/garage/v1`;
    const graphQL =
      "query getVehiclesMBFF {" +
      "vehicles {" +
      "vin vehicleId make model nickName year imageUrl onstarCapable vehicleType roleCode onstarStatusCode onstarAccountNumber preDelivery orderNum orderStatus" +
      "}" +
      "}";

    const request = new Request(url)
      .setMethod(RequestMethod.Post)
      .setContentType("text/plain; charset=utf-8")
      .setBody(graphQL)
      .setCheckRequestStatus(false);

    const result = await this.sendRequest(request);
    const payload: any = result.response?.data;
    if (result.status !== CommandResponseStatus.success) {
      console.error("getAccountVehicles failed", {
        status: result.status,
        data: payload,
      });
      throw new Error("getAccountVehicles request did not succeed");
    }
    if (payload && Array.isArray(payload.errors) && payload.errors.length) {
      console.error("getAccountVehicles GraphQL errors", {
        errors: payload.errors,
      });
      throw new Error("getAccountVehicles GraphQL errors present");
    }
    return payload as import("./types").GarageVehiclesResponse;
  }

  async getVehicleDetails(
    vin?: string,
  ): Promise<import("./types").VehicleDetailsResponse> {
    const url = `${onStarAppConfig.serviceUrl}/mbff/garage/v1`;
    const qVin = (vin || this.config.vin).toUpperCase();
    const graphQL =
      "query getMbffGarageVehicleDetails {" +
      `vehicleDetails(vin: "${qVin}") {` +
      "vin make model year onstarCapable imageUrl rpoCodes orderDate permissions { userPermissions accountPermissions { acctNum permissions disabledPermissionsResponse { code reason } } devicePermissions { id permissions disabledPermissions { code reason } } } " +
      "vehicleCommands { name url serviceId isEligible inEligibleReason metaData { supportedDiagnostics } } " +
      "color { exteriorColor interiorTrimColor } " +
      "vehicleMetaData { propulsionAndFuelType { fuelCategory propulsionType } unit { unitGen unitGenDescription } configuredCountry bodyStyle features extColor } " +
      "onstarInfo { onStarStatus ownerAccount isShared associatedDate }" +
      "}" +
      "}";

    const request = new Request(url)
      .setMethod(RequestMethod.Post)
      .setContentType("text/plain; charset=utf-8")
      .setBody(graphQL)
      .setCheckRequestStatus(false);

    const result = await this.sendRequest(request);
    const payload: any = result.response?.data;
    if (result.status !== CommandResponseStatus.success) {
      console.error("getVehicleDetails failed", {
        status: result.status,
        data: payload,
      });
      throw new Error("getVehicleDetails request did not succeed");
    }
    if (payload && Array.isArray(payload.errors) && payload.errors.length) {
      console.error("getVehicleDetails GraphQL errors", {
        errors: payload.errors,
      });
      throw new Error("getVehicleDetails GraphQL errors present");
    }
    return payload as import("./types").VehicleDetailsResponse;
  }

  async getOnstarPlan(
    vin?: string,
  ): Promise<import("./types").OnstarPlanResponse> {
    const url = `${onStarAppConfig.serviceUrl}/mbff/garage/v1`;
    const qVin = (vin || this.config.vin).toUpperCase();
    const graphQL =
      "query getPlanInfo {" +
      `vehicleDetails(vin: "${qVin}") {` +
      "model make year " +
      "onstarInfo { onStarStatus ownerAccount isShared associatedDate } " +
      "offers { productCode offerName associatedOfferingCode retailPrice billingCadence productRank discounts { name discountCategory price duration { uom value } } } " +
      "activePlans { offeringId isTrial orderNumber productId billingCadence startDate endDate } " +
      "orders { offeringId trial status salesOrderType salesProducts { salesProductType orderNumber salesProductId billingCadence startDate endDate } } " +
      "planExpiryInfo { productCode planName startDate endDate expiryDate orderDate isTrial type billingCadence cancelDate status features { featureCode featureName priorityNumber featureCategoryCode } additionalInfo { radioId } } " +
      "planInfo { productCode billingCadence status startDate endDate expiryDate cancelDate orderDate pricePlan productType isTrial orderItemTags offers { offerName associatedOfferingCode retailPrice billingCadence productRank discounts { name discountCategory price duration { uom value } } } } " +
      "}" +
      "}";

    const request = new Request(url)
      .setMethod(RequestMethod.Post)
      .setContentType("text/plain; charset=utf-8")
      .setBody(graphQL)
      .setCheckRequestStatus(false);

    const result = await this.sendRequest(request);
    const payload: any = result.response?.data;
    if (result.status !== CommandResponseStatus.success) {
      console.error("getOnstarPlan failed", {
        status: result.status,
        data: payload,
      });
      throw new Error("getOnstarPlan request did not succeed");
    }
    if (payload && Array.isArray(payload.errors) && payload.errors.length) {
      // If we have partial data alongside errors, log a warning and return
      // the partial response instead of throwing. This handles cases where
      // some GraphQL fields fail (e.g. offers) but plan data is still available.
      if (payload.data?.vehicleDetails) {
        console.warn(
          "getOnstarPlan GraphQL partial errors (returning available data)",
          {
            errors: payload.errors,
          },
        );
      } else {
        console.error("getOnstarPlan GraphQL errors", {
          errors: payload.errors,
        });
        throw new Error("getOnstarPlan GraphQL errors present");
      }
    }
    return payload as import("./types").OnstarPlanResponse;
  }

  async getVehicleRecallInfo(
    vin?: string,
  ): Promise<import("./types").VehicleRecallInfoResponse> {
    const url = `${onStarAppConfig.serviceUrl}/mbff/garage/v1`;
    const qVin = (vin || this.config.vin).toUpperCase();
    const graphQL =
      "query getVehicleRecallInfo {" +
      `vehicleDetails(vin: "${qVin}") {` +
      "recallInfo { recallId title type typeDescription description recallStatus repairStatus repairStatusCode repairDescription safetyRiskDescription completedDate }" +
      "}" +
      "}";

    const request = new Request(url)
      .setMethod(RequestMethod.Post)
      .setContentType("text/plain; charset=utf-8")
      .setBody(graphQL)
      .setCheckRequestStatus(false);

    const result = await this.sendRequest(request);
    const payload: any = result.response?.data;
    if (result.status !== CommandResponseStatus.success) {
      console.error("getVehicleRecallInfo failed", {
        status: result.status,
        data: payload,
      });
      throw new Error("getVehicleRecallInfo request did not succeed");
    }
    if (payload && Array.isArray(payload.errors) && payload.errors.length) {
      console.error("getVehicleRecallInfo GraphQL errors", {
        errors: payload.errors,
      });
      throw new Error("getVehicleRecallInfo GraphQL errors present");
    }
    return payload as import("./types").VehicleRecallInfoResponse;
  }

  async getWarrantyInfo(
    vin?: string,
  ): Promise<import("./types").WarrantyInfoResponse> {
    const url = `${onStarAppConfig.serviceUrl}/mbff/garage/v1`;
    const qVin = (vin || this.config.vin).toUpperCase();
    const graphQL =
      "query getWarrantyInfo {" +
      `vehicleDetails(vin: "${qVin}") {` +
      "warrantyInfo { startMileage endMileage startDate expirationDate typeDescription status mileageUnit notes } " +
      "}" +
      "}";

    const request = new Request(url)
      .setMethod(RequestMethod.Post)
      .setContentType("text/plain; charset=utf-8")
      .setBody(graphQL)
      .setCheckRequestStatus(false);

    const result = await this.sendRequest(request);
    const payload: any = result.response?.data;
    if (result.status !== CommandResponseStatus.success) {
      console.error("getWarrantyInfo failed", {
        status: result.status,
        data: payload,
      });
      throw new Error("getWarrantyInfo request did not succeed");
    }
    if (payload && Array.isArray(payload.errors) && payload.errors.length) {
      console.error("getWarrantyInfo GraphQL errors", {
        errors: payload.errors,
      });
      throw new Error("getWarrantyInfo GraphQL errors present");
    }
    return payload as import("./types").WarrantyInfoResponse;
  }

  async getSxmSubscriptionInfo(
    vin?: string,
  ): Promise<import("./types").SxmSubscriptionInfoResponse> {
    const url = `${onStarAppConfig.serviceUrl}/mbff/garage/v1`;
    const qVin = (vin || this.config.vin).toUpperCase();
    const graphQL =
      "query getSxmSubscriptionInfo {" +
      `vehicleDetails(vin: "${qVin}") {` +
      "sxmSubscriptionInfo { deviceId subscriptions { subscriptionName packageId marketType startDate endDate services } channelAccountInfo { message radioId marketType packageName expiryDate phoneNumber } is360Device audioDeactDate audioDeactType suspended status } " +
      "}" +
      "}";

    const request = new Request(url)
      .setMethod(RequestMethod.Post)
      .setContentType("text/plain; charset=utf-8")
      .setBody(graphQL)
      .setCheckRequestStatus(false);

    const result = await this.sendRequest(request);
    const payload: any = result.response?.data;
    if (result.status !== CommandResponseStatus.success) {
      console.error("getSxmSubscriptionInfo failed", {
        status: result.status,
        data: payload,
      });
      throw new Error("getSxmSubscriptionInfo request did not succeed");
    }
    if (payload && Array.isArray(payload.errors) && payload.errors.length) {
      console.error("getSxmSubscriptionInfo GraphQL errors", {
        errors: payload.errors,
      });
      throw new Error("getSxmSubscriptionInfo GraphQL errors present");
    }
    return payload as import("./types").SxmSubscriptionInfoResponse;
  }

  async location(): Promise<Result> {
    const base = `${onStarAppConfig.serviceUrl}/veh/datadelivery/digitaltwin/v1/vehicles/${this.config.vin}`;

    const makeReq = (sms: boolean) =>
      new Request(`${base}?sms=${sms ? "true" : "false"}&region=na`)
        .setMethod(RequestMethod.Get)
        .setContentType("application/json")
        .setCheckRequestStatus(false);

    // Kick off a fresh location update
    let result = await this.sendRequest(makeReq(true));
    const timeoutMs = this.requestPollingTimeoutSeconds * 1000;
    const intervalMs = this.requestPollingIntervalSeconds * 1000;
    const startTs = Date.now();

    // Try to poll until updatePending != PENDING
    const getPending = (r: Result) => {
      const data: any = r.response?.data;
      return data?.telemetry?.data?.session?.updatePending as
        | string
        | undefined;
    };

    let pending = getPending(result);
    if (pending === "PENDING") {
      while (Date.now() - startTs < timeoutMs) {
        await this.delay(intervalMs);
        result = await this.sendRequest(makeReq(false));
        pending = getPending(result);
        if (pending && pending !== "PENDING") break;
      }
    }

    return result;
  }

  private getCommandRequest(command: OnStarApiCommand): Request {
    return new Request(this.getCommandUrl(command));
  }

  // Legacy v1 API URL helpers for alert commands
  private getV1CommandUrl(command: string): string {
    return `${onStarAppConfig.serviceUrl}/api/v1/account/vehicles/${this.config.vin}/commands/${command}`;
  }

  /**
   * Wrapper method that attempts an action command with v3 API first,
   * then falls back to v1 API if v3 fails with specific errors.
   * Uses memory caching to avoid redundant fallback attempts.
   *
   * @param v3Url - The v3 API endpoint URL
   * @param v1Command - The v1 API command name (e.g., "alert", "lock")
   * @param requestBody - The request body to send
   * @returns Promise<Result> - The result from whichever API succeeds
   */
  private async sendActionCommandWithFallback(
    v3Url: string,
    v1Command: string,
    requestBody?: any,
  ): Promise<Result> {
    // Allow callers to pass separate bodies for v3 and v1 to accommodate shape differences
    // If requestBody has __v3Body/__v1Body, prefer those; otherwise use the same body for both
    const v3Body = requestBody?.__v3Body ?? requestBody;
    const v1Body = requestBody?.__v1Body ?? requestBody;
    // If we've already determined v1 works for this vehicle, skip v3 attempt
    if (this.cachedActionCommandApiVersion === "v1") {
      console.log(
        `[ActionCommandFallback] Using cached v1 API for ${v1Command}`,
      );
      const v1Url = this.getV1CommandUrl(v1Command);
      const request = new Request(v1Url);
      if (v1Body) {
        request.setBody(v1Body);
      }
      return this.sendRequest(request);
    }

    // Try v3 API first (modern API)
    try {
      console.log(`[ActionCommandFallback] Attempting v3 API for ${v1Command}`);
      const v3Request = new Request(v3Url);
      if (v3Body) {
        v3Request.setBody(v3Body);
      }
      const result = await this.sendRequest(v3Request);

      // If v3 succeeds, cache it and return
      this.cachedActionCommandApiVersion = "v3";
      console.log(
        `[ActionCommandFallback] v3 API succeeded for ${v1Command}, caching preference`,
      );
      return result;
    } catch (error) {
      // Check if this is a 400 Bad Request or similar error that indicates
      // the v3 API doesn't support this command for this vehicle
      const shouldFallback = this.shouldFallbackToV1(error);

      if (shouldFallback) {
        console.log(
          `[ActionCommandFallback] v3 API failed for ${v1Command}, falling back to v1 API`,
        );

        // Try v1 API as fallback
        try {
          const v1Url = this.getV1CommandUrl(v1Command);
          const v1Request = new Request(v1Url);
          if (v1Body) {
            v1Request.setBody(v1Body);
          }
          const result = await this.sendRequest(v1Request);

          // If v1 succeeds, cache it for future calls
          this.cachedActionCommandApiVersion = "v1";
          console.log(
            `[ActionCommandFallback] v1 API succeeded for ${v1Command}, caching preference`,
          );
          return result;
        } catch (v1Error) {
          // If v1 also fails, throw the original v3 error since that's the "modern" API
          console.log(
            `[ActionCommandFallback] Both v3 and v1 APIs failed for ${v1Command}`,
          );
          throw error;
        }
      } else {
        // If it's not a fallback-worthy error, just throw it
        console.log(
          `[ActionCommandFallback] v3 API error not suitable for fallback, rethrowing`,
        );
        throw error;
      }
    }
  }

  /**
   * Determines if an error from v3 API should trigger fallback to v1 API.
   * Returns true for 400 Bad Request errors or other indicators that the
   * v3 API doesn't support this command for this vehicle type.
   *
   * @param error - The error caught from v3 API attempt
   * @returns boolean - True if should fallback to v1, false otherwise
   */
  private shouldFallbackToV1(error: any): boolean {
    // If it's a RequestError, check the response status
    if (error instanceof RequestError) {
      const response = error.getResponse();
      const data: any = response?.data;

      // Check for 400 Bad Request
      if (data?.status === 400 || data?.statusCode === 400) {
        return true;
      }

      // Check for specific error messages that indicate v3 API incompatibility
      const errorMessage = data?.message || data?.error || "";
      if (
        typeof errorMessage === "string" &&
        (errorMessage.includes("Bad Request") ||
          errorMessage.includes("not supported") ||
          errorMessage.includes("invalid"))
      ) {
        return true;
      }
    }

    // Check for axios-style errors with status codes
    if (error?.response?.status === 400) {
      return true;
    }

    // Don't fallback for other error types (network errors, timeouts, etc.)
    return false;
  }

  // Legacy init helpers removed (readGMAccessToken, buildInitQueryParams, randomHex)

  private getApiUrlForPath(path: string): string {
    return `${onStarAppConfig.serviceUrl}/veh/cmd/v3/${path}`;
  }

  private getCommandUrl(command: string): string {
    return this.getApiUrlForPath(`${command}/${this.config.vin}`);
  }

  private async getHeaders(request: Request): Promise<any> {
    const headers: any = {
      accept: "application/json",
      "accept-encoding": "gzip",
      "accept-language": "en-US",
      appversion: "myOwner-chevrolet-android-7.18.0-0",
      locale: "en-US",
      "content-type": request.getContentType(),
      "user-agent": onStarAppConfig.userAgent,
      "push-request": "allow",
    };

    if (request.isAuthRequired()) {
      const authToken = await this.getAuthToken();
      headers["Authorization"] = `Bearer ${authToken.access_token}`;
    }

    return headers;
  }

  async getAuthToken(): Promise<OAuthToken> {
    const { token, auth, decodedPayload } = await getGMAPIJWT(
      this.gmAuthConfig,
    );
    this.authToken = token;

    const authorizedVins: string[] = [];
    decodedPayload.vehs.forEach((veh: { vin: string }) => {
      authorizedVins.push(veh.vin);
    });
    if (!authorizedVins.includes(this.config.vin)) {
      throw new Error(
        `Provided VIN does not appear to be an authorized VIN for this OnStar account. ${this.config.vin} not in ${authorizedVins}`,
      );
    }

    return this.authToken;
  }

  private async sendRequest(request: Request): Promise<Result> {
    const max429Retries = this.config.max429Retries ?? 3;
    const retryPost = this.config.retryOn429ForPost ?? false;
    const baseDelay = this.config.initial429DelayMs ?? 1000;
    const backoff = this.config.backoffFactor ?? 2;
    const jitter = this.config.jitterMs ?? 250;
    const maxDelay = this.config.max429DelayMs ?? 30000;

    let attempt = 0;

    while (true) {
      try {
        const response = await this.makeClientRequest(request);
        const { data } = response;

        const checkRequestStatus =
          request.getCheckRequestStatus() ?? this.checkRequestStatus;

        if (checkRequestStatus && typeof data === "object") {
          // Support both legacy shape with { commandResponse } and v3 top-level shape
          // Example v3 initial response:
          // { requestId, requestTime, status: "IN_PROGRESS", url, error }
          let status: CommandResponseStatus | undefined;
          let url: string | undefined;
          let type: string | undefined;
          let requestTime: string | undefined;
          let requestId: string | undefined;

          const anyData: any = data as any;
          if (anyData.commandResponse) {
            const {
              requestTime: rt,
              status: st,
              url: u,
              type: t,
            } = anyData.commandResponse;
            status = st as CommandResponseStatus;
            url = u;
            type = t;
            requestTime = rt;
            requestId = anyData.commandResponse.requestId;
          } else if (
            anyData.requestId &&
            anyData.requestTime &&
            anyData.status &&
            anyData.url
          ) {
            // Normalize uppercase statuses to our enum
            status = this.mapCommandStatus(anyData.status);
            url = anyData.url;
            type = anyData.type; // might be undefined
            requestTime = anyData.requestTime;
            requestId = anyData.requestId;
          }

          if (status) {
            const requestTimestamp = new Date(requestTime as string).getTime();

            if (status === CommandResponseStatus.failure) {
              throw new RequestError("Command Failure")
                .setResponse(response)
                .setRequest(request);
            }

            if (
              Date.now() >=
              requestTimestamp + this.requestPollingTimeoutSeconds * 1000
            ) {
              throw new RequestError("Command Timeout")
                .setResponse(response)
                .setRequest(request);
            }

            if (
              status === CommandResponseStatus.inProgress &&
              type !== "connect"
            ) {
              // Log only for the initial POST; skip logs for subsequent polling GETs
              if (request.getMethod() === RequestMethod.Post) {
                try {
                  console.log(
                    "info: Command accepted; polling for completion",
                    {
                      timestamp: new Date()
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 19),
                      requestId,
                      url,
                    },
                  );
                } catch (_) {
                  // no-op logging safety
                }
              }

              await this.checkRequestPause();

              const pollReq = new Request(url as string)
                .setMethod(RequestMethod.Get)
                .setUpgradeRequired(false)
                .setCheckRequestStatus(checkRequestStatus);

              return this.sendRequest(pollReq);
            }

            return new RequestResult(status).setResponse(response).getResult();
          }
        }

        return new RequestResult(CommandResponseStatus.success)
          .setResponse(response)
          .getResult();
      } catch (error) {
        // If we received a 429 and we can/should retry, apply backoff and retry
        const isAxios = axios.isAxiosError(error);
        const status = isAxios ? error.response?.status : undefined;
        const method = request.getMethod();
        const methodStr = method === RequestMethod.Get ? "GET" : "POST";

        if (
          status === 429 &&
          (method === RequestMethod.Get || retryPost) &&
          attempt < max429Retries
        ) {
          attempt++;
          // Determine delay: prefer Retry-After header if present
          let delayMs = baseDelay * Math.pow(backoff, attempt - 1);
          let retryAfter: any = undefined;
          let usedRetryAfter = false;
          if (isAxios) {
            retryAfter =
              error.response?.headers?.["retry-after"] ??
              error.response?.headers?.["Retry-After"];
            const parsed = this.parseRetryAfter(retryAfter);
            if (parsed !== null) {
              delayMs = parsed;
              usedRetryAfter = true;
            }
          }
          // Cap and add small jitter
          delayMs =
            Math.min(delayMs, maxDelay) + Math.floor(Math.random() * jitter);

          console.warn("[throttle] 429 received; scheduling retry", {
            url: request.getUrl(),
            method: methodStr,
            attempt,
            maxRetries: max429Retries,
            retryAfter,
            usedRetryAfter,
            delayMs,
          });

          await this.delay(delayMs);
          // loop and retry
          continue;
        }

        if (status === 429) {
          let reason = "not-eligible";
          if (!(method === RequestMethod.Get || retryPost)) {
            reason = "post-retry-disabled";
          } else if (attempt >= max429Retries) {
            reason = "max-retries-exceeded";
          }
          console.warn("[throttle] 429 received; not retrying", {
            url: request.getUrl(),
            method: methodStr,
            attempt,
            maxRetries: max429Retries,
            reason,
          });
        }

        if (error instanceof RequestError) {
          throw error;
        }

        let errorObj = new RequestError();

        if (isAxios) {
          if (error.response) {
            errorObj.message = `Request Failed with status ${error.response.status} - ${error.response.statusText}`;
            errorObj.setResponse({ data: error.response.data });
            // Attach our logical Request, not axios' raw request, to avoid circular refs
            errorObj.setRequest(request);
          } else if (error.request) {
            errorObj.message = "No response";
            errorObj.setRequest(request);
          } else {
            errorObj.message = error.message;
          }
        } else if ((error as any)?.response?.status) {
          // Non-axios-like error but carrying a response with status
          const resp: any = (error as any).response;
          const status = resp.status;
          const statusText = resp.statusText || "";
          errorObj.message =
            `Request Failed with status ${status}$${statusText ? " - " + statusText : ""}`.replace(
              "$$",
              "",
            );
          // Ensure we pass a data object with status so downstream logic can inspect it
          const data = resp.data;
          const normalized =
            data && typeof data === "object" ? { ...data, status } : { status };
          errorObj.setResponse({ data: normalized });
          errorObj.setRequest(request);
        } else if (error instanceof Error) {
          errorObj.message = error.message;
        }

        throw errorObj;
      }
    }
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ===== EV API helpers =====
  private async initEVSessionToken(
    gmMobileToken: string,
  ): Promise<{ token: string; vehicleId?: string }> {
    // Build URL with required metadata
    const baseUrl = `https://eve-vcn.ext.gm.com/api/gmone/v1/admin/initSession`;
    const clientVersion = "7.18.0.8006";
    const query = new URLSearchParams({
      vehicleVin: this.config.vin,
      clientVersion,
      clientType: "bev-myowner",
      buildType: "r",
      clientLocale: "en-US",
      deviceId: this.config.deviceId,
      os: "I", // emulate iOS like captured traffic (works with either)
      ts: String(Date.now()),
      sid: this.randomHex(8).toUpperCase(),
      pid: this.randomHex(8).toUpperCase(),
    });

    // Form body requires the GM mobile token
    const bodyParams = new URLSearchParams({
      token: gmMobileToken,
      vehicleVIN: this.config.vin, // observed in captures
    });

    const req = new Request(`${baseUrl}?${query.toString()}`)
      .setMethod(RequestMethod.Post)
      .setAuthRequired(false)
      .setContentType("application/x-www-form-urlencoded")
      .setHeaders({
        accept: "*/*",
      })
      .setBody(bodyParams.toString())
      .setCheckRequestStatus(false);

    const result = await this.sendRequest(req);
    const data: any = result.response?.data;

    const token: string | undefined = data?.results?.[0]?.loginResponse?.token;
    const vehicleId: string | undefined =
      data?.results?.[0]?.getVehicleChargingMetricsResponse?.vehicleId;

    if (!token) {
      throw new Error("Failed to initialize EV session token");
    }
    if (!vehicleId) {
      throw new Error(
        "EV vehicleId not found in initSession metrics; cannot proceed",
      );
    }
    this.cachedVehicleId = vehicleId;
    // Attempt to parse JWT exp from token for proactive refresh
    const expMs = this.decodeJwtExpMs(token);
    if (expMs) {
      // subtract small skew (5s)
      this.evTokenExpiresAt = expMs - 5000;
    } else {
      this.evTokenExpiresAt = undefined;
    }
    this.evSessionToken = token;
    return { token, vehicleId };
  }

  // Return cached EV session if present and not expired
  private async ensureEVSession(
    gmMobileToken: string,
  ): Promise<{ token: string; vehicleId: string }> {
    const cached = this.getValidEVSession();
    if (cached) return cached;

    const fresh = await this.initEVSessionToken(gmMobileToken);
    return { token: fresh.token, vehicleId: this.cachedVehicleId! };
  }

  private getValidEVSession(): { token: string; vehicleId: string } | null {
    if (!this.evSessionToken || !this.cachedVehicleId) return null;
    if (this.evTokenExpiresAt && Date.now() >= this.evTokenExpiresAt)
      return null;
    return { token: this.evSessionToken, vehicleId: this.cachedVehicleId };
  }

  private invalidateEVSession() {
    this.evSessionToken = undefined;
    this.evTokenExpiresAt = undefined;
    // Keep cachedVehicleId; it is stable for the VIN and useful across sessions
  }

  // Best-effort decode for JWT exp claim; returns expiration in milliseconds
  private decodeJwtExpMs(token: string): number | undefined {
    try {
      const parts = token.split(".");
      if (parts.length < 2) return undefined;
      const payload = JSON.parse(
        Buffer.from(
          parts[1].replace(/-/g, "+").replace(/_/g, "/"),
          "base64",
        ).toString("utf8"),
      );
      const exp = payload?.exp;
      if (typeof exp === "number" && isFinite(exp)) {
        // Heuristic: if exp looks like seconds (< 1e12), convert to ms; if already ms, use as-is
        return exp > 1e12 ? exp : exp * 1000;
      }
    } catch (_) {
      // ignore
    }
    return undefined;
  }

  private async ensureVehicleIdFromGarage(
    vin: string,
  ): Promise<string | undefined> {
    if (this.cachedVehicleId) return this.cachedVehicleId;
    try {
      const garage = await this.getAccountVehicles();
      const list = garage?.data?.vehicles ?? [];
      const match = list.find((v: any) => v.vin?.toUpperCase() === vin);
      if (match?.vehicleId) {
        this.cachedVehicleId = match.vehicleId;
        return this.cachedVehicleId;
      }
    } catch (_) {
      // ignore and return undefined to allow caller to throw a clearer error
    }
    return undefined;
  }

  private randomHex(len: number): string {
    const bytes = new Uint8Array(len / 2 + (len % 2));
    for (let i = 0; i < bytes.length; i++)
      bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, len);
  }

  // Parses Retry-After header which can be seconds (number) or http-date.
  private parseRetryAfter(retryAfter: any): number | null {
    if (!retryAfter) return null;
    if (typeof retryAfter === "number") {
      return retryAfter * 1000;
    }
    const asNum = Number(retryAfter);
    if (!Number.isNaN(asNum)) {
      return asNum * 1000;
    }
    const date = new Date(retryAfter);
    const ts = date.getTime();
    if (!Number.isNaN(ts)) {
      const diff = ts - Date.now();
      return diff > 0 ? diff : 0;
    }
    return null;
  }

  // Detect EV token/auth errors that should trigger a refresh/retry
  private isEVAuthError(err: any): boolean {
    // RequestError wrapping axios-like response
    if (err instanceof RequestError) {
      const data: any = err.getResponse()?.data;
      const status = (data as any)?.status ?? (data as any)?.statusCode;
      if (status === 401 || status === 403) return true;
      const msg = (data as any)?.message || (data as any)?.error;
      if (typeof msg === "string" && /token|auth|unauthor/i.test(msg))
        return true;
      // Some EV endpoints return 400 for expired/invalid session tokens; if our local token is expired, treat as auth error
      if (
        status === 400 &&
        this.evTokenExpiresAt &&
        Date.now() >= this.evTokenExpiresAt
      ) {
        return true;
      }
      return false;
    }
    // Axios-like error object
    const status = err?.response?.status;
    if (status === 401 || status === 403) return true;
    const msg = err?.response?.data?.message || err?.message;
    if (typeof msg === "string" && /token|auth|unauthor/i.test(msg))
      return true;
    if (
      status === 400 &&
      this.evTokenExpiresAt &&
      Date.now() >= this.evTokenExpiresAt
    ) {
      return true;
    }
    return false;
  }

  private async makeClientRequest(request: Request): Promise<RequestResponse> {
    const headers = await this.getHeaders(request);
    let requestOptions: any = {
      headers: {
        ...headers,
        ...request.getHeaders(),
      },
    };

    if (request.getMethod() === RequestMethod.Post) {
      const axiosResp = await this.client.post(
        request.getUrl(),
        request.getBody(),
        requestOptions,
      );
      return { data: (axiosResp as any).data };
    } else {
      const axiosResp = await this.client.get(request.getUrl(), requestOptions);
      return { data: (axiosResp as any).data };
    }
  }

  private checkRequestPause() {
    return new Promise((resolve) =>
      setTimeout(resolve, this.requestPollingIntervalSeconds * 1000),
    );
  }

  // Normalize API status strings to CommandResponseStatus
  private mapCommandStatus(status: string): CommandResponseStatus {
    if (!status) return CommandResponseStatus.inProgress;
    const s = String(status).toLowerCase();
    if (s === "success" || s === "completed" || s === "complete") {
      return CommandResponseStatus.success;
    }
    if (s === "failure" || s === "failed" || s === "error") {
      return CommandResponseStatus.failure;
    }
    // Many v3 responses use IN_PROGRESS in caps
    return CommandResponseStatus.inProgress;
  }
}

export default RequestService;
