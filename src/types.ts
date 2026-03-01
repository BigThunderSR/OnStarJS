export interface HttpClient {
  post(url: string, data: any, config: any): Promise<RequestResponse>;
  get(url: string, config: any): Promise<RequestResponse>;
}

export interface RequestResponse {
  data?:
    | string
    | {
        commandResponse?: CommandResponse;
      };
}

export interface OnStarConfig {
  deviceId: string;
  vin: string;
  username: string;
  password: string;
  onStarPin: string;
  onStarTOTP: string;
  tokenLocation?: string;
  checkRequestStatus?: boolean;
  requestPollingIntervalSeconds?: number;
  requestPollingTimeoutSeconds?: number;
  // Rate limit / 429 handling configuration (optional)
  max429Retries?: number; // default 3
  initial429DelayMs?: number; // default 1000
  backoffFactor?: number; // default 2
  jitterMs?: number; // default 250
  max429DelayMs?: number; // default 30000
  retryOn429ForPost?: boolean; // default false; only GET retried by default
}
export interface GMAuthConfig {
  deviceId: string;
  username: string;
  password: string;
  totpKey: string;
  tokenLocation?: string;
}

export interface OAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  onstar_account_info: OnStarAccountInfo;
  user_info: UserInfo;
  id_token: string;
  expiration: number;
  upgraded: boolean;
}

interface OnStarAccountInfo {
  country_code: string;
  account_no: string;
}

interface UserInfo {
  RemoteUserId: string;
  country: string;
}

export enum CommandResponseStatus {
  success = "success",
  failure = "failure",
  inProgress = "inProgress",
}

export interface CommandResponse {
  body?: CommandResponseBody;
  completionTime?: string;
  requestTime: string;
  status: CommandResponseStatus;
  type: string;
  url: string;
}

export interface CommandResponseBody {
  error?: object;
  diagnosticResponse?: DiagnosticResponseItem[];
}

export interface DiagnosticResponseItem {
  name: string;
  diagnosticElement: {
    name: string;
    status: string;
    message: string;
    value?: string;
    unit?: string;
  }[];
}

export interface Result {
  status: string;
  response?: RequestResponse;
  message?: string;
}

export enum AlertRequestAction {
  Honk = "Honk",
  Flash = "Flash",
}

export enum AlertRequestOverride {
  DoorOpen = "DoorOpen",
  IgnitionOn = "IgnitionOn",
}

export interface AlertRequestOptions {
  action?: AlertRequestAction[];
  delay?: number;
  duration?: number;
  override?: AlertRequestOverride[];
}

// DiagnosticsRequestOptions and DiagnosticRequestItem are no longer used

export enum ChargingProfileChargeMode {
  DefaultImmediate = "DEFAULT_IMMEDIATE",
  Immediate = "IMMEDIATE",
  DepartureBased = "DEPARTURE_BASED",
  RateBased = "RATE_BASED",
  PhevAfterMidnight = "PHEV_AFTER_MIDNIGHT",
}

export enum ChargingProfileRateType {
  Offpeak = "OFFPEAK",
  Midpeak = "MIDPEAK",
  Peak = "PEAK",
}

export interface SetChargingProfileRequestOptions {
  chargeMode?: ChargingProfileChargeMode;
  rateType?: ChargingProfileRateType;
}

export interface DoorRequestOptions {
  delay?: number;
}

export interface TrunkRequestOptions {
  delay?: number;
}

// Engine start options
export interface StartRequestOptions {
  // Target cabin temperature in Celsius; optional
  cabinTemperature?: number;
}

export enum ChargeOverrideMode {
  ChargeNow = "CHARGE_NOW",
  CancelOverride = "CANCEL_OVERRIDE",
}

export interface ChargeOverrideOptions {
  mode?: ChargeOverrideMode;
}

