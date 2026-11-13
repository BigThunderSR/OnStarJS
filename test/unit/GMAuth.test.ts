import { GMAuth } from "../../src/auth/GMAuth";
import fs from "fs";
import jwt from "jsonwebtoken";
import path from "path";

jest.mock("fs");

describe("GMAuth saved tokens", () => {
  const config = {
    username: "test@example.com",
    password: "password",
    deviceId: "device-id",
    totpKey: "totp-key",
    tokenLocation: "tokens",
  };
  const msTokenPath = path.join(config.tokenLocation, "microsoft_tokens.json");
  const now = Math.floor(Date.now() / 1000);
  const expiredTokens = {
    access_token: jwt.sign({ email: config.username }, "test-secret"),
    refresh_token: "refresh-token",
    expires_at: now - 60,
  };
  let auth: GMAuth;
  let fullAuth: jest.SpyInstance;
  let refresh: jest.Mock;
  let setupClient: jest.Mock;

  beforeEach(() => {
    jest
      .mocked(fs.existsSync)
      .mockImplementation((filePath) => filePath === msTokenPath);
    jest.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(expiredTokens));
    auth = new GMAuth(config);
    fullAuth = jest
      .spyOn(auth, "doFullAuthSequence")
      .mockResolvedValue(expiredTokens);
    auth["internalCleanup"] = jest.fn().mockResolvedValue(undefined);
    refresh = jest.fn();
    setupClient = jest.fn().mockResolvedValue({ refresh });
    auth["setupOpenIDClient"] = setupClient;
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test.each([
    ["malformed JSON", "{bad json}"],
    ["null token set", "null"],
    ["missing access token", "{}"],
    ["invalid access token", JSON.stringify({ access_token: "invalid" })],
    [
      "wrong account",
      JSON.stringify({
        ...expiredTokens,
        access_token: jwt.sign({ email: "other@example.com" }, "test-secret"),
      }),
    ],
    [
      "missing refresh token",
      JSON.stringify({ ...expiredTokens, refresh_token: undefined }),
    ],
    [
      "expired refresh token",
      JSON.stringify({ ...expiredTokens, refresh_expires_at: now - 60 }),
    ],
    [
      "old refresh token",
      JSON.stringify({
        ...expiredTokens,
        refresh_obtained_at: now - 61 * 24 * 60 * 60,
      }),
    ],
  ])(
    "fails without browser sign-in for %s, including after restart",
    async (_reason, savedTokens) => {
      jest.mocked(fs.readFileSync).mockReturnValue(savedTokens);

      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
          auth = new GMAuth(config);
          fullAuth = jest
            .spyOn(auth, "doFullAuthSequence")
            .mockResolvedValue(expiredTokens);
          auth["internalCleanup"] = jest.fn().mockResolvedValue(undefined);
          auth["setupOpenIDClient"] = setupClient;
        }
        await expect(auth.authenticate()).rejects.toThrow(
          "Renew microsoft_tokens.json manually",
        );
        expect(fullAuth).not.toHaveBeenCalled();
      }

      expect(setupClient).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    },
  );

  test.each([
    { error: "invalid_grant", error_description: "Refresh rejected" },
    new Error("invalid_grant"),
    new Error("AADB2C90080: grant has expired"),
  ])(
    "fails without browser sign-in when refresh is rejected: %s",
    async (error) => {
      refresh.mockRejectedValue(error);

      await expect(auth.authenticate()).rejects.toThrow(
        "Renew microsoft_tokens.json manually",
      );
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(fullAuth).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    },
  );

  test("propagates transient refresh failures without browser sign-in", async () => {
    const error = new Error("Network timeout");
    refresh.mockRejectedValue(error);

    await expect(auth.authenticate()).rejects.toThrow(error);
    expect(fullAuth).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  test("continues to use valid saved tokens with an email-only identity", async () => {
    const validTokens = { ...expiredTokens, expires_at: now + 3600 };
    jest.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(validTokens));

    await expect(auth["loadMSToken"]()).resolves.toEqual(validTokens);
    expect(setupClient).not.toHaveBeenCalled();
    expect(fullAuth).not.toHaveBeenCalled();
  });

  test("continues to refresh and persist usable tokens", async () => {
    const refreshedTokens = {
      ...expiredTokens,
      access_token: jwt.sign(
        { email: config.username, refreshed: true },
        "test-secret",
      ),
      expires_at: now + 3600,
    };
    refresh.mockResolvedValue(refreshedTokens);

    await expect(auth["loadMSToken"]()).resolves.toEqual(refreshedTokens);
    expect(refresh).toHaveBeenCalledWith(expiredTokens.refresh_token);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      msTokenPath,
      JSON.stringify(refreshedTokens),
    );
    expect(fullAuth).not.toHaveBeenCalled();
  });

  test("keeps first-time authentication when no MS token file exists", async () => {
    jest.mocked(fs.existsSync).mockReturnValue(false);

    await expect(auth["loadMSToken"]()).resolves.toBe(false);
    expect(setupClient).not.toHaveBeenCalled();
  });
});
