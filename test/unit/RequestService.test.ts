import RequestService from "../../src/RequestService";
import { testConfig, authToken, expiredAuthToken } from "./testData";
import { HttpClient, CommandResponseStatus } from "../../src/types";
import Request, { RequestMethod } from "../../src/Request";

describe("RequestService", () => {
  let requestService: RequestService;
  let httpClient: HttpClient;

  const commandResponseUrl = "requestCheckUrl";

  beforeEach(() => {
    const requestTime = Date.now() + 1000;

    httpClient = {
      post: jest
        .fn()
        .mockResolvedValue({
          data: {
            commandResponse: {
              requestTime,
              status: CommandResponseStatus.success,
              url: commandResponseUrl,
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            commandResponse: {
              requestTime,
              status: CommandResponseStatus.inProgress,
              url: commandResponseUrl,
            },
          },
        }),
      get: jest.fn().mockResolvedValue({
        data: {
          commandResponse: {
            requestTime,
            status: CommandResponseStatus.success,
            url: commandResponseUrl,
          },
        },
      }),
    };

    requestService = new RequestService(testConfig, httpClient)
      .setAuthToken(authToken)
      .setRequestPollingIntervalSeconds(0)
      .setRequestPollingTimeoutSeconds(0);

    // Mock getAuthToken to return a Promise that resolves to the mocked token
    jest
      .spyOn(requestService, "getAuthToken")
      .mockReturnValue(authToken as any);
  });

  test("start", async () => {
    const result = await requestService.start();

    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("cancelStart", async () => {
    const result = await requestService.cancelStart();

    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("lockDoor", async () => {
    const result = await requestService.lockDoor();

    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("unlockDoor", async () => {
    const result = await requestService.unlockDoor();

    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("lockTrunk", async () => {
    const result = await requestService.lockTrunk();

    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("unlockTrunk", async () => {
    const result = await requestService.unlockTrunk();

    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("alert", async () => {
    const result = await requestService.alert();

    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("cancelAlert", async () => {
    const result = await requestService.cancelAlert();

    expect(result.status).toEqual(CommandResponseStatus.success);
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
    const healthPayload = {
      name: "VEHICLE_STATUS",
      status: "GOOD",
      diagnostics: [],
    };
    httpClient.get = jest.fn().mockResolvedValue({ data: healthPayload });

    const result = await requestService.setClient(httpClient).diagnostics();

    expect(result.status).toEqual(CommandResponseStatus.success);
    expect(result.response?.data).toEqual(healthPayload);
    // Confirm URL used is healthstatus with VIN
    const urlCalled = (httpClient.get as jest.Mock).mock.calls[0][0];
    expect(urlCalled).toContain("/api/v1/vh/vehiclehealth/v1/healthstatus/");
    expect(urlCalled).toContain(testConfig.vin.toUpperCase());
  });

  test("getAccountVehicles", async () => {
    // Override post for this test to simulate GraphQL v3 response
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        errors: [],
        data: {
          vehicles: [
            {
              vin: "TESTVIN",
              vehicleId: "123",
              make: "Chevrolet",
              model: "Blazer EV",
              year: "2024",
            },
          ],
        },
        extensions: null,
        dataPresent: true,
      },
    });

    const data = await requestService
      .setClient(httpClient)
      .getAccountVehicles();

    expect(data).toHaveProperty("data.vehicles");
    expect(Array.isArray((data as any).data.vehicles)).toBe(true);
  });

  test("getVehicleDetails success", async () => {
    // Simulate GraphQL vehicleDetails response
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        errors: [],
        data: {
          vehicleDetails: {
            vin: testConfig.vin.toUpperCase(),
            make: "Chevrolet",
            model: "Blazer EV",
            year: "2024",
          },
        },
        extensions: null,
        dataPresent: true,
      },
    });

    const details = await requestService
      .setClient(httpClient)
      .getVehicleDetails();

    expect(details).toHaveProperty("data.vehicleDetails.vin");
    expect((details as any).data.vehicleDetails.vin).toBe(
      testConfig.vin.toUpperCase(),
    );
  });

  test("getVehicleDetails with errors in response", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        errors: [{ message: "GraphQL error" }],
        data: { vehicleDetails: null },
      },
    });

    await expect(
      requestService.setClient(httpClient).getVehicleDetails(),
    ).rejects.toThrow("getVehicleDetails GraphQL errors present");
  });

  test("getVehicleDetails with non-success status", async () => {
    const originalSendRequest = requestService["sendRequest"];
    requestService["sendRequest"] = jest.fn().mockResolvedValue({
      status: CommandResponseStatus.failure,
      response: { data: {} },
    });

    await expect(
      requestService.setClient(httpClient).getVehicleDetails(),
    ).rejects.toThrow("getVehicleDetails request did not succeed");

    requestService["sendRequest"] = originalSendRequest;
  });

  test("getOnstarPlan success", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        errors: [],
        data: {
          vehicleDetails: {
            model: "Blazer EV",
            make: "Chevrolet",
            year: "2024",
            planInfo: [],
          },
        },
        extensions: null,
        dataPresent: true,
      },
    });

    const data = await requestService.setClient(httpClient).getOnstarPlan();
    expect(data).toHaveProperty("data.vehicleDetails");
    expect(Array.isArray((data as any).data.vehicleDetails.planInfo)).toBe(
      true,
    );
  });

  test("getOnstarPlan with partial GraphQL errors returns data", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        errors: [{ message: "GraphQL error on offers" }],
        data: {
          vehicleDetails: {
            model: "Blazer EV",
            make: "Chevrolet",
            year: "2024",
            planInfo: [],
          },
        },
      },
    });

    const data = await requestService.setClient(httpClient).getOnstarPlan();
    expect(data).toHaveProperty("data.vehicleDetails");
  });

  test("getOnstarPlan with errors and no vehicleDetails throws", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        errors: [{ message: "GraphQL error" }],
        data: { vehicleDetails: null },
      },
    });

    await expect(
      requestService.setClient(httpClient).getOnstarPlan(),
    ).rejects.toThrow("getOnstarPlan GraphQL errors present");
  });

  test("getOnstarPlan with non-success status", async () => {
    const originalSendRequest = requestService["sendRequest"];
    requestService["sendRequest"] = jest.fn().mockResolvedValue({
      status: CommandResponseStatus.failure,
      response: { data: {} },
    });

    await expect(
      requestService.setClient(httpClient).getOnstarPlan(),
    ).rejects.toThrow("getOnstarPlan request did not succeed");

    requestService["sendRequest"] = originalSendRequest;
  });

  test("getVehicleRecallInfo success", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        errors: [],
        data: {
          vehicleDetails: {
            recallInfo: [
              {
                recallId: "N252503010",
                title: "Unintended Parking Brake Engagement",
                type: "ZPSR",
              },
            ],
          },
        },
        extensions: null,
        dataPresent: true,
      },
    });

    const data = await requestService
      .setClient(httpClient)
      .getVehicleRecallInfo();
    expect(data).toHaveProperty("data.vehicleDetails.recallInfo");
    expect(Array.isArray((data as any).data.vehicleDetails.recallInfo)).toBe(
      true,
    );
  });

  test("getVehicleRecallInfo with errors in response", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        errors: [{ message: "GraphQL error" }],
        data: { vehicleDetails: null },
      },
    });

    await expect(
      requestService.setClient(httpClient).getVehicleRecallInfo(),
    ).rejects.toThrow("getVehicleRecallInfo GraphQL errors present");
  });

  test("getVehicleRecallInfo with non-success status", async () => {
    const originalSendRequest = requestService["sendRequest"];
    requestService["sendRequest"] = jest.fn().mockResolvedValue({
      status: CommandResponseStatus.failure,
      response: { data: {} },
    });

    await expect(
      requestService.setClient(httpClient).getVehicleRecallInfo(),
    ).rejects.toThrow("getVehicleRecallInfo request did not succeed");

    requestService["sendRequest"] = originalSendRequest;
  });

  test("getWarrantyInfo success", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        errors: [],
        data: {
          vehicleDetails: {
            warrantyInfo: [
              {
                startMileage: 0,
                endMileage: 60000,
                startDate: "2023-01-01",
                expirationDate: "2028-01-01",
                typeDescription: "Powertrain Limited Warranty",
                status: "APPLICABLE",
                mileageUnit: "M",
                notes: "00000000000000000000",
              },
            ],
          },
        },
        extensions: null,
        dataPresent: true,
      },
    });

    const data = await requestService.setClient(httpClient).getWarrantyInfo();
    expect(data).toHaveProperty("data.vehicleDetails.warrantyInfo");
    expect(Array.isArray((data as any).data.vehicleDetails.warrantyInfo)).toBe(
      true,
    );
  });

  test("getWarrantyInfo with errors in response", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        errors: [{ message: "GraphQL error" }],
        data: { vehicleDetails: null },
      },
    });

    await expect(
      requestService.setClient(httpClient).getWarrantyInfo(),
    ).rejects.toThrow("getWarrantyInfo GraphQL errors present");
  });

  test("getWarrantyInfo with non-success status", async () => {
    const originalSendRequest = requestService["sendRequest"];
    requestService["sendRequest"] = jest.fn().mockResolvedValue({
      status: CommandResponseStatus.failure,
      response: { data: {} },
    });

    await expect(
      requestService.setClient(httpClient).getWarrantyInfo(),
    ).rejects.toThrow("getWarrantyInfo request did not succeed");

    requestService["sendRequest"] = originalSendRequest;
  });

  test("getSxmSubscriptionInfo success", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        errors: [],
        data: {
          vehicleDetails: {
            sxmSubscriptionInfo: {
              deviceId: "TESTDEV01",
              subscriptions: null,
              channelAccountInfo: {
                message: null,
                radioId: "TESTDEV01",
                marketType: null,
                packageName: null,
                expiryDate: null,
                phoneNumber: null,
              },
              is360Device: true,
              audioDeactDate: "2025-01-15T00:00:00Z",
              audioDeactType: "PRE-PAID_EXPIRED",
              suspended: null,
              status: "INACTIVE",
            },
          },
        },
        extensions: null,
        dataPresent: true,
      },
    });

    const data = await requestService
      .setClient(httpClient)
      .getSxmSubscriptionInfo();
    expect(data).toHaveProperty("data.vehicleDetails.sxmSubscriptionInfo");
    expect((data as any).data.vehicleDetails.sxmSubscriptionInfo.deviceId).toBe(
      "TESTDEV01",
    );
  });

  test("getSxmSubscriptionInfo with errors in response", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        errors: [{ message: "GraphQL error" }],
        data: { vehicleDetails: null },
      },
    });

    await expect(
      requestService.setClient(httpClient).getSxmSubscriptionInfo(),
    ).rejects.toThrow("getSxmSubscriptionInfo GraphQL errors present");
  });

  test("getSxmSubscriptionInfo with non-success status", async () => {
    const originalSendRequest = requestService["sendRequest"];
    requestService["sendRequest"] = jest.fn().mockResolvedValue({
      status: CommandResponseStatus.failure,
      response: { data: {} },
    });

    await expect(
      requestService.setClient(httpClient).getSxmSubscriptionInfo(),
    ).rejects.toThrow("getSxmSubscriptionInfo request did not succeed");

    requestService["sendRequest"] = originalSendRequest;
  });

  test("location", async () => {
    const result = await requestService.location();

    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("location triggers update then polls until ready", async () => {
    // First GET returns PENDING, second returns NONE
    const pendingPayload = {
      vehicle: { vin: testConfig.vin, squishVin: "SQUISH" },
      telemetry: {
        data: { session: { updatePending: "PENDING" } },
      },
    };
    const readyPayload = {
      vehicle: { vin: testConfig.vin, squishVin: "SQUISH" },
      telemetry: {
        data: {
          session: { updatePending: "NONE" },
          position: { lat: 1.23, lng: 4.56, geohash: "abc" },
        },
      },
    };

    httpClient.get = jest
      .fn()
      .mockResolvedValueOnce({ data: pendingPayload })
      .mockResolvedValueOnce({ data: readyPayload });

    // Ensure we actually poll: non-zero timeout, zero interval to avoid delays
    requestService
      .setClient(httpClient)
      .setRequestPollingTimeoutSeconds(5)
      .setRequestPollingIntervalSeconds(0);

    const result = await requestService.location();
    expect(result.status).toEqual(CommandResponseStatus.success);
    expect(
      (result.response as any)?.data?.telemetry?.data?.session?.updatePending,
    ).toEqual("NONE");

    // Validate we called sms=true then sms=false
    expect(
      (httpClient.get as jest.Mock).mock.calls.length,
    ).toBeGreaterThanOrEqual(2);
    const firstUrl = (httpClient.get as jest.Mock).mock.calls[0][0];
    const secondUrl = (httpClient.get as jest.Mock).mock.calls[1][0];
    expect(firstUrl).toContain("sms=true");
    expect(secondUrl).toContain("sms=false");
  });

  test("requestWithExpiredAuthToken", async () => {
    httpClient.post = jest
      .fn()
      .mockResolvedValue({
        data: {
          commandResponse: {
            requestTime: Date.now() + 1000,
            status: CommandResponseStatus.success,
            url: commandResponseUrl,
          },
        },
      })
      .mockResolvedValueOnce({
        data: "encodedToken",
      });

    requestService.setAuthToken(expiredAuthToken);

    const result = await requestService.setClient(httpClient).start();

    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("requestCheckExceedsTimeoutError", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        commandResponse: {
          requestTime: Date.now() - 1000,
          status: CommandResponseStatus.inProgress,
          url: commandResponseUrl,
        },
      },
    });

    await expect(requestService.setClient(httpClient).start()).rejects.toThrow(
      /^Command Timeout$/,
    );
  });

  test("requestStatusFailureError", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        commandResponse: {
          requestTime: Date.now() + 1000,
          status: "failure",
        },
      },
    });

    await expect(requestService.setClient(httpClient).start()).rejects.toThrow(
      /^Command Failure$/,
    );
  });

  test("axiosRequestResponseError", async () => {
    httpClient.post = jest.fn().mockRejectedValue({
      isAxiosError: true,
      response: {
        status: "400",
        statusText: "invalid_client",
        data: "data",
      },
      request: {
        body: "requestBody",
      },
    });

    await expect(requestService.setClient(httpClient).start()).rejects.toThrow(
      /^Request Failed with status 400 - invalid_client$/,
    );
  });

  test("axiosRequestNoResponseError", async () => {
    httpClient.post = jest.fn().mockRejectedValue({
      isAxiosError: true,
      request: {
        body: "requestBody",
      },
    });

    await expect(requestService.setClient(httpClient).start()).rejects.toThrow(
      /^No response$/,
    );
  });

  test("axiosRequestError", async () => {
    httpClient.post = jest.fn().mockRejectedValue({
      isAxiosError: true,
      message: "Test error",
    });

    await expect(requestService.setClient(httpClient).start()).rejects.toThrow(
      /^Test error$/,
    );
  });

  test("requestError", async () => {
    httpClient.post = jest.fn().mockRejectedValue(new Error("errorMessage"));

    await expect(requestService.setClient(httpClient).start()).rejects.toThrow(
      /^errorMessage$/,
    );
  });

  test("setClient", () => {
    const newHttpClient: HttpClient = {
      post: jest.fn(),
      get: jest.fn(),
    };

    requestService.setClient(newHttpClient);
    expect(requestService["client"]).toEqual(newHttpClient);
  });

  test("setAuthToken", () => {
    requestService.setAuthToken(expiredAuthToken);
    expect(requestService["authToken"]).toEqual(expiredAuthToken);
  });

  test("setRequestPollingTimeoutSeconds", () => {
    requestService.setRequestPollingTimeoutSeconds(120);
    expect(requestService["requestPollingTimeoutSeconds"]).toEqual(120);
  });

  test("setRequestPollingIntervalSeconds", () => {
    requestService.setRequestPollingIntervalSeconds(10);
    expect(requestService["requestPollingIntervalSeconds"]).toEqual(10);
  });

  test("setCheckRequestStatus", () => {
    requestService.setCheckRequestStatus(true);
    expect(requestService["checkRequestStatus"]).toEqual(true);
  });

  test("getAuthToken", async () => {
    const token = await requestService.getAuthToken();
    expect(token).toEqual(authToken);
  });

  test("sendRequest", async () => {
    const request = new Request("https://foo.bar");
    const result = await requestService["sendRequest"](request);
    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("sendRequest without commandResponse", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {},
    });

    const request = new Request("https://foo.bar");
    const result = await requestService
      .setClient(httpClient)
      ["sendRequest"](request);
    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("sendRequest with inProgress status and connect type", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        commandResponse: {
          requestTime: Date.now() + 1000,
          status: CommandResponseStatus.inProgress,
          url: commandResponseUrl,
          type: "connect",
        },
      },
    });

    const request = new Request("https://foo.bar");
    const result = await requestService
      .setClient(httpClient)
      ["sendRequest"](request);
    expect(result.status).toEqual(CommandResponseStatus.inProgress);
  });

  test("getHeaders without auth required", async () => {
    const request = new Request("https://foo.bar").setAuthRequired(false);
    const headers = await requestService["getHeaders"](request);
    expect(headers).not.toHaveProperty("Authorization");
  });

  // Removed legacy upgradeRequest test

  test("makeClientRequest with GET method", async () => {
    const request = new Request("https://foo.bar").setMethod(RequestMethod.Get);
    const response = await requestService["makeClientRequest"](request);
    expect(response).toHaveProperty("data");
  });

  test("makeClientRequest with POST method", async () => {
    const request = new Request("https://foo.bar").setMethod(
      RequestMethod.Post,
    );
    const response = await requestService["makeClientRequest"](request);
    expect(response).toHaveProperty("data");
  });

  // Removed legacy connect/upgrade token tests

  test("checkRequestPause", async () => {
    jest.useFakeTimers();
    const pausePromise = requestService["checkRequestPause"]();
    jest.advanceTimersByTime(1000);
    await expect(pausePromise).resolves.toBeUndefined();
    jest.useRealTimers();
  });

  test("start with cabinTemperature option", async () => {
    const result = await requestService.start({ cabinTemperature: 22.5 });
    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("flashLights", async () => {
    const result = await requestService.flashLights();
    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("flashLights with options", async () => {
    const result = await requestService.flashLights({
      delay: 5,
      duration: 2,
    });
    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("stopLights", async () => {
    const result = await requestService.stopLights();
    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("getAccountVehicles with errors in response", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        errors: [{ message: "GraphQL error" }],
        data: { vehicles: [] },
      },
    });

    await expect(
      requestService.setClient(httpClient).getAccountVehicles(),
    ).rejects.toThrow("getAccountVehicles GraphQL errors present");
  });

  test("getAccountVehicles with non-success status", async () => {
    // Mock sendRequest to return failure status
    const originalSendRequest = requestService["sendRequest"];
    requestService["sendRequest"] = jest.fn().mockResolvedValue({
      status: CommandResponseStatus.failure,
      response: { data: {} },
    });

    await expect(
      requestService.setClient(httpClient).getAccountVehicles(),
    ).rejects.toThrow("getAccountVehicles request did not succeed");

    // Restore original
    requestService["sendRequest"] = originalSendRequest;
  });

  test("setChargeLevelTarget with valid tcl", async () => {
    // Mock getAuthToken
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);

    // Mock initEVSessionToken
    jest.spyOn(requestService as any, "initEVSessionToken").mockResolvedValue({
      token: "ev-token",
      vehicleId: "vehicle-123",
    });

    httpClient.post = jest.fn().mockResolvedValue({
      data: { status: "success" },
    });

    const result = await requestService
      .setClient(httpClient)
      .setChargeLevelTarget(80);
    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("setChargeLevelTarget with all options", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    jest.spyOn(requestService as any, "initEVSessionToken").mockResolvedValue({
      token: "ev-token",
      vehicleId: "vehicle-123",
    });

    httpClient.post = jest.fn().mockResolvedValue({
      data: { status: "success" },
    });

    const result = await requestService
      .setClient(httpClient)
      .setChargeLevelTarget(75, {
        noMetricsRefresh: true,
        clientRequestId: "test-123",
        clientVersion: "7.18.0.8006",
        os: "I",
      });
    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("setChargeLevelTarget with invalid tcl (too low)", async () => {
    await expect(requestService.setChargeLevelTarget(0)).rejects.toThrow(
      "tcl must be a number between 1 and 100",
    );
  });

  test("setChargeLevelTarget with invalid tcl (too high)", async () => {
    await expect(requestService.setChargeLevelTarget(101)).rejects.toThrow(
      "tcl must be a number between 1 and 100",
    );
  });

  test("setChargeLevelTarget with invalid tcl (not finite)", async () => {
    await expect(requestService.setChargeLevelTarget(NaN)).rejects.toThrow(
      "tcl must be a number between 1 and 100",
    );
  });

  test("setChargeLevelTarget retries on EV auth error (401)", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    const ensureSpy = jest
      .spyOn(requestService as any, "ensureEVSession")
      .mockResolvedValueOnce({ token: "ev-token-1", vehicleId: "veh-1" })
      .mockResolvedValueOnce({ token: "ev-token-2", vehicleId: "veh-1" });
    const invalidateSpy = jest.spyOn(
      requestService as any,
      "invalidateEVSession",
    );

    const authErr = { response: { status: 401 } };
    httpClient.post = jest
      .fn()
      .mockRejectedValueOnce(authErr)
      .mockResolvedValueOnce({ data: { status: "success" } });

    const result = await requestService
      .setClient(httpClient)
      .setChargeLevelTarget(80);

    expect(result.status).toEqual(CommandResponseStatus.success);
    expect(httpClient.post).toHaveBeenCalledTimes(2);
    expect(ensureSpy).toHaveBeenCalledTimes(2);
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });

  test("setChargeLevelTarget retries on EV auth error (403)", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    jest
      .spyOn(requestService as any, "ensureEVSession")
      .mockResolvedValueOnce({ token: "ev-token-1", vehicleId: "veh-1" })
      .mockResolvedValueOnce({ token: "ev-token-2", vehicleId: "veh-1" });

    const authErr = { response: { status: 403 } };
    httpClient.post = jest
      .fn()
      .mockRejectedValueOnce(authErr)
      .mockResolvedValueOnce({ data: { status: "success" } });

    const result = await requestService
      .setClient(httpClient)
      .setChargeLevelTarget(75);

    expect(result.status).toEqual(CommandResponseStatus.success);
    expect(httpClient.post).toHaveBeenCalledTimes(2);
  });

  test("setChargeLevelTarget retries on auth message error", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    jest
      .spyOn(requestService as any, "ensureEVSession")
      .mockResolvedValueOnce({ token: "ev-token-1", vehicleId: "veh-1" })
      .mockResolvedValueOnce({ token: "ev-token-2", vehicleId: "veh-1" });

    const authErr = {
      response: { status: 400, data: { message: "Unauthorized access" } },
    };
    httpClient.post = jest
      .fn()
      .mockRejectedValueOnce(authErr)
      .mockResolvedValueOnce({ data: { status: "success" } });

    const result = await requestService
      .setClient(httpClient)
      .setChargeLevelTarget(90);

    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("setChargeLevelTarget throws non-EV auth errors", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    jest.spyOn(requestService as any, "ensureEVSession").mockResolvedValue({
      token: "ev-token",
      vehicleId: "vehicle-123",
    });

    const networkErr = new Error("Network timeout");
    httpClient.post = jest.fn().mockRejectedValue(networkErr);

    await expect(
      requestService.setClient(httpClient).setChargeLevelTarget(80),
    ).rejects.toThrow("Network timeout");
  });

  test("stopCharging", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    jest.spyOn(requestService as any, "initEVSessionToken").mockResolvedValue({
      token: "ev-token",
      vehicleId: "vehicle-123",
    });

    httpClient.post = jest.fn().mockResolvedValue({
      data: { status: "success" },
    });

    const result = await requestService.setClient(httpClient).stopCharging();
    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("stopCharging with options", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    jest.spyOn(requestService as any, "initEVSessionToken").mockResolvedValue({
      token: "ev-token",
      vehicleId: "vehicle-123",
    });

    httpClient.post = jest.fn().mockResolvedValue({
      data: { status: "success" },
    });

    const result = await requestService.setClient(httpClient).stopCharging({
      noMetricsRefresh: false,
      clientRequestId: "test-456",
      clientVersion: "7.18.0.8006",
      os: "A",
    });
    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("stopCharging retries on EV auth error (401)", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    const ensureSpy = jest
      .spyOn(requestService as any, "ensureEVSession")
      .mockResolvedValueOnce({ token: "ev-token-1", vehicleId: "veh-1" })
      .mockResolvedValueOnce({ token: "ev-token-2", vehicleId: "veh-1" });
    const invalidateSpy = jest.spyOn(
      requestService as any,
      "invalidateEVSession",
    );

    const authErr = { response: { status: 401 } };
    httpClient.post = jest
      .fn()
      .mockRejectedValueOnce(authErr)
      .mockResolvedValueOnce({ data: { status: "success" } });

    const result = await requestService.setClient(httpClient).stopCharging();

    expect(result.status).toEqual(CommandResponseStatus.success);
    expect(httpClient.post).toHaveBeenCalledTimes(2);
    expect(ensureSpy).toHaveBeenCalledTimes(2);
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });

  test("stopCharging retries on EV auth error (403)", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    jest
      .spyOn(requestService as any, "ensureEVSession")
      .mockResolvedValueOnce({ token: "ev-token-1", vehicleId: "veh-1" })
      .mockResolvedValueOnce({ token: "ev-token-2", vehicleId: "veh-1" });

    const authErr = { response: { status: 403 } };
    httpClient.post = jest
      .fn()
      .mockRejectedValueOnce(authErr)
      .mockResolvedValueOnce({ data: { status: "success" } });

    const result = await requestService.setClient(httpClient).stopCharging();
    expect(result.status).toEqual(CommandResponseStatus.success);
    expect(httpClient.post).toHaveBeenCalledTimes(2);
  });

  test("stopCharging retries on EV auth error (token message)", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    jest
      .spyOn(requestService as any, "ensureEVSession")
      .mockResolvedValueOnce({ token: "ev-token-1", vehicleId: "veh-1" })
      .mockResolvedValueOnce({ token: "ev-token-2", vehicleId: "veh-1" });

    const authErr = {
      response: { status: 400, data: { message: "Invalid token" } },
    };
    httpClient.post = jest
      .fn()
      .mockRejectedValueOnce(authErr)
      .mockResolvedValueOnce({ data: { status: "success" } });

    const result = await requestService.setClient(httpClient).stopCharging();
    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("stopCharging throws non-EV auth errors", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    jest.spyOn(requestService as any, "ensureEVSession").mockResolvedValue({
      token: "ev-token",
      vehicleId: "vehicle-123",
    });

    const networkErr = new Error("Network error");
    httpClient.post = jest.fn().mockRejectedValue(networkErr);

    await expect(
      requestService.setClient(httpClient).stopCharging(),
    ).rejects.toThrow("Network error");
  });

  test("stopCharging retries on axios-like 401 error", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    jest
      .spyOn(requestService as any, "ensureEVSession")
      .mockResolvedValueOnce({ token: "ev-token-1", vehicleId: "veh-1" })
      .mockResolvedValueOnce({ token: "ev-token-2", vehicleId: "veh-1" });

    // Axios-like error structure (without response.data)
    const authErr = {
      response: {
        status: 401,
      },
    };
    httpClient.post = jest
      .fn()
      .mockRejectedValueOnce(authErr)
      .mockResolvedValueOnce({ data: { status: "success" } });

    const result = await requestService.setClient(httpClient).stopCharging();
    expect(result.status).toEqual(CommandResponseStatus.success);
    expect(httpClient.post).toHaveBeenCalledTimes(2);
  });

  test("getEVChargingMetrics returns data and uses ensureEVSession", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    const ensureSpy = jest
      .spyOn(requestService as any, "ensureEVSession")
      .mockResolvedValue({ token: "ev-token", vehicleId: "vehicle-123" });

    const payload = {
      success: true,
      results: [
        {
          vehicleId: "vehicle-123",
          soc: 70,
          cstate: "UNCONNECTED",
        },
      ],
    };
    httpClient.get = jest.fn().mockResolvedValue({ data: payload });

    const result = await requestService
      .setClient(httpClient)
      .getEVChargingMetrics();

    expect(result.status).toEqual(CommandResponseStatus.success);
    expect(result.response?.data).toEqual(payload);
    expect(ensureSpy).toHaveBeenCalledTimes(1);
    const url = (httpClient.get as jest.Mock).mock.calls[0][0];
    expect(url).toContain("getVehicleChargingMetrics");
    expect(url).toContain("vehicleId=vehicle-123");
    expect(url).toContain(`vehicleVin=${testConfig.vin.toUpperCase()}`);
  });

  test("getEVChargingMetrics retries on 401 and refreshes EV session", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    const ensureSpy = jest
      .spyOn(requestService as any, "ensureEVSession")
      .mockResolvedValueOnce({ token: "ev-token-1", vehicleId: "veh-1" })
      .mockResolvedValueOnce({ token: "ev-token-2", vehicleId: "veh-1" });

    const authErr = { response: { status: 401 } };
    const successPayload = { success: true };
    httpClient.get = jest
      .fn()
      .mockRejectedValueOnce(authErr)
      .mockResolvedValueOnce({ data: successPayload });

    const result = await requestService
      .setClient(httpClient)
      .getEVChargingMetrics();

    expect(result.status).toEqual(CommandResponseStatus.success);
    expect(httpClient.get).toHaveBeenCalledTimes(2);
    expect(ensureSpy).toHaveBeenCalledTimes(2);
  });

  test("refreshEVChargingMetrics returns data (POST) and uses ensureEVSession", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    const ensureSpy = jest
      .spyOn(requestService as any, "ensureEVSession")
      .mockResolvedValue({ token: "ev-token", vehicleId: "vehicle-123" });

    const payload = {
      success: true,
      results: [
        {
          soc: 68.5,
          cstate: "UNCONNECTED",
          // fields present only in refresh query variant
          cpwr: null,
          ctype: null,
          dir: null,
          dop: null,
        },
      ],
    };
    httpClient.post = jest.fn().mockResolvedValue({ data: payload });

    const result = await requestService
      .setClient(httpClient)
      .refreshEVChargingMetrics();

    expect(result.status).toEqual(CommandResponseStatus.success);
    expect(result.response?.data).toEqual(payload);
    expect(ensureSpy).toHaveBeenCalledTimes(1);
    const url = (httpClient.post as jest.Mock).mock.calls[0][0];
    expect(url).toContain("performVehicleChargingMetricsQuery");
    expect(url).toContain(`vehicleVin=${testConfig.vin.toUpperCase()}`);
    const body = (httpClient.post as jest.Mock).mock.calls[0][1];
    expect(body).toContain("vehicleId=vehicle-123");
    expect(body).toContain("refreshTrigger=useEvVehicleTelemetry");
  });

  test("refreshEVChargingMetrics retries on EV auth error (401)", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    const ensureSpy = jest
      .spyOn(requestService as any, "ensureEVSession")
      .mockResolvedValueOnce({ token: "ev-token-1", vehicleId: "veh-1" })
      .mockResolvedValueOnce({ token: "ev-token-2", vehicleId: "veh-1" });
    const invalidateSpy = jest.spyOn(
      requestService as any,
      "invalidateEVSession",
    );

    const authErr = { response: { status: 401 } };
    httpClient.post = jest
      .fn()
      .mockRejectedValueOnce(authErr)
      .mockResolvedValueOnce({ data: { success: true } });

    const result = await requestService
      .setClient(httpClient)
      .refreshEVChargingMetrics();
    expect(result.status).toEqual(CommandResponseStatus.success);
    expect(httpClient.post).toHaveBeenCalledTimes(2);
    expect(ensureSpy).toHaveBeenCalledTimes(2);
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });

  test("refreshEVChargingMetrics throws non-auth errors", async () => {
    jest
      .spyOn(requestService, "getAuthToken")
      .mockResolvedValue({ access_token: "mock-token" } as any);
    jest.spyOn(requestService as any, "ensureEVSession").mockResolvedValue({
      token: "ev-token",
      vehicleId: "vehicle-123",
    });

    const networkErr = new Error("Network down");
    httpClient.post = jest.fn().mockRejectedValue(networkErr);

    await expect(
      requestService.setClient(httpClient).refreshEVChargingMetrics(),
    ).rejects.toThrow("Network down");
  });

  test("getValidEVSession returns cached token when not expired", () => {
    // @ts-ignore access private fields
    requestService["evSessionToken"] = "cached-ev";
    // @ts-ignore
    requestService["cachedVehicleId"] = "veh-xyz";
    // @ts-ignore
    requestService["evTokenExpiresAt"] = Date.now() + 60_000;

    const cached = (requestService as any)["getValidEVSession"]();
    expect(cached).toEqual({ token: "cached-ev", vehicleId: "veh-xyz" });
  });

  test("getValidEVSession returns null when expired or missing", () => {
    // missing
    // @ts-ignore
    requestService["evSessionToken"] = undefined;
    // @ts-ignore
    requestService["cachedVehicleId"] = undefined;
    expect((requestService as any)["getValidEVSession"]()).toBeNull();

    // present but expired
    // @ts-ignore
    requestService["evSessionToken"] = "token";
    // @ts-ignore
    requestService["cachedVehicleId"] = "veh";
    // @ts-ignore
    requestService["evTokenExpiresAt"] = Date.now() - 1;
    expect((requestService as any)["getValidEVSession"]()).toBeNull();
  });

  test("invalidateEVSession clears token and expiry but keeps vehicleId", () => {
    // @ts-ignore
    requestService["evSessionToken"] = "token";
    // @ts-ignore
    requestService["evTokenExpiresAt"] = Date.now() + 10000;
    // @ts-ignore
    requestService["cachedVehicleId"] = "veh-stable";

    (requestService as any)["invalidateEVSession"]();

    expect((requestService as any)["getValidEVSession"]()).toBeNull();
    // cachedVehicleId untouched
    // @ts-ignore
    expect(requestService["cachedVehicleId"]).toBe("veh-stable");
  });

  test("decodeJwtExpMs extracts exp from JWT payload", () => {
    // decodeJwtExpMs returns Ms now instead of Seconds
    const exp = Math.floor(Date.now()) + 3600000; // 1 hour from now in ms
    const payload = Buffer.from(JSON.stringify({ exp }), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const token = `x.${payload}.y`;
    const decoded = (requestService as any)["decodeJwtExpMs"](token);
    expect(decoded).toBe(exp);
  });

  test("ensureEVSession uses cached when valid and calls init when not", async () => {
    // Set a valid cached session
    // @ts-ignore
    requestService["evSessionToken"] = "cached-ev";
    // @ts-ignore
    requestService["cachedVehicleId"] = "veh-abc";
    // @ts-ignore
    requestService["evTokenExpiresAt"] = Date.now() + 60000;

    const initSpy = jest.spyOn(requestService as any, "initEVSessionToken");
    const cached = await (requestService as any)["ensureEVSession"](
      "gm-mobile",
    );
    expect(cached).toEqual({ token: "cached-ev", vehicleId: "veh-abc" });
    expect(initSpy).not.toHaveBeenCalled();

    // Now expire and ensure it fetches fresh
    // @ts-ignore
    requestService["evTokenExpiresAt"] = Date.now() - 1;
    initSpy.mockImplementationOnce(async () => {
      // Also set cachedVehicleId as done by real init
      // @ts-ignore
      requestService["cachedVehicleId"] = "veh-fresh";
      return { token: "fresh-ev", vehicleId: "veh-fresh" };
    });

    const fresh = await (requestService as any)["ensureEVSession"]("gm-mobile");
    expect(fresh).toEqual({ token: "fresh-ev", vehicleId: "veh-fresh" });
    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  test("initEVSessionToken success", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        results: [
          {
            loginResponse: { token: "ev-token-123" },
            getVehicleChargingMetricsResponse: { vehicleId: "vehicle-456" },
          },
        ],
      },
    });

    const result = await requestService
      .setClient(httpClient)
      ["initEVSessionToken"]("gm-token");
    expect(result.token).toEqual("ev-token-123");
    expect(result.vehicleId).toEqual("vehicle-456");
  });

  test("initEVSessionToken missing token", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        results: [
          {
            getVehicleChargingMetricsResponse: { vehicleId: "vehicle-456" },
          },
        ],
      },
    });

    await expect(
      requestService.setClient(httpClient)["initEVSessionToken"]("gm-token"),
    ).rejects.toThrow("Failed to initialize EV session token");
  });

  test("initEVSessionToken missing vehicleId", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        results: [
          {
            loginResponse: { token: "ev-token-123" },
          },
        ],
      },
    });

    await expect(
      requestService.setClient(httpClient)["initEVSessionToken"]("gm-token"),
    ).rejects.toThrow(
      "EV vehicleId not found in initSession metrics; cannot proceed",
    );
  });

  test("randomHex generates correct length", () => {
    const hex8 = requestService["randomHex"](8);
    expect(hex8).toHaveLength(8);
    expect(hex8).toMatch(/^[0-9a-f]{8}$/);

    const hex16 = requestService["randomHex"](16);
    expect(hex16).toHaveLength(16);
    expect(hex16).toMatch(/^[0-9a-f]{16}$/);
  });

  test("parseRetryAfter with number", () => {
    const result = requestService["parseRetryAfter"](5);
    expect(result).toEqual(5000);
  });

  test("parseRetryAfter with numeric string", () => {
    const result = requestService["parseRetryAfter"]("10");
    expect(result).toEqual(10000);
  });

  test("parseRetryAfter with date string", () => {
    const futureDate = new Date(Date.now() + 5000).toUTCString();
    const result = requestService["parseRetryAfter"](futureDate);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(5000);
  });

  test("parseRetryAfter with past date", () => {
    const pastDate = new Date(Date.now() - 5000).toUTCString();
    const result = requestService["parseRetryAfter"](pastDate);
    expect(result).toEqual(0);
  });

  test("parseRetryAfter with invalid value", () => {
    const result = requestService["parseRetryAfter"]("invalid");
    expect(result).toBeNull();
  });

  test("parseRetryAfter with null", () => {
    const result = requestService["parseRetryAfter"](null);
    expect(result).toBeNull();
  });

  test("mapCommandStatus with success", () => {
    expect(requestService["mapCommandStatus"]("success")).toEqual(
      CommandResponseStatus.success,
    );
    expect(requestService["mapCommandStatus"]("SUCCESS")).toEqual(
      CommandResponseStatus.success,
    );
    expect(requestService["mapCommandStatus"]("completed")).toEqual(
      CommandResponseStatus.success,
    );
    expect(requestService["mapCommandStatus"]("complete")).toEqual(
      CommandResponseStatus.success,
    );
  });

  test("mapCommandStatus with failure", () => {
    expect(requestService["mapCommandStatus"]("failure")).toEqual(
      CommandResponseStatus.failure,
    );
    expect(requestService["mapCommandStatus"]("FAILURE")).toEqual(
      CommandResponseStatus.failure,
    );
    expect(requestService["mapCommandStatus"]("failed")).toEqual(
      CommandResponseStatus.failure,
    );
    expect(requestService["mapCommandStatus"]("error")).toEqual(
      CommandResponseStatus.failure,
    );
  });

  test("mapCommandStatus with inProgress", () => {
    expect(requestService["mapCommandStatus"]("in_progress")).toEqual(
      CommandResponseStatus.inProgress,
    );
    expect(requestService["mapCommandStatus"]("IN_PROGRESS")).toEqual(
      CommandResponseStatus.inProgress,
    );
    expect(requestService["mapCommandStatus"]("pending")).toEqual(
      CommandResponseStatus.inProgress,
    );
  });

  test("mapCommandStatus with empty string", () => {
    expect(requestService["mapCommandStatus"]("")).toEqual(
      CommandResponseStatus.inProgress,
    );
  });

  test("ensureVehicleIdFromGarage with cached vehicleId", async () => {
    requestService["cachedVehicleId"] = "cached-123";
    const result = await requestService["ensureVehicleIdFromGarage"](
      testConfig.vin,
    );
    expect(result).toEqual("cached-123");
  });

  test("ensureVehicleIdFromGarage finds vehicleId", async () => {
    requestService["cachedVehicleId"] = undefined;
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        data: {
          vehicles: [
            { vin: testConfig.vin.toUpperCase(), vehicleId: "found-456" },
          ],
        },
      },
    });

    const result = await requestService
      .setClient(httpClient)
      ["ensureVehicleIdFromGarage"](testConfig.vin.toUpperCase());
    expect(result).toEqual("found-456");
    expect(requestService["cachedVehicleId"]).toEqual("found-456");
  });

  test("ensureVehicleIdFromGarage when vehicle not found", async () => {
    requestService["cachedVehicleId"] = undefined;
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        data: {
          vehicles: [{ vin: "DIFFERENTVIN", vehicleId: "other-789" }],
        },
      },
    });

    const result = await requestService
      .setClient(httpClient)
      ["ensureVehicleIdFromGarage"](testConfig.vin.toUpperCase());
    expect(result).toBeUndefined();
  });

  test("ensureVehicleIdFromGarage when getAccountVehicles throws", async () => {
    requestService["cachedVehicleId"] = undefined;
    httpClient.post = jest.fn().mockRejectedValue(new Error("API error"));

    const result = await requestService
      .setClient(httpClient)
      ["ensureVehicleIdFromGarage"](testConfig.vin.toUpperCase());
    expect(result).toBeUndefined();
  });

  test("delay helper function", async () => {
    const start = Date.now();
    await requestService["delay"](100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
  });

  test("sendRequest handles v3 response format with top-level fields", async () => {
    // V3 API returns requestId, status, url at top level (not nested in commandResponse)
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        requestId: "req-123",
        requestTime: new Date(Date.now() + 5000).toISOString(),
        status: "SUCCESS",
        url: "https://check-url.com",
      },
    });

    const request = new Request("https://foo.bar")
      .setMethod(RequestMethod.Post)
      .setCheckRequestStatus(true);

    const result = await requestService
      .setClient(httpClient)
      ["sendRequest"](request);

    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("sendRequest handles v3 response with IN_PROGRESS status", async () => {
    const futureTime = new Date(Date.now() + 5000).toISOString();

    // First call returns IN_PROGRESS, second returns SUCCESS
    httpClient.post = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          requestId: "req-456",
          requestTime: futureTime,
          status: "IN_PROGRESS",
          url: "https://check-url.com",
        },
      })
      .mockResolvedValueOnce({
        data: {
          requestId: "req-456",
          requestTime: futureTime,
          status: "SUCCESS",
          url: "https://check-url.com",
        },
      });

    httpClient.get = jest.fn().mockResolvedValue({
      data: {
        requestId: "req-456",
        requestTime: futureTime,
        status: "SUCCESS",
        url: "https://check-url.com",
      },
    });

    const request = new Request("https://foo.bar")
      .setMethod(RequestMethod.Post)
      .setCheckRequestStatus(true);

    const result = await requestService
      .setClient(httpClient)
      .setRequestPollingIntervalSeconds(0)
      ["sendRequest"](request);

    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("sendRequest with v3 FAILURE status", async () => {
    httpClient.post = jest.fn().mockResolvedValue({
      data: {
        requestId: "req-789",
        requestTime: new Date(Date.now() + 5000).toISOString(),
        status: "FAILURE",
        url: "https://check-url.com",
      },
    });

    const request = new Request("https://foo.bar")
      .setMethod(RequestMethod.Post)
      .setCheckRequestStatus(true);

    await expect(
      requestService.setClient(httpClient)["sendRequest"](request),
    ).rejects.toThrow("Command Failure");
  });

  test("429 retry with Retry-After header (numeric)", async () => {
    const error429 = {
      isAxiosError: true,
      response: {
        status: 429,
        statusText: "Too Many Requests",
        headers: {
          "retry-after": "2",
        },
        data: "Rate limited",
      },
      request: {},
    };

    // First call fails with 429, second succeeds
    httpClient.get = jest
      .fn()
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce({
        data: {
          commandResponse: {
            requestTime: Date.now() + 1000,
            status: CommandResponseStatus.success,
            url: commandResponseUrl,
          },
        },
      });

    const request = new Request("https://foo.bar")
      .setMethod(RequestMethod.Get)
      .setCheckRequestStatus(false);

    const result = await requestService
      .setClient(httpClient)
      ["sendRequest"](request);

    expect(result.status).toEqual(CommandResponseStatus.success);
    expect(httpClient.get).toHaveBeenCalledTimes(2);
  });

  test("429 retry with Retry-After header (HTTP date)", async () => {
    const futureDate = new Date(Date.now() + 3000);
    const error429 = {
      isAxiosError: true,
      response: {
        status: 429,
        statusText: "Too Many Requests",
        headers: {
          "Retry-After": futureDate.toUTCString(),
        },
        data: "Rate limited",
      },
      request: {},
    };

    httpClient.get = jest
      .fn()
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce({
        data: {
          commandResponse: {
            requestTime: Date.now() + 1000,
            status: CommandResponseStatus.success,
            url: commandResponseUrl,
          },
        },
      });

    const request = new Request("https://foo.bar")
      .setMethod(RequestMethod.Get)
      .setCheckRequestStatus(false);

    const result = await requestService
      .setClient(httpClient)
      ["sendRequest"](request);

    expect(result.status).toEqual(CommandResponseStatus.success);
  });

  test("429 with POST and retryOn429ForPost enabled", async () => {
    const configWithRetry = {
      ...testConfig,
      retryOn429ForPost: true,
      initial429DelayMs: 100,
      max429Retries: 2,
    };

    const requestServiceWithRetry = new RequestService(
      configWithRetry,
      httpClient,
    )
      .setAuthToken(authToken)
      .setRequestPollingIntervalSeconds(0);

    jest
      .spyOn(requestServiceWithRetry, "getAuthToken")
      .mockResolvedValue(authToken as any);

    const error429 = {
      isAxiosError: true,
      response: {
        status: 429,
        statusText: "Too Many Requests",
        data: "Rate limited",
      },
      request: {},
    };

    httpClient.post = jest
      .fn()
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce({
        data: {
          commandResponse: {
            requestTime: Date.now() + 1000,
            status: CommandResponseStatus.success,
            url: commandResponseUrl,
          },
        },
      });

    const request = new Request("https://foo.bar")
      .setMethod(RequestMethod.Post)
      .setCheckRequestStatus(false);

    const result = await requestServiceWithRetry["sendRequest"](request);

    expect(result.status).toEqual(CommandResponseStatus.success);
    expect(httpClient.post).toHaveBeenCalledTimes(2);
  });

  test("429 exceeds max retries", async () => {
    // Use a very short delay to speed up the test
    const configWithShortDelay = {
      ...testConfig,
      initial429DelayMs: 1,
      max429Retries: 2,
    };

    const fastRequestService = new RequestService(
      configWithShortDelay,
      httpClient,
    )
      .setAuthToken(authToken)
      .setRequestPollingIntervalSeconds(0);

    jest
      .spyOn(fastRequestService, "getAuthToken")
      .mockResolvedValue(authToken as any);

    const error429 = {
      isAxiosError: true,
      response: {
        status: 429,
        statusText: "Too Many Requests",
        data: "Rate limited",
      },
      request: {},
    };

    // Always return 429
    httpClient.get = jest.fn().mockRejectedValue(error429);

    const request = new Request("https://foo.bar")
      .setMethod(RequestMethod.Get)
      .setCheckRequestStatus(false);

    await expect(
      fastRequestService.setClient(httpClient)["sendRequest"](request),
    ).rejects.toThrow("Request Failed with status 429");

    // Should have tried max retries (2) + 1 initial attempt = 3 total
    expect(httpClient.get).toHaveBeenCalledTimes(3);
  });

  test("429 with POST without retry enabled (default)", async () => {
    const error429 = {
      isAxiosError: true,
      response: {
        status: 429,
        statusText: "Too Many Requests",
        data: "Rate limited",
      },
      request: {},
    };

    httpClient.post = jest.fn().mockRejectedValue(error429);

    const request = new Request("https://foo.bar")
      .setMethod(RequestMethod.Post)
      .setCheckRequestStatus(false);

    await expect(
      requestService.setClient(httpClient)["sendRequest"](request),
    ).rejects.toThrow("Request Failed with status 429");

    // Should only try once (no retry for POST by default)
    expect(httpClient.post).toHaveBeenCalledTimes(1);
  });

  // Tests for automatic v3→v1 API fallback mechanism
  describe("Action Commands API Fallback", () => {
    beforeEach(() => {
      // Clear any cached API version before each test
      requestService["cachedActionCommandApiVersion"] = undefined;
    });

    describe("Fallback Detection", () => {
      test("shouldFallbackToV1 returns true for 400 status in response data", () => {
        const error = new (require("../../src/RequestError").default)(
          "Test error",
        );
        error.setResponse({ data: { status: 400 } });

        const result = requestService["shouldFallbackToV1"](error);
        expect(result).toBe(true);
      });

      test("shouldFallbackToV1 returns true for 400 statusCode in response data", () => {
        const error = new (require("../../src/RequestError").default)(
          "Test error",
        );
        error.setResponse({ data: { statusCode: 400 } });

        const result = requestService["shouldFallbackToV1"](error);
        expect(result).toBe(true);
      });

      test("shouldFallbackToV1 returns true for Bad Request message", () => {
        const error = new (require("../../src/RequestError").default)(
          "Test error",
        );
        error.setResponse({
          data: { message: "Bad Request: Invalid command" },
        });

        const result = requestService["shouldFallbackToV1"](error);
        expect(result).toBe(true);
      });

      test("shouldFallbackToV1 returns true for not supported message", () => {
        const error = new (require("../../src/RequestError").default)(
          "Test error",
        );
        error.setResponse({
          data: { error: "Command not supported for this vehicle" },
        });

        const result = requestService["shouldFallbackToV1"](error);
        expect(result).toBe(true);
      });

      test("shouldFallbackToV1 returns true for axios-style 400 error", () => {
        const error = { response: { status: 400 } };

        const result = requestService["shouldFallbackToV1"](error);
        expect(result).toBe(true);
      });

      test("shouldFallbackToV1 returns false for network errors", () => {
        const error = new Error("Network error");

        const result = requestService["shouldFallbackToV1"](error);
        expect(result).toBe(false);
      });

      test("shouldFallbackToV1 returns false for 500 server errors", () => {
        const error = new (require("../../src/RequestError").default)(
          "Server error",
        );
        error.setResponse({ data: { status: 500 } });

        const result = requestService["shouldFallbackToV1"](error);
        expect(result).toBe(false);
      });

      test("shouldFallbackToV1 returns false for timeout errors", () => {
        const error = new (require("../../src/RequestError").default)(
          "Timeout",
        );

        const result = requestService["shouldFallbackToV1"](error);
        expect(result).toBe(false);
      });
    });

    describe("Fallback Behavior for alert()", () => {
      test("alert() tries v3 first and succeeds without fallback", async () => {
        const requestTime = Date.now() + 1000;
        httpClient.post = jest.fn().mockResolvedValue({
          data: {
            requestId: "test-123",
            requestTime: new Date(requestTime).toISOString(),
            status: "SUCCESS",
            url: "test-url",
          },
        });

        await requestService.alert();

        // Should only call v3 API once
        expect(httpClient.post).toHaveBeenCalledTimes(1);
        const postCall = (httpClient.post as jest.Mock).mock.calls[0];
        expect(postCall[0]).toContain("/veh/cmd/v3/alert/");

        // Should cache v3 as the working version
        expect(requestService["cachedActionCommandApiVersion"]).toBe("v3");
      });

      test("alert() falls back to v1 when v3 returns 400", async () => {
        const requestTime = Date.now() + 1000;

        // First call (v3) fails with 400
        const v3Error = new (require("../../src/RequestError").default)(
          "Bad Request",
        );
        v3Error.setResponse({ data: { status: 400, message: "Bad Request" } });

        // Second call (v1) succeeds
        const v1Success = {
          data: {
            commandResponse: {
              requestTime: new Date(requestTime).toISOString(),
              status: CommandResponseStatus.success,
              url: "test-url",
            },
          },
        };

        httpClient.post = jest
          .fn()
          .mockRejectedValueOnce(v3Error) // v3 fails
          .mockResolvedValueOnce(v1Success); // v1 succeeds

        const result = await requestService.alert();

        // Should try both v3 and v1
        expect(httpClient.post).toHaveBeenCalledTimes(2);

        // First call should be v3
        const firstCall = (httpClient.post as jest.Mock).mock.calls[0];
        expect(firstCall[0]).toContain("/veh/cmd/v3/alert/");

        // Second call should be v1
        const secondCall = (httpClient.post as jest.Mock).mock.calls[1];
        expect(secondCall[0]).toContain("/api/v1/account/vehicles/");
        expect(secondCall[0]).toContain("/commands/alert");

        // Should cache v1 as the working version
        expect(requestService["cachedActionCommandApiVersion"]).toBe("v1");
        expect(result.status).toBe("success");
      });

      test("alert() uses cached v1 API on subsequent calls", async () => {
        const requestTime = Date.now() + 1000;

        // Set cache to indicate v1 works
        requestService["cachedActionCommandApiVersion"] = "v1";

        httpClient.post = jest.fn().mockResolvedValue({
          data: {
            commandResponse: {
              requestTime: new Date(requestTime).toISOString(),
              status: CommandResponseStatus.success,
              url: "test-url",
            },
          },
        });

        await requestService.alert();

        // Should only call v1 API, skipping v3 attempt
        expect(httpClient.post).toHaveBeenCalledTimes(1);
        const postCall = (httpClient.post as jest.Mock).mock.calls[0];
        expect(postCall[0]).toContain("/api/v1/account/vehicles/");
        expect(postCall[0]).toContain("/commands/alert");
      });

      test("alert() throws error when both v3 and v1 fail", async () => {
        const v3Error = new (require("../../src/RequestError").default)(
          "V3 Bad Request",
        );
        v3Error.setResponse({ data: { status: 400 } });

        const v1Error = new (require("../../src/RequestError").default)(
          "V1 Error",
        );

        httpClient.post = jest
          .fn()
          .mockRejectedValueOnce(v3Error)
          .mockRejectedValueOnce(v1Error);

        // Should throw the original v3 error
        await expect(requestService.alert()).rejects.toThrow("V3 Bad Request");
      });

      test("alert() does not fallback for non-400 errors", async () => {
        const serverError = new (require("../../src/RequestError").default)(
          "Server Error",
        );
        serverError.setResponse({ data: { status: 500 } });

        httpClient.post = jest.fn().mockRejectedValue(serverError);

        // Should not attempt fallback for 500 error
        await expect(requestService.alert()).rejects.toThrow("Server Error");
        expect(httpClient.post).toHaveBeenCalledTimes(1);
      });
    });

    describe("Fallback Behavior for start()", () => {
      test("start() falls back to v1 when v3 fails", async () => {
        const requestTime = Date.now() + 1000;

        const v3Error = new (require("../../src/RequestError").default)(
          "Bad Request",
        );
        v3Error.setResponse({ data: { status: 400 } });

        httpClient.post = jest
          .fn()
          .mockRejectedValueOnce(v3Error)
          .mockResolvedValueOnce({
            data: {
              commandResponse: {
                requestTime: new Date(requestTime).toISOString(),
                status: CommandResponseStatus.success,
                url: "test-url",
              },
            },
          });

        await requestService.start();

        expect(httpClient.post).toHaveBeenCalledTimes(2);

        const secondCall = (httpClient.post as jest.Mock).mock.calls[1];
        expect(secondCall[0]).toContain("/api/v1/account/vehicles/");
        expect(secondCall[0]).toContain("/commands/start");
      });

      test("start() passes cabin temperature to both APIs", async () => {
        const requestTime = Date.now() + 1000;

        const v3Error = new (require("../../src/RequestError").default)(
          "Bad Request",
        );
        v3Error.setResponse({ data: { status: 400 } });

        httpClient.post = jest
          .fn()
          .mockRejectedValueOnce(v3Error)
          .mockResolvedValueOnce({
            data: {
              commandResponse: {
                requestTime: new Date(requestTime).toISOString(),
                status: CommandResponseStatus.success,
                url: "test-url",
              },
            },
          });

        await requestService.start({ cabinTemperature: 22.5 });

        // Check v3 call included temperature (body is JSON stringified)
        const v3Call = (httpClient.post as jest.Mock).mock.calls[0];
        expect(JSON.parse(v3Call[1])).toEqual({ cabinTemperature: 23 }); // Rounded

        // Check v1 call included temperature (body is JSON stringified)
        const v1Call = (httpClient.post as jest.Mock).mock.calls[1];
        expect(JSON.parse(v1Call[1])).toEqual({ cabinTemperature: 23 });
      });
    });

    describe("Fallback Behavior for lock/unlock commands", () => {
      test("lockDoor() falls back to v1 when v3 fails", async () => {
        const requestTime = Date.now() + 1000;

        const v3Error = new (require("../../src/RequestError").default)(
          "Bad Request",
        );
        v3Error.setResponse({ data: { status: 400 } });

        httpClient.post = jest
          .fn()
          .mockRejectedValueOnce(v3Error)
          .mockResolvedValueOnce({
            data: {
              commandResponse: {
                requestTime: new Date(requestTime).toISOString(),
                status: CommandResponseStatus.success,
                url: "test-url",
              },
            },
          });

        await requestService.lockDoor();

        const secondCall = (httpClient.post as jest.Mock).mock.calls[1];
        expect(secondCall[0]).toContain("/api/v1/account/vehicles/");
        expect(secondCall[0]).toContain("/commands/lock");
      });

      test("unlockDoor() falls back to v1 when v3 fails", async () => {
        const requestTime = Date.now() + 1000;

        const v3Error = new (require("../../src/RequestError").default)(
          "Bad Request",
        );
        v3Error.setResponse({ data: { status: 400 } });

        httpClient.post = jest
          .fn()
          .mockRejectedValueOnce(v3Error)
          .mockResolvedValueOnce({
            data: {
              commandResponse: {
                requestTime: new Date(requestTime).toISOString(),
                status: CommandResponseStatus.success,
                url: "test-url",
              },
            },
          });

        await requestService.unlockDoor();

        const secondCall = (httpClient.post as jest.Mock).mock.calls[1];
        expect(secondCall[0]).toContain("/api/v1/account/vehicles/");
        expect(secondCall[0]).toContain("/commands/unlock");
      });

      test("lockTrunk() falls back to v1 when v3 fails", async () => {
        const requestTime = Date.now() + 1000;

        const v3Error = new (require("../../src/RequestError").default)(
          "Bad Request",
        );
        v3Error.setResponse({ data: { status: 400 } });

        httpClient.post = jest
          .fn()
          .mockRejectedValueOnce(v3Error)
          .mockResolvedValueOnce({
            data: {
              commandResponse: {
                requestTime: new Date(requestTime).toISOString(),
                status: CommandResponseStatus.success,
                url: "test-url",
              },
            },
          });

        await requestService.lockTrunk();

        const secondCall = (httpClient.post as jest.Mock).mock.calls[1];
        expect(secondCall[0]).toContain("/api/v1/account/vehicles/");
        expect(secondCall[0]).toContain("/commands/lockTrunk");
      });

      test("unlockTrunk() falls back to v1 when v3 fails", async () => {
        const requestTime = Date.now() + 1000;

        const v3Error = new (require("../../src/RequestError").default)(
          "Bad Request",
        );
        v3Error.setResponse({ data: { status: 400 } });

        httpClient.post = jest
          .fn()
          .mockRejectedValueOnce(v3Error)
          .mockResolvedValueOnce({
            data: {
              commandResponse: {
                requestTime: new Date(requestTime).toISOString(),
                status: CommandResponseStatus.success,
                url: "test-url",
              },
            },
          });

        await requestService.unlockTrunk();

        const secondCall = (httpClient.post as jest.Mock).mock.calls[1];
        expect(secondCall[0]).toContain("/api/v1/account/vehicles/");
        expect(secondCall[0]).toContain("/commands/unlockTrunk");
      });
    });

    describe("Fallback Behavior for flashLights/cancelAlert/stopLights", () => {
      test("flashLights() falls back to v1 when v3 fails", async () => {
        const requestTime = Date.now() + 1000;

        const v3Error = new (require("../../src/RequestError").default)(
          "Bad Request",
        );
        v3Error.setResponse({ data: { status: 400 } });

        httpClient.post = jest
          .fn()
          .mockRejectedValueOnce(v3Error)
          .mockResolvedValueOnce({
            data: {
              commandResponse: {
                requestTime: new Date(requestTime).toISOString(),
                status: CommandResponseStatus.success,
                url: "test-url",
              },
            },
          });

        await requestService.flashLights();

        const secondCall = (httpClient.post as jest.Mock).mock.calls[1];
        expect(secondCall[0]).toContain("/api/v1/account/vehicles/");
        expect(secondCall[0]).toContain("/commands/alert");
      });

      test("cancelAlert() falls back to v1 when v3 fails", async () => {
        const requestTime = Date.now() + 1000;

        const v3Error = new (require("../../src/RequestError").default)(
          "Bad Request",
        );
        v3Error.setResponse({ data: { status: 400 } });

        httpClient.post = jest
          .fn()
          .mockRejectedValueOnce(v3Error)
          .mockResolvedValueOnce({
            data: {
              commandResponse: {
                requestTime: new Date(requestTime).toISOString(),
                status: CommandResponseStatus.success,
                url: "test-url",
              },
            },
          });

        await requestService.cancelAlert();

        const secondCall = (httpClient.post as jest.Mock).mock.calls[1];
        expect(secondCall[0]).toContain("/api/v1/account/vehicles/");
        expect(secondCall[0]).toContain("/commands/cancelAlert");
      });

      test("stopLights() falls back to v1 when v3 fails", async () => {
        const requestTime = Date.now() + 1000;

        const v3Error = new (require("../../src/RequestError").default)(
          "Bad Request",
        );
        v3Error.setResponse({ data: { status: 400 } });

        httpClient.post = jest
          .fn()
          .mockRejectedValueOnce(v3Error)
          .mockResolvedValueOnce({
            data: {
              commandResponse: {
                requestTime: new Date(requestTime).toISOString(),
                status: CommandResponseStatus.success,
                url: "test-url",
              },
            },
          });

        await requestService.stopLights();

        const secondCall = (httpClient.post as jest.Mock).mock.calls[1];
        expect(secondCall[0]).toContain("/api/v1/account/vehicles/");
        expect(secondCall[0]).toContain("/commands/cancelAlert");
      });

      test("cancelStart() falls back to v1 when v3 fails", async () => {
        const requestTime = Date.now() + 1000;

        const v3Error = new (require("../../src/RequestError").default)(
          "Bad Request",
        );
        v3Error.setResponse({ data: { status: 400 } });

        httpClient.post = jest
          .fn()
          .mockRejectedValueOnce(v3Error)
          .mockResolvedValueOnce({
            data: {
              commandResponse: {
                requestTime: new Date(requestTime).toISOString(),
                status: CommandResponseStatus.success,
                url: "test-url",
              },
            },
          });

        await requestService.cancelStart();

        const secondCall = (httpClient.post as jest.Mock).mock.calls[1];
        expect(secondCall[0]).toContain("/api/v1/account/vehicles/");
        expect(secondCall[0]).toContain("/commands/cancelStart");
      });
    });

    describe("Cache Sharing Across Commands", () => {
      test("successful v3 for one command benefits other commands", async () => {
        const requestTime = Date.now() + 1000;

        // Mock successful v3 response
        httpClient.post = jest.fn().mockResolvedValue({
          data: {
            requestId: "test-123",
            requestTime: new Date(requestTime).toISOString(),
            status: "SUCCESS",
            url: "test-url",
          },
        });

        // First command succeeds with v3
        await requestService.alert();
        expect(httpClient.post).toHaveBeenCalledTimes(1);
        expect(requestService["cachedActionCommandApiVersion"]).toBe("v3");

        // Second command should also use v3 without trying v1
        await requestService.flashLights();
        expect(httpClient.post).toHaveBeenCalledTimes(2);

        const secondCall = (httpClient.post as jest.Mock).mock.calls[1];
        expect(secondCall[0]).toContain("/veh/cmd/v3/alert/");
      });

      test("successful v1 fallback for one command benefits other commands", async () => {
        const requestTime = Date.now() + 1000;

        const v3Error = new (require("../../src/RequestError").default)(
          "Bad Request",
        );
        v3Error.setResponse({ data: { status: 400 } });

        // First command: v3 fails, v1 succeeds
        httpClient.post = jest
          .fn()
          .mockRejectedValueOnce(v3Error)
          .mockResolvedValue({
            data: {
              commandResponse: {
                requestTime: new Date(requestTime).toISOString(),
                status: CommandResponseStatus.success,
                url: "test-url",
              },
            },
          });

        await requestService.lockDoor();
        expect(httpClient.post).toHaveBeenCalledTimes(2); // v3 fail + v1 success
        expect(requestService["cachedActionCommandApiVersion"]).toBe("v1");

        // Second command should skip v3 and go straight to v1
        await requestService.unlockDoor();
        expect(httpClient.post).toHaveBeenCalledTimes(3); // Only one more call

        const thirdCall = (httpClient.post as jest.Mock).mock.calls[2];
        expect(thirdCall[0]).toContain("/api/v1/account/vehicles/");
        expect(thirdCall[0]).toContain("/commands/unlock");
      });
    });
  });

  describe("Additional Coverage Tests", () => {
    test("getAuthToken throws error when VIN is not authorized", async () => {
      // REAL SCENARIO: User tries to access a vehicle not in their OnStar account
      // This is a critical security check
      const freshRequestService = new RequestService(testConfig, httpClient)
        .setAuthToken(authToken)
        .setRequestPollingIntervalSeconds(0)
        .setRequestPollingTimeoutSeconds(0);

      const GMAuth = require("../../src/auth/GMAuth");
      jest.spyOn(GMAuth, "getGMAPIJWT").mockResolvedValue({
        token: { access_token: "mock-token" },
        auth: {},
        decodedPayload: {
          vehs: [{ vin: "DIFFERENTVIN1" }, { vin: "DIFFERENTVIN2" }],
        },
      });

      await expect(freshRequestService.getAuthToken()).rejects.toThrow(
        `Provided VIN does not appear to be an authorized VIN for this OnStar account`,
      );
    });

    test("isEVAuthError detects expired token with 400 status", async () => {
      // REAL SCENARIO: EV session token expires while user has app open
      // API returns 400 instead of 401, need to detect and refresh
      requestService["evTokenExpiresAt"] = Date.now() - 1000;

      const error = {
        response: {
          status: 400,
          data: { message: "Some error" },
        },
      };

      const result = requestService["isEVAuthError"](error);
      expect(result).toBe(true);

      // Clean up
      requestService["evTokenExpiresAt"] = undefined;
    });

    test("isEVAuthError detects auth-related error messages", async () => {
      // REAL SCENARIO: OnStar API returns auth errors with different message formats
      const errorWithToken = {
        response: {
          status: 400,
          data: { message: "Invalid token provided" },
        },
      };
      expect(requestService["isEVAuthError"](errorWithToken)).toBe(true);

      const errorWithAuth = {
        response: {
          status: 400,
          data: { message: "Authentication failed" },
        },
      };
      expect(requestService["isEVAuthError"](errorWithAuth)).toBe(true);
    });

    test("isEVAuthError detects 401 and 403 status codes", async () => {
      // REAL SCENARIO: Standard HTTP auth error responses
      const error401 = {
        response: {
          status: 401,
          data: {},
        },
      };
      expect(requestService["isEVAuthError"](error401)).toBe(true);

      const error403 = {
        response: {
          status: 403,
          data: {},
        },
      };
      expect(requestService["isEVAuthError"](error403)).toBe(true);
    });

    test("decodeJwtExpMs handles both seconds and milliseconds timestamps", () => {
      // REAL SCENARIO: JWT standards use seconds, but some APIs use milliseconds
      // Need to handle both formats correctly

      // Test seconds format (standard JWT)
      const expSeconds = Math.floor(Date.now() / 1000) + 3600;
      const payloadSeconds = Buffer.from(
        JSON.stringify({ exp: expSeconds }),
        "utf8",
      )
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
      const tokenSeconds = `header.${payloadSeconds}.signature`;
      expect(requestService["decodeJwtExpMs"](tokenSeconds)).toBe(
        expSeconds * 1000,
      );

      // Test milliseconds format
      const expMs = Date.now() + 3600000;
      const payloadMs = Buffer.from(JSON.stringify({ exp: expMs }), "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
      const tokenMs = `header.${payloadMs}.signature`;
      expect(requestService["decodeJwtExpMs"](tokenMs)).toBe(expMs);
    });

    test("decodeJwtExpMs handles malformed tokens gracefully", () => {
      // REAL SCENARIO: Network issues or API changes could return malformed tokens
      // Should return undefined instead of crashing
      expect(requestService["decodeJwtExpMs"]("not.enough")).toBeUndefined();
      expect(
        requestService["decodeJwtExpMs"]("header.invalidbase64.sig"),
      ).toBeUndefined();
    });
  });
});
