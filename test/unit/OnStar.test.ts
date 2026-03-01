import { mock, instance, verify, when } from "ts-mockito";

import OnStar from "../../src/index";
import RequestService from "../../src/RequestService";
import { testConfig, authToken } from "./testData";
import { Result } from "../../src/types";

let onStar: OnStar;
let requestService: RequestService;

describe("OnStar", () => {
  beforeEach(() => {
    requestService = mock(RequestService);
    onStar = new OnStar(instance(requestService));
  });

  test("create", () => {
    expect(OnStar.create(testConfig)).toBeInstanceOf(OnStar);
  });

  test("start", async () => {
    await onStar.start();
  });

  test("cancelStart", async () => {
    await onStar.cancelStart();
  });

  test("lockDoor", async () => {
    await onStar.lockDoor();
  });

  test("unlockDoor", async () => {
    await onStar.unlockDoor();
  });

  test("alert", async () => {
    await onStar.alert();
  });

  test("cancelAlert", async () => {
    await onStar.cancelAlert();
  });

  test("flashLights", async () => {
    await onStar.flashLights();
  });

  test("flashLights with options", async () => {
    await onStar.flashLights({ delay: 5, duration: 2 });
  });

  test("stopLights", async () => {
    await onStar.stopLights();
  });

  test("setChargeLevelTarget", async () => {
    await onStar.setChargeLevelTarget(80);
  });

  test("setChargeLevelTarget with options", async () => {
    await onStar.setChargeLevelTarget(80, {
      noMetricsRefresh: true,
      clientRequestId: "test-123",
      clientVersion: "7.18.0.8006",
      os: "I",
    });
  });

  test("stopCharging", async () => {
    await onStar.stopCharging();
  });

  test("stopCharging with options", async () => {
    await onStar.stopCharging({
      noMetricsRefresh: false,
      clientRequestId: "test-456",
      clientVersion: "7.18.0.8006",
      os: "A",
    });
  });

  test("refreshEVChargingMetrics", async () => {
    await onStar.refreshEVChargingMetrics();
  });

  test.skip("chargeOverride (disabled)", async () => {
    // Charging APIs are currently disabled
  });

  test.skip("getChargingProfile (disabled)", async () => {
    // Charging APIs are currently disabled
  });

  test.skip("setChargingProfile (disabled)", async () => {
    // Charging APIs are currently disabled
  });

  test("diagnostics", async () => {
    await onStar.diagnostics();
  });

  test("getAccountVehicles", async () => {
    await onStar.getAccountVehicles();
  });

  test("lockTrunk", async () => {
    await onStar.lockTrunk();
  });

  test("unlockTrunk", async () => {
    await onStar.unlockTrunk();
  });

  test("location", async () => {
    const result: Result = { status: "success" };
    when(requestService.location()).thenResolve(result);

    const response = await onStar.location();

    expect(response).toEqual(result);
    verify(requestService.location()).once();
  });

  test("getWarrantyInfo", async () => {
    await onStar.getWarrantyInfo();
  });

  test("getSxmSubscriptionInfo", async () => {
    await onStar.getSxmSubscriptionInfo();
  });

  test("setCheckRequestStatus", () => {
    onStar.setCheckRequestStatus(true);

    verify(requestService.setCheckRequestStatus(true)).once();
  });
});
