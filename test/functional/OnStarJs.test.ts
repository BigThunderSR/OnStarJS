import dotenv from "dotenv";
dotenv.config();
import OnStar from "../../src/index";

//jest.setTimeout(15000); => This is not needed as we set the timeout in jest.config.js

const {
  DEVICEID,
  VIN,
  ONSTAR_USERNAME,
  ONSTAR_PASSWORD,
  ONSTAR_PIN,
  ONSTAR_TOTPKEY,
  TOKEN_LOCATION,
} = process.env;

if (
  !DEVICEID ||
  !VIN ||
  !ONSTAR_USERNAME ||
  !ONSTAR_PASSWORD ||
  !ONSTAR_PIN ||
  !ONSTAR_TOTPKEY
) {
  throw new Error("Missing environment config for functional tests");
}

describe("OnStarJs", () => {
  let onStar: OnStar;

  beforeAll(() => {
    onStar = OnStar.create({
      deviceId: DEVICEID,
      vin: VIN,
      username: ONSTAR_USERNAME,
      password: ONSTAR_PASSWORD,
      onStarPin: ONSTAR_PIN,
      onStarTOTP: ONSTAR_TOTPKEY,
      tokenLocation: TOKEN_LOCATION,
      checkRequestStatus: false,
    });
  });

  test("Unupgraded Command Successful", async () => {
    const data = await onStar.getAccountVehicles();
    // console.log(JSON.stringify(data, null, 2));

    expect(data).toHaveProperty("data.vehicles");
  }, 900000); // Increased timeout to 15 minutes to match Jest global timeout

  test("Upgraded Command Successful", async () => {
    const result = await onStar.cancelAlert();

    expect(result.status).toEqual("success");
    // The API version used depends on vehicle type:
    // - v3 API returns an immediate request envelope for EV vehicles
    // - v1 API uses polling and returns commandResponse for ICE vehicles
    const data = result.response?.data as any;
    if (data?.status && data?.requestId) {
      // v3 API response
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("requestId");
    } else if (data?.commandResponse) {
      // v1 API response after polling
      expect(data).toHaveProperty("commandResponse");
    } else {
      // Should have one of the two response structures
      fail(
        "Response should have either v3 structure (status, requestId) or v1 structure (commandResponse)",
      );
    }
  });

  test("Diagnostics Request Successful", async () => {
    const result = await onStar.diagnostics();

    const data = result.response?.data as any;
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response returned");
    }
    // console.log(JSON.stringify(data, null, 2));

    expect(result.status).toEqual("success");
    expect(data).toHaveProperty("diagnostics");
    expect(Array.isArray(data.diagnostics)).toBe(true);

    if (data.diagnostics.length > 0) {
      const d0 = data.diagnostics[0];
      expect(d0).toHaveProperty("name");
      expect(d0).toHaveProperty("displayName");
      expect(d0).toHaveProperty("diagnosticElements");
      expect(Array.isArray(d0.diagnosticElements)).toBe(true);
    }
  }, 90000);
});
