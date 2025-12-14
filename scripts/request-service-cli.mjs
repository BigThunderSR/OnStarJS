import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import OnStar from "../dist/index.mjs";
import { v4 as uuidv4 } from "uuid";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

function toNum(value, def = undefined) {
  if (value === undefined || value === null || value === "") return def;
  const n = Number(value);
  return Number.isFinite(n) ? n : def;
}

function logInfo(msg, extra = {}) {
  console.log("info:", msg, {
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    ...extra,
  });
}

async function promptNumber(rl, label, def = 0) {
  const ans = (await rl.question(`${label} [default: ${def}]: `)).trim();
  const n = toNum(ans, def);
  return n;
}

async function main() {
  // Build config from env (.env supported via dotenv/config)
  const config = {
    deviceId: requireEnv("DEVICEID"),
    vin: requireEnv("VIN"),
    username: requireEnv("ONSTAR_USERNAME"),
    password: requireEnv("ONSTAR_PASSWORD"),
    onStarPin: requireEnv("ONSTAR_PIN"),
    onStarTOTP: requireEnv("ONSTAR_TOTPKEY"),
    tokenLocation: process.env.TOKEN_LOCATION || "./",

    // Optional request/429 handling knobs
    checkRequestStatus: process.env.CHECK_REQUEST_STATUS
      ? String(process.env.CHECK_REQUEST_STATUS).toLowerCase() !== "false"
      : true,
    requestPollingIntervalSeconds: toNum(
      process.env.REQUEST_POLL_INTERVAL_SECONDS,
      undefined,
    ),
    requestPollingTimeoutSeconds: toNum(
      process.env.REQUEST_POLL_TIMEOUT_SECONDS,
      undefined,
    ),
    max429Retries: toNum(process.env.MAX_429_RETRIES, 4),
    initial429DelayMs: toNum(process.env.INITIAL_429_DELAY_MS, 1500),
    backoffFactor: toNum(process.env.BACKOFF_FACTOR, 2),
    jitterMs: toNum(process.env.JITTER_MS, 500),
    max429DelayMs: toNum(process.env.MAX_429_DELAY_MS, 60000),
    retryOn429ForPost:
      String(process.env.RETRY_POST_ON_429 || "").toLowerCase() === "true",
  };

  const client = OnStar.create(config);

  const rl = readline.createInterface({ input, output });
  console.log("\nOnStarJS RequestService Interactive CLI\n");
  console.log("Environment VIN:", config.vin);
  let checkState = config.checkRequestStatus !== false;

  // Action registry — mirrors RequestService public API exposed via OnStar wrapper
  const actions = [
    {
      key: "getAccountVehicles",
      label: "getAccountVehicles()",
      run: () => client.getAccountVehicles(),
    },
    {
      key: "getVehicleDetails",
      label: "getVehicleDetails(vin?)",
      run: async () => {
        const ans = (await rl.question("VIN (blank to use env VIN): ")).trim();
        const vin = ans ? ans.toUpperCase() : undefined;
        return client.getVehicleDetails(vin);
      },
    },
    {
      key: "getOnstarPlan",
      label: "getOnstarPlan(vin?)",
      run: async () => {
        const ans = (await rl.question("VIN (blank to use env VIN): ")).trim();
        const vin = ans ? ans.toUpperCase() : undefined;
        return client.getOnstarPlan(vin);
      },
    },
    {
      key: "getVehicleRecallInfo",
      label: "getVehicleRecallInfo(vin?)",
      run: async () => {
        const ans = (await rl.question("VIN (blank to use env VIN): ")).trim();
        const vin = ans ? ans.toUpperCase() : undefined;
        return client.getVehicleRecallInfo(vin);
      },
    },
    {
      key: "diagnostics",
      label: "diagnostics()",
      run: () => client.diagnostics(),
    },
    { key: "location", label: "location()", run: () => client.location() },
    {
      key: "start",
      label: "start({ cabinTemperature })",
      run: async () => {
        const ans = (
          await rl.question("Provide cabin temperature in C? (blank to skip): ")
        ).trim();
        if (!ans) return client.start();
        const n = Number(ans);
        if (!Number.isFinite(n)) return client.start();
        return client.start({ cabinTemperature: Math.round(n) });
      },
    },
    {
      key: "cancelStart",
      label: "cancelStart()",
      run: () => client.cancelStart(),
    },
    {
      key: "lockDoor",
      label: "lockDoor(options)",
      run: async () => {
        const delay = await promptNumber(rl, "delay (seconds)", 0);
        return client.lockDoor({ delay });
      },
    },
    {
      key: "unlockDoor",
      label: "unlockDoor(options)",
      run: async () => {
        const delay = await promptNumber(rl, "delay (seconds)", 0);
        return client.unlockDoor({ delay });
      },
    },
    {
      key: "lockTrunk",
      label: "lockTrunk(options)",
      run: async () => {
        const delay = await promptNumber(rl, "delay (seconds)", 0);
        return client.lockTrunk({ delay });
      },
    },
    {
      key: "unlockTrunk",
      label: "unlockTrunk(options)",
      run: async () => {
        const delay = await promptNumber(rl, "delay (seconds)", 0);
        return client.unlockTrunk({ delay });
      },
    },
    {
      key: "alert",
      label: "alert() (honk + flash)",
      run: () => client.alert(),
    },
    {
      key: "cancelAlert",
      label: "cancelAlert()",
      run: () => client.cancelAlert(),
    },
    {
      key: "flashLights",
      label: "flashLights() (flash only)",
      run: () => client.flashLights(),
    },
    {
      key: "stopLights",
      label: "stopLights() (cancel flash)",
      run: () => client.stopLights(),
    },
    {
      key: "setChargeLevelTarget",
      label: "setChargeLevelTarget(tcl, opts)",
      run: async () => {
        const tcl = await promptNumber(rl, "target charge level (1-100)", 80);
        const useOpts =
          (await rl.question("Provide advanced options? (y/N): "))
            .trim()
            .toLowerCase() === "y";

        let opts = undefined;
        if (useOpts) {
          const noMetricsRefreshAns = (
            await rl.question("noMetricsRefresh? (y/N): ")
          )
            .trim()
            .toLowerCase();
          const noMetricsRefresh = noMetricsRefreshAns === "y";
          const clientRequestId =
            (
              await rl.question("clientRequestId (leave blank for random): ")
            ).trim() || undefined;
          const clientVersion =
            (
              await rl.question("clientVersion [default: 7.18.0.8006]: ")
            ).trim() || undefined;
          const osAns = (await rl.question("os metadata [A|I] [default: A]: "))
            .trim()
            .toUpperCase();
          const os = osAns === "A" || osAns === "I" ? osAns : undefined;
          opts = { noMetricsRefresh, clientRequestId, clientVersion, os };
        }

        const clientRequestId = opts?.clientRequestId || uuidv4();
        const noMetricsRefresh =
          typeof opts?.noMetricsRefresh === "boolean"
            ? opts.noMetricsRefresh
            : false;

        // Preview only non-sensitive form fields; vehicleId is derived internally via initSession
        const bodyPreview = new URLSearchParams({
          tcl: String(Math.round(tcl)),
          noMetricsRefresh: String(noMetricsRefresh),
          clientRequestId,
        });
        console.log(
          "\n=== Request Body (form-urlencoded preview) ===\n" +
            bodyPreview.toString() +
            "\n(Info) vehicleId is derived from initSession metrics inside the SDK and not shown here.\n",
        );

        const finalOpts = Object.assign({}, opts || {}, { clientRequestId });
        return client.setChargeLevelTarget(tcl, finalOpts);
      },
    },
    {
      key: "stopCharging",
      label: "stopCharging(opts)",
      run: async () => {
        const useOpts =
          (await rl.question("Provide advanced options? (y/N): "))
            .trim()
            .toLowerCase() === "y";
        let opts = undefined;
        if (useOpts) {
          const noMetricsRefreshAns = (
            await rl.question("noMetricsRefresh? (y/N): ")
          )
            .trim()
            .toLowerCase();
          const noMetricsRefresh = noMetricsRefreshAns === "y";
          const clientRequestId =
            (
              await rl.question("clientRequestId (leave blank for random): ")
            ).trim() || undefined;
          const clientVersion =
            (
              await rl.question("clientVersion [default: 7.18.0.8006]: ")
            ).trim() || undefined;
          const osAns = (await rl.question("os metadata [A|I] [default: A]: "))
            .trim()
            .toUpperCase();
          const os = osAns === "A" || osAns === "I" ? osAns : undefined;
          opts = { noMetricsRefresh, clientRequestId, clientVersion, os };
        }
        const finalOpts = Object.assign({}, opts || {}, {
          clientRequestId: opts?.clientRequestId || uuidv4(),
        });
        return client.stopCharging(finalOpts);
      },
    },
    {
      key: "getEVChargingMetrics",
      label: "getEVChargingMetrics(opts)",
      run: async () => {
        const useOpts =
          (await rl.question("Provide advanced options? (y/N): "))
            .trim()
            .toLowerCase() === "y";
        let opts = undefined;
        if (useOpts) {
          const clientVersion =
            (
              await rl.question("clientVersion [default: 7.18.0.8006]: ")
            ).trim() || undefined;
          const osAns = (await rl.question("os metadata [A|I] [default: A]: "))
            .trim()
            .toUpperCase();
          const os = osAns === "A" || osAns === "I" ? osAns : undefined;
          opts = { clientVersion, os };
        }
        return client.getEVChargingMetrics(opts);
      },
    },
    {
      key: "refreshEVChargingMetrics",
      label: "refreshEVChargingMetrics(opts)",
      run: async () => {
        const useOpts =
          (await rl.question("Provide advanced options? (y/N): "))
            .trim()
            .toLowerCase() === "y";
        let opts = undefined;
        if (useOpts) {
          const clientVersion =
            (
              await rl.question("clientVersion [default: 7.18.0.8006]: ")
            ).trim() || undefined;
          const osAns = (await rl.question("os metadata [A|I] [default: A]: "))
            .trim()
            .toUpperCase();
          const os = osAns === "A" || osAns === "I" ? osAns : undefined;
          opts = { clientVersion, os };
        }
        return client.refreshEVChargingMetrics(opts);
      },
    },
    {
      key: "simulateReauth",
      label: "simulateReauth() — delete tokens, auth twice, print Xvfb info",
      run: async () => {
        const tokenDir = process.env.TOKEN_LOCATION || "./";

        const deleteTokens = () => {
          try {
            const msFsPath = path.resolve(tokenDir, "microsoft_tokens.json");
            const gmFsPath = path.resolve(tokenDir, "gm_tokens.json");
            if (fs.existsSync(msFsPath)) {
              fs.rmSync(msFsPath, { force: true });
              console.log("🗑️ Deleted", msFsPath);
            }
            if (fs.existsSync(gmFsPath)) {
              fs.rmSync(gmFsPath, { force: true });
              console.log("🗑️ Deleted", gmFsPath);
            }
          } catch (e) {
            console.log("⚠️ Failed to delete token files:", e?.message || e);
          }
        };

        // Small diagnostic helper mirroring GMAuth's Xvfb checks
        const printXvfbDiagnostics = () => {
          try {
            console.log("\n=== Xvfb Diagnostics ===");
            console.log("ENV DISPLAY:", process.env.DISPLAY || "<unset>");
            console.log("ENV PATH:", process.env.PATH || "<unset>");
            try {
              console.log(
                "which Xvfb:",
                execSync("which Xvfb").toString().trim(),
              );
            } catch {
              console.log("which Xvfb: not found");
            }
            try {
              console.log(
                "Xvfb -help (first lines):\n" +
                  execSync("Xvfb -help 2>&1 | head -n 5").toString(),
              );
            } catch {}
            try {
              console.log(
                "which xauth:",
                execSync("which xauth").toString().trim(),
              );
            } catch {}
            try {
              console.log(
                "which xhost:",
                execSync("which xhost").toString().trim(),
              );
            } catch {}
            try {
              console.log(
                "ps Xvfb (top 20):\n" +
                  execSync(
                    "ps aux | grep Xvfb | grep -v grep | head -n 20",
                  ).toString(),
              );
            } catch {}
            try {
              console.log(
                "ps Xorg (top 20):\n" +
                  execSync(
                    "ps aux | grep Xorg | grep -v grep | head -n 20",
                  ).toString(),
              );
            } catch {}
            try {
              console.log(
                "/tmp/.X*-lock:\n" +
                  execSync("ls -la /tmp/.X*-lock 2>&1 | head -n 50").toString(),
              );
            } catch {}
            try {
              console.log(
                "/tmp/.X11-unix:\n" +
                  execSync(
                    "ls -la /tmp/.X11-unix 2>&1 | head -n 50",
                  ).toString(),
              );
            } catch {}
            console.log("=== End Xvfb Diagnostics ===\n");
          } catch (e) {
            console.log(
              "(diag) Failed to collect diagnostics:",
              e?.message || e,
            );
          }
        };

        // Delete existing tokens to force reauth (before first attempt)
        deleteTokens();

        // First run: should trigger full authentication
        console.log("\n▶️ First getAccountVehicles (should reauth)...");
        const first = await client.getAccountVehicles();
        console.log("✅ First call succeeded");
        printXvfbDiagnostics();

        // Delete tokens again to force a fresh browser init and reauth
        deleteTokens();
        // Second run: should perform auth again and still succeed
        console.log("\n▶️ Second getAccountVehicles (post-auth)...");
        const second = await client.getAccountVehicles();
        console.log("✅ Second call succeeded");
        printXvfbDiagnostics();

        return { status: "success", response: { data: { first, second } } };
      },
    },
    {
      key: "toggleCheckRequestStatus",
      label: "toggle checkRequestStatus (client)",
      run: async () => {
        const next = !checkState;
        client.setCheckRequestStatus(next);
        checkState = next;
        logInfo("checkRequestStatus set", { value: next });
        return {
          status: "success",
          response: { data: { checkRequestStatus: next } },
        };
      },
    },
  ];

  async function chooseAction() {
    console.log("\nSelect an action:");
    for (let i = 0; i < actions.length; i++) {
      console.log(`${i + 1}. ${actions[i].label}`);
    }
    console.log(`${actions.length + 1}. Exit`);
    const ans = await rl.question("Enter choice number: ");
    const choice = Number(ans.trim());
    if (!Number.isFinite(choice) || choice < 1 || choice > actions.length + 1) {
      console.log("Invalid choice. Try again.");
      return true;
    }
    if (choice === actions.length + 1) return false;

    const action = actions[choice - 1];
    logInfo(`Executing ${action.label} ...`);
    try {
      const result = await action.run();
      console.log("\n=== Result ===");
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error("\n❌ call failed");
      if (err && typeof err === "object") {
        const safe = {
          message: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          headers: err.response?.headers,
          data: err.response?.data,
        };
        console.error(JSON.stringify(safe, null, 2));
      } else {
        console.error(String(err));
      }
    }

    return true;
  }

  let cont = true;
  while (cont) {
    cont = await chooseAction();
  }

  rl.close();
}

main().catch((e) => {
  console.error("Fatal error:", e?.message || e);
  process.exitCode = 1;
});
