import axios from "axios";

// import TokenHandler from "./TokenHandler";
import RequestService from "./RequestService";

import {
  OnStarConfig,
  Result,
  AlertRequestOptions,
  DoorRequestOptions,
  TrunkRequestOptions,
  StartRequestOptions,
  GarageVehiclesResponse,
  HealthStatusResponse,
  TypedResult,
} from "./types";

class OnStar {
  constructor(private requestService: RequestService) {}

  static create(config: OnStarConfig): OnStar {
    const requestService = new RequestService(config, axios);

    return new OnStar(requestService);
  }

  async getAccountVehicles(): Promise<GarageVehiclesResponse> {
    return this.requestService.getAccountVehicles();
  }

  async getVehicleDetails(vin?: string) {
    return this.requestService.getVehicleDetails(vin);
  }

  async getOnstarPlan(vin?: string) {
    return this.requestService.getOnstarPlan(vin);
  }

  async getVehicleRecallInfo(vin?: string) {
    return this.requestService.getVehicleRecallInfo(vin);
  }

  async getWarrantyInfo(vin?: string) {
    return this.requestService.getWarrantyInfo(vin);
  }

  async getSxmSubscriptionInfo(vin?: string) {
    return this.requestService.getSxmSubscriptionInfo(vin);
  }

  async start(options?: StartRequestOptions): Promise<Result> {
    return this.requestService.start(options);
  }

  async cancelStart(): Promise<Result> {
    return this.requestService.cancelStart();
  }

  async lockDoor(options?: DoorRequestOptions): Promise<Result> {
    return this.requestService.lockDoor(options);
  }

  async unlockDoor(options?: DoorRequestOptions): Promise<Result> {
    return this.requestService.unlockDoor(options);
  }

  async lockTrunk(options?: TrunkRequestOptions): Promise<Result> {
    return this.requestService.lockTrunk(options);
  }

  async unlockTrunk(options?: TrunkRequestOptions): Promise<Result> {
    return this.requestService.unlockTrunk(options);
  }

  async alert(options?: AlertRequestOptions): Promise<Result> {
    return this.requestService.alert(options);
  }

  async cancelAlert(): Promise<Result> {
    return this.requestService.cancelAlert();
  }

  async flashLights(options?: AlertRequestOptions): Promise<Result> {
    return this.requestService.flashLights(options || {});
  }

  async stopLights(): Promise<Result> {
    return this.requestService.stopLights();
  }

  // async chargeOverride(options?: ChargeOverrideOptions): Promise<Result> {
  //   return this.requestService.chargeOverride(options);
  // }

  // async getChargingProfile(): Promise<Result> {
  //   return this.requestService.getChargingProfile();
  // }

  // async setChargingProfile(
  //   options?: SetChargingProfileRequestOptions,
  // ): Promise<Result> {
  //   return this.requestService.setChargingProfile(options);
  // }

  async diagnostics(): Promise<TypedResult<HealthStatusResponse>> {
    return this.requestService.diagnostics();
  }

  async location(): Promise<Result> {
    return this.requestService.location();
  }

  // EV: Set target charge level percentage
  async setChargeLevelTarget(
    tcl: number,
    opts?: {
      noMetricsRefresh?: boolean;
      clientRequestId?: string;
      clientVersion?: string;
      os?: "A" | "I";
    },
  ): Promise<Result> {
    return this.requestService.setChargeLevelTarget(tcl, opts);
  }

  // EV: Stop charging session
  async stopCharging(opts?: {
    noMetricsRefresh?: boolean;
    clientRequestId?: string;
    clientVersion?: string;
    os?: "A" | "I";
  }): Promise<Result> {
    return this.requestService.stopCharging(opts);
  }

  // EV: Get current charging metrics
  async getEVChargingMetrics(opts?: {
    clientVersion?: string;
    os?: "A" | "I";
  }): Promise<Result> {
    return this.requestService.getEVChargingMetrics(opts);
  }

  // EV: Force-refresh and get live charging metrics
  async refreshEVChargingMetrics(opts?: {
    clientVersion?: string;
    os?: "A" | "I";
  }): Promise<Result> {
    return this.requestService.refreshEVChargingMetrics(opts);
  }

  setCheckRequestStatus(checkStatus: boolean) {
    this.requestService.setCheckRequestStatus(checkStatus);
  }
}

export default OnStar;
export * from "./types";
