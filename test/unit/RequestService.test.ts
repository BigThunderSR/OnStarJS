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

  // Tests for engine type detection and API routing
  describe("Engine Type Detection and API Routing", () => {
    beforeEach(() => {
      // Clear cached vehicle type before each test
      requestService["cachedVehicleType"] = undefined;

      // Clear disk cache by mocking fs methods to avoid actual file I/O
      jest
        .spyOn(requestService as any, "loadVehicleTypeFromDisk")
        .mockReturnValue(undefined);
      jest
        .spyOn(requestService as any, "saveVehicleTypeToDisk")
        .mockImplementation(() => {});
    });

    test("detects ICE vehicle from ENGINE_TYPE in diagnostics", async () => {
      const diagnosticsResponse = {
        data: {
          diagnostics: [
            {
              name: "ENGINE_OIL_LIFE",
              diagnosticElements: [
                {
                  name: "ENGINE_TYPE",
                  value: "ICE",
                },
              ],
            },
          ],
        },
      };

      httpClient.get = jest.fn().mockResolvedValue(diagnosticsResponse);

      const result = await requestService["isICEVehicle"]();
      expect(result).toBe(true);
      expect(requestService["cachedVehicleType"]).toBe("ICE");
    });

    test("detects EV vehicle from ENGINE_TYPE in diagnostics", async () => {
      const diagnosticsPayload = {
        diagnostics: [
          {
            name: "ENGINE_OIL_LIFE",
            diagnosticElements: [
              {
                name: "ENGINE_TYPE",
                value: "BEV",
              },
            ],
          },
        ],
      };

      httpClient.get = jest
        .fn()
        .mockResolvedValue({ data: diagnosticsPayload });

      const result = await requestService["isICEVehicle"]();
      expect(result).toBe(false);
      expect(requestService["cachedVehicleType"]).toBe("EV");
    });

    test("detects ICE vehicle from fuel level diagnostics", async () => {
      const diagnosticsPayload = {
        diagnostics: [
          {
            name: "FUEL LEVEL",
            displayName: "Fuel Level",
            diagnosticElements: [],
          },
        ],
      };

      httpClient.get = jest
        .fn()
        .mockResolvedValue({ data: diagnosticsPayload });

      const result = await requestService["isICEVehicle"]();
      expect(result).toBe(true);
      expect(requestService["cachedVehicleType"]).toBe("ICE");
    });

    test("detects EV vehicle from battery diagnostics", async () => {
      const diagnosticsPayload = {
        diagnostics: [
          {
            name: "EV_BATTERY_LEVEL",
            displayName: "Battery Level",
            diagnosticElements: [],
          },
        ],
      };

      httpClient.get = jest
        .fn()
        .mockResolvedValue({ data: diagnosticsPayload });

      const result = await requestService["isICEVehicle"]();
      expect(result).toBe(false);
      expect(requestService["cachedVehicleType"]).toBe("EV");
    });

    test("uses cached vehicle type on subsequent calls", async () => {
      requestService["cachedVehicleType"] = "ICE";

      const result = await requestService["isICEVehicle"]();
      expect(result).toBe(true);
      // httpClient should not be called when using cache
      expect(httpClient.get).not.toHaveBeenCalled();
    });

    test("defaults to ICE when diagnostics fail", async () => {
      httpClient.get = jest.fn().mockRejectedValue(new Error("API Error"));

      const result = await requestService["isICEVehicle"]();
      expect(result).toBe(true);
      expect(requestService["cachedVehicleType"]).toBe("ICE");
    });

    test("defaults to ICE when no engine type found in diagnostics", async () => {
      const diagnosticsResponse = {
        data: {
          diagnostics: [
            {
              name: "TIRE_PRESSURE",
              displayName: "Tire Pressure",
              diagnosticElements: [],
            },
          ],
        },
      };

      httpClient.get = jest.fn().mockResolvedValue(diagnosticsResponse);

      const result = await requestService["isICEVehicle"]();
      expect(result).toBe(true);
      expect(requestService["cachedVehicleType"]).toBe("ICE");
    });

    test("flashLights uses v1 API for ICE vehicle", async () => {
      requestService["cachedVehicleType"] = "ICE";

      await requestService.flashLights();

      const postCall = (httpClient.post as jest.Mock).mock.calls[0];
      const url = postCall[0];
      expect(url).toContain("/api/v1/account/vehicles/");
      expect(url).toContain("/commands/alert");
    });

    test("flashLights uses v3 API for EV vehicle", async () => {
      requestService["cachedVehicleType"] = "EV";

      await requestService.flashLights();

      const postCall = (httpClient.post as jest.Mock).mock.calls[0];
      const url = postCall[0];
      expect(url).toContain("/veh/cmd/v3/alert/");
    });

    test("alert uses v1 API for ICE vehicle", async () => {
      requestService["cachedVehicleType"] = "ICE";

      await requestService.alert();

      const postCall = (httpClient.post as jest.Mock).mock.calls[0];
      const url = postCall[0];
      expect(url).toContain("/api/v1/account/vehicles/");
      expect(url).toContain("/commands/alert");
    });

    test("cancelAlert uses v1 API for ICE vehicle", async () => {
      requestService["cachedVehicleType"] = "ICE";

      await requestService.cancelAlert();

      const postCall = (httpClient.post as jest.Mock).mock.calls[0];
      const url = postCall[0];
      expect(url).toContain("/api/v1/account/vehicles/");
      expect(url).toContain("/commands/cancelAlert");
    });

    test("stopLights uses v1 API for ICE vehicle", async () => {
      requestService["cachedVehicleType"] = "ICE";

      await requestService.stopLights();

      const postCall = (httpClient.post as jest.Mock).mock.calls[0];
      const url = postCall[0];
      expect(url).toContain("/api/v1/account/vehicles/");
      expect(url).toContain("/commands/cancelAlert");
    });
  });
});