// v3 Garage GraphQL response types
export interface GarageVehicle {
  vin: string;
  vehicleId?: string;
  make?: string;
  model?: string;
  nickName?: string | null;
  year?: number | string;
  imageUrl?: string | null;
  onstarCapable?: boolean;
  vehicleType?: string | null;
  roleCode?: string | null;
  onstarStatusCode?: string | number | null;
  onstarAccountNumber?: string | null;
  preDelivery?: boolean | null;
  orderNum?: string | null;
  orderStatus?: string | null;
}

export interface GarageVehiclesResponse {
  errors?: any[];
  data: {
    vehicles: GarageVehicle[];
  };
  extensions?: any;
  dataPresent?: boolean;
}

// v3 Garage GraphQL vehicleDetails response types (keep flexible for now)
export interface VehicleDetailsResponse {
  errors?: any[];
  data: {
    vehicleDetails: any; // schema is large; keep as any for now
  };
  extensions?: any;
  dataPresent?: boolean;
}

// v3 Garage GraphQL plan info subset from vehicleDetails
export interface OnstarPlanResponse {
  errors?: any[];
  data: {
    vehicleDetails: any; // includes model/make/year, onstarInfo, offers, activePlans, orders, planExpiryInfo, and planInfo
  };
  extensions?: any;
  dataPresent?: boolean;
}

// v3 Garage GraphQL warranty info response
export interface WarrantyInfoResponse {
  errors?: any[];
  data: {
    vehicleDetails: {
      warrantyInfo: any[] | null;
      [k: string]: any;
    } | null;
  };
  extensions?: any;
  dataPresent?: boolean;
}

// v3 Garage GraphQL SXM subscription info response
export interface SxmSubscriptionInfoResponse {
  errors?: any[];
  data: {
    vehicleDetails: {
      sxmSubscriptionInfo: any | null;
      [k: string]: any;
    } | null;
  };
  extensions?: any;
  dataPresent?: boolean;
}

// v3 Garage GraphQL vehicle recall info response
export interface VehicleRecallInfoResponse {
  errors?: any[];
  data: {
    vehicleDetails: {
      recallInfo: any[] | null; // keeping flexible for now
      [k: string]: any;
    } | null;
  };
  extensions?: any;
  dataPresent?: boolean;
}

// Vehicle Health Status (v3 healthstatus) response types
export interface HealthStatusElement {
  name: string;
  displayName: string;
  description?: string | null;
  status?: string | null;
  statusColor?: string | null;
  value?: string | null;
  uom?: string | null;
  cts?: string | null; // ISO datetime
}

export interface HealthStatusDiagnostic extends HealthStatusElement {
  recommendedAction?: string | null;
  diagnosticElements: HealthStatusElement[];
}

export interface AdvDiagnosticsSubsystem {
  subSystemId: string;
  subSystemName: string;
  subSystemLabel?: string;
  subSystemDescription?: string;
  subSystemShortDesc?: string;
  subSystemStatus?: string;
  subSystemStatusColor?: string;
  dtcList: any[]; // Keeping loose until we have examples
}

export interface AdvDiagnosticsSystem {
  systemId: string;
  systemName: string;
  systemLabel?: string;
  systemDescription?: string;
  systemShortDesc?: string;
  systemStatus?: string;
  systemStatusColor?: string;
  subSystems: AdvDiagnosticsSubsystem[];
}

export interface AdvDiagnosticsBlock {
  name: string | null;
  displayName: string | null;
  advDiagnosticsStatus: string;
  advDiagnosticsStatusColor: string;
  recommendedAction: string;
  cts: string; // ISO datetime
  diagnosticSystems: AdvDiagnosticsSystem[];
}

export interface HealthStatusResponse {
  name: string;
  displayName: string;
  description?: string | null;
  status: string;
  statusColor: string;
  recommendedAction?: string | null;
  recommendedLiveProbe?: boolean;
  cts: string; // ISO datetime
  diagnostics: HealthStatusDiagnostic[];
  advDiagnostics?: AdvDiagnosticsBlock;
}

// Helper type to surface typed data payloads with our existing Result shape
export type TypedResult<T> = Result & {
  response?: {
    data?: T;
    // allow other fields if present, matching RequestResponse permissiveness
    [k: string]: any;
  };
};
