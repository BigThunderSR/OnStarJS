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
import * as fs from "fs";
import * as path from "path";

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
  private cachedVehicleType?: string | null;

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
    const request = this.getCommandRequest(OnStarApiCommand.Start);
    if (options && typeof options.cabinTemperature === "number") {
      // EV/Remote start can accept an optional cabin temperature (Celsius)
      const temp = Math.round(options.cabinTemperature);
      request.setBody({ cabinTemperature: temp });
    }

    return this.sendRequest(request);
  }

  async cancelStart(): Promise<Result> {
    const request = this.getCommandRequest(OnStarApiCommand.CancelStart);

    return this.sendRequest(request);
  }

  async lockDoor(options: DoorRequestOptions = {}): Promise<Result> {
    const request = this.getCommandRequest(OnStarApiCommand.LockDoor).setBody({
      lockDoorRequest: {
        delay: 0,
        ...options,
      },
    });

    return this.sendRequest(request);
  }

  async unlockDoor(options: DoorRequestOptions = {}): Promise<Result> {
    const request = this.getCommandRequest(OnStarApiCommand.UnlockDoor).setBody(
      {
        unlockDoorRequest: {
          delay: 0,
          ...options,
        },
      },
    );

    return this.sendRequest(request);
  }

  async lockTrunk(options: TrunkRequestOptions = {}): Promise<Result> {
    const request = this.getCommandRequest(OnStarApiCommand.LockTrunk).setBody({
      lockTrunkRequest: {
        delay: 0,
        ...options,
      },
    });

    return this.sendRequest(request);
  }

  async unlockTrunk(options: DoorRequestOptions = {}): Promise<Result> {
    const request = this.getCommandRequest(
      OnStarApiCommand.UnlockTrunk,
    ).setBody({
      unlockTrunkRequest: {
        delay: 0,
        ...options,
      },
    });

    return this.sendRequest(request);
  }

  async alert(options: AlertRequestOptions = {}): Promise<Result> {
    // Route to v1 API for ICE vehicles, v3 API for EV/Hybrid
    const isICE = await this.isICEVehicle();
    const url = isICE
      ? this.getV1CommandUrl("alert")
      : this.getApiUrlForPath(`alert/${this.config.vin}`);

    const request = new Request(url).setBody({
      alertRequest: {
        action: [AlertRequestAction.Honk, AlertRequestAction.Flash],
        delay: 0,
        duration: 1,
        override: [
          AlertRequestOverride.DoorOpen,
          AlertRequestOverride.IgnitionOn,
        ],
        ...options,
      },
    });

    return this.sendRequest(request);
  }

  async cancelAlert(): Promise<Result> {
    // Route to v1 API for ICE vehicles, v3 API for EV/Hybrid
    const isICE = await this.isICEVehicle();
    const url = isICE
      ? this.getV1CommandUrl("cancelAlert")
      : this.getApiUrlForPath(`cancelAlert/${this.config.vin}`);

    const request = new Request(url);

    return this.sendRequest(request);
  }

  async flashLights(options: AlertRequestOptions = {}): Promise<Result> {
    // Route to v1 API for ICE vehicles, v3 API for EV/Hybrid
    const isICE = await this.isICEVehicle();
    const url = isICE
      ? this.getV1CommandUrl("alert")
      : this.getApiUrlForPath(`alert/${this.config.vin}`);

    const request = new Request(url).setBody({
      alertRequest: {
        action: [AlertRequestAction.Flash],
        delay: 0,
        duration: 1,
        override: [
          AlertRequestOverride.DoorOpen,
          AlertRequestOverride.IgnitionOn,
        ],
        ...options,
      },
    });

    return this.sendRequest(request);
  }

  async stopLights(): Promise<Result> {
    // Route to v1 API for ICE vehicles, v3 API for EV/Hybrid
    const isICE = await this.isICEVehicle();
    const url = isICE
      ? this.getV1CommandUrl("cancelAlert")
      : this.getApiUrlForPath(`cancelAlert/${this.config.vin}`);

    const request = new Request(url);

    return this.sendRequest(request);
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
    const { token: evToken, vehicleId: sessionVehicleId } =
      await this.initEVSessionToken(gmMobileToken);
    const vehicleId = sessionVehicleId!; // must come from initSession metrics

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

    const req = new Request(`${baseUrl}?${query.toString()}`)
      .setMethod(RequestMethod.Post)
      .setAuthRequired(false)
      .setContentType("application/x-www-form-urlencoded")
      .setHeaders({
        accept: "*/*",
        "x-gm-mobiletoken": gmMobileToken,
        "x-gm-token": evToken,
      })
      .setBody(bodyParams.toString())
      .setCheckRequestStatus(false); // EV API responds synchronously

    return this.sendRequest(req);
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
    const { token: evToken, vehicleId: sessionVehicleId } =
      await this.initEVSessionToken(gmMobileToken);
    const vehicleId = sessionVehicleId!;

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

    const req = new Request(`${baseUrl}?${query.toString()}`)
      .setMethod(RequestMethod.Post)
      .setAuthRequired(false)
      .setContentType("application/x-www-form-urlencoded")
      .setHeaders({
        accept: "*/*",
        "x-gm-mobiletoken": gmMobileToken,
        "x-gm-token": evToken,
      })
      .setBody(bodyParams.toString())
      .setCheckRequestStatus(false); // EV API responds synchronously

    return this.sendRequest(req);
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

  // Determine if vehicle is ICE (Internal Combustion Engine) or EV/Hybrid
  private async isICEVehicle(): Promise<boolean> {
    // If we've already cached the vehicle type in memory, use it
    if (this.cachedVehicleType !== undefined) {
      const isICE = this.cachedVehicleType !== "EV";
      console.log(
        `[isICEVehicle] Using memory cached vehicle type: ${this.cachedVehicleType} -> isICE: ${isICE}`,
      );
      return isICE;
    }

    // Try to load from disk cache
    const diskCachedType = this.loadVehicleTypeFromDisk();
    if (diskCachedType) {
      this.cachedVehicleType = diskCachedType;
      const isICE = diskCachedType !== "EV";
      console.log(
        `[isICEVehicle] Using disk cached vehicle type: ${diskCachedType} -> isICE: ${isICE}`,
      );
      return isICE;
    }

    try {
      // Get diagnostics data to determine engine type
      const diagnosticsResult = await this.diagnostics();
      const diagnostics = diagnosticsResult.response?.data;

      if (diagnostics?.diagnostics) {
        // Look for ENGINE_TYPE in nested diagnosticElements
        for (const diagnostic of diagnostics.diagnostics) {
          if (diagnostic.diagnosticElements) {
            const engineTypeElement = diagnostic.diagnosticElements.find(
              (el) => el.name === "ENGINE_TYPE",
            );
            if (engineTypeElement?.value) {
              const engineType = engineTypeElement.value;
              const isICE = engineType === "ICE";
              this.cachedVehicleType = isICE ? "ICE" : "EV";
              this.saveVehicleTypeToDisk(this.cachedVehicleType);
              console.log(
                `[isICEVehicle] Detected ENGINE_TYPE: ${engineType} -> isICE: ${isICE}`,
              );
              return isICE;
            }
          }
        }

        // Fallback: Look for fuel-related diagnostics (indicates ICE)
        // or battery/electric-related diagnostics (indicates EV/Hybrid)
        const hasFuelLevel = diagnostics.diagnostics.some(
          (d) => d.name === "FUEL LEVEL" || d.displayName?.includes("Fuel"),
        );
        const hasEVBattery = diagnostics.diagnostics.some(
          (d) =>
            d.name?.includes("EV_") ||
            d.displayName?.includes("Battery") ||
            d.displayName?.includes("Electric") ||
            d.name?.includes("CHARGE_LEVEL"),
        );

        if (hasEVBattery) {
          this.cachedVehicleType = "EV";
          this.saveVehicleTypeToDisk(this.cachedVehicleType);
          console.log(
            "[isICEVehicle] Detected EV/Hybrid vehicle from diagnostics -> isICE: false",
          );
          return false;
        } else if (hasFuelLevel) {
          this.cachedVehicleType = "ICE";
          this.saveVehicleTypeToDisk(this.cachedVehicleType);
          console.log(
            "[isICEVehicle] Detected ICE vehicle from diagnostics (has fuel level) -> isICE: true",
          );
          return true;
        }
      }
    } catch (error) {
      console.warn(
        "[isICEVehicle] Failed to determine vehicle type from diagnostics, defaulting to ICE (v1 API)",
        error,
      );
    }

    // Default to ICE (v1 API) if we can't determine vehicle type
    this.cachedVehicleType = "ICE";
    console.log(
      "[isICEVehicle] Could not determine vehicle type, defaulting to ICE (v1 API)",
    );
    return true;
  }

  // Get the path for the vehicle type cache file
  private getVehicleTypeCachePath(): string {
    const tokenLocation = this.config.tokenLocation ?? "./";
    return path.join(tokenLocation, `vehicle_type_${this.config.vin}.json`);
  }

  // Load vehicle type from disk cache
  private loadVehicleTypeFromDisk(): string | null {
    try {
      const cachePath = this.getVehicleTypeCachePath();
      if (fs.existsSync(cachePath)) {
        const data = fs.readFileSync(cachePath, "utf-8");
        const parsed = JSON.parse(data);
        if (parsed.vehicleType && parsed.vin === this.config.vin) {
          return parsed.vehicleType;
        }
      }
    } catch (error) {
      console.warn(
        "[loadVehicleTypeFromDisk] Failed to load vehicle type from disk",
        error,
      );
    }
    return null;
  }

  // Save vehicle type to disk cache
  private saveVehicleTypeToDisk(vehicleType: string): void {
    try {
      const cachePath = this.getVehicleTypeCachePath();
      const data = {
        vin: this.config.vin,
        vehicleType: vehicleType,
        cachedAt: new Date().toISOString(),
      };
      fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), "utf-8");
      console.log(
        `[saveVehicleTypeToDisk] Saved vehicle type ${vehicleType} to ${cachePath}`,
      );
    } catch (error) {
      console.warn(
        "[saveVehicleTypeToDisk] Failed to save vehicle type to disk",
        error,
      );
    }
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
      appversion: "myOwner-chevrolet-android-7.17.0-0",
      locale: "en-US",
      "content-type": request.getContentType(),
      "user-agent": onStarAppConfig.userAgent,
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
    return { token, vehicleId };
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
