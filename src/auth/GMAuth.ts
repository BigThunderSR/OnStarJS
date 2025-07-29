// auth/GMAuth.ts
import axios, { AxiosInstance, AxiosResponse } from "axios";
import { CookieJar } from "tough-cookie";
import { HttpCookieAgent, HttpsCookieAgent } from "http-cookie-agent/http";
import * as openidClient from "openid-client";
import { custom } from "openid-client";
import fs from "fs";
import { TOTP } from "totp-generator";
import https from "https";
//import { stringify } from "uuid";
import path from "path";
import jwt from "jsonwebtoken";
import { chromium, Browser, BrowserContext, Page } from "patchright";
import { randomInt } from "crypto";
import { execSync } from "child_process";

// Import xvfb with explicit any type to avoid TypeScript issues
const Xvfb = require("xvfb") as any;

// Define an interface for the vehicle structure and the payload containing them
interface Vehicle {
  vin: string;
  per: string;
}

interface DecodedPayload {
  vehs: Vehicle[];
}

interface GMAuthConfig {
  username: string;
  password: string;
  deviceId: string;
  totpKey: string;
  tokenLocation?: string;
}

interface TokenSet {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
}

interface GMAPITokenResponse {
  access_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
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
export class GMAuth {
  private config: GMAuthConfig;
  private MSTokenPath: string;
  private GMTokenPath: string;
  private oidc: {
    Issuer: typeof openidClient.Issuer;
    generators: typeof openidClient.generators;
  };
  private jar: CookieJar;
  private axiosClient: AxiosInstance;
  private csrfToken: string | null;
  private transId: string | null; // Browser automation properties
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private currentPage: Page | null = null;
  private capturedAuthCode: string | null = null;

  private currentGMAPIToken: GMAPITokenResponse | null = null;
  private debugMode: boolean = true; // Default to visible mode for reliability
  private xvfb: any = null; // Xvfb instance for Linux virtual display
  private xvfbDisplay: string | null = null; // Store the DISPLAY value for Xvfb
  private cleanupInProgress: boolean = false; // Flag to prevent concurrent cleanup
  private browserWarmedUp: boolean = false; // Flag to track if browser has been warmed up for current profile

  constructor(config: GMAuthConfig) {
    this.config = config;
    this.config.tokenLocation = this.config.tokenLocation ?? "./";
    this.MSTokenPath = path.join(
      this.config.tokenLocation,
      "microsoft_tokens.json",
    );
    this.GMTokenPath = path.join(this.config.tokenLocation, "gm_tokens.json");
    this.oidc = {
      Issuer: openidClient.Issuer,
      generators: openidClient.generators,
    };

    // Define modern cipher suites similar to browsers
    const modernCiphers = [
      "TLS_AES_128_GCM_SHA256",
      "TLS_AES_256_GCM_SHA384",
      "TLS_CHACHA20_POLY1305_SHA256",
      "ECDHE-ECDSA-AES128-GCM-SHA256",
      "ECDHE-RSA-AES128-GCM-SHA256",
      "ECDHE-ECDSA-AES256-GCM-SHA384",
      "ECDHE-RSA-AES256-GCM-SHA384",
      "ECDHE-ECDSA-CHACHA20_POLY1305",
      "ECDHE-RSA-CHACHA20_POLY1305",
      "ECDHE-RSA-AES128-SHA",
      "ECDHE-RSA-AES256-SHA",
      "AES128-GCM-SHA256",
      "AES256-GCM-SHA384",
      "AES128-SHA",
      "AES256-SHA",
    ].join(":");

    // Configure Node.js global HTTPS agent for openid-client
    https.globalAgent.options.ciphers = modernCiphers;
    https.globalAgent.options.minVersion = "TLSv1.2";

    // Create cookie jar with more permissive settings
    this.jar = new CookieJar(undefined, {
      looseMode: true,
      rejectPublicSuffixes: false,
      allowSpecialUseDomain: true,
    });

    this.axiosClient = axios.create({
      httpAgent: new HttpCookieAgent({ cookies: { jar: this.jar } }),
      httpsAgent: new HttpsCookieAgent({
        cookies: { jar: this.jar },
        ciphers: modernCiphers,
        minVersion: "TLSv1.2",
        keepAlive: true,
      }),
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    this.csrfToken = null;
    this.transId = null;
    // Load the current GM API token
    this.loadCurrentGMAPIToken();
  }
  // Helper function to wait for authorization code
  async waitForAuthCode(timeoutMs = 10000, intervalMs = 500) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (this.capturedAuthCode) {
        console.log(
          `🪝 [waitForAuthCode] Auth code captured: ${this.capturedAuthCode.substring(0, 20)}${this.capturedAuthCode.length > 20 ? "..." : ""}`,
        );
        return true;
      }
      // if (this.debugMode) console.log(`[waitForAuthCode] Waiting for auth code... ${(Date.now() - startTime) / 1000}s elapsed`);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    // if (this.debugMode) console.log(`[waitForAuthCode] Timeout waiting for auth code after ${timeoutMs / 1000}s`);
    return false;
  }
  // Browser management methods
  private async initBrowser(
    useRandomFingerprint: boolean = false,
  ): Promise<void> {
    // Detect platform early to check display state
    const isLinux = process.platform === "linux";

    // Check if browser and context are actually usable, not just that references exist
    let browserUsable = false;

    // First check: Do we have both browser and context?
    console.log(
      `🔍 Browser check: browser=${!!this.browser}, context=${!!this.context}`,
    );

    if (this.context) {
      // We have a context, check if it's still usable
      try {
        const pages = this.context.pages();
        console.log(
          `🔍 Context usability: pages=${pages ? pages.length : "null"}`,
        );

        // Check if context is still usable by testing pages access
        if (pages !== null && pages !== undefined) {
          // Context is usable, try to get browser reference (but don't require it)
          if (!this.browser) {
            this.browser = this.context.browser();
            console.log(
              `🔍 Trying to get browser from context: ${!!this.browser}`,
            );
          }

          // For persistent contexts, we can work with just the context
          // Browser reference may be null in containerized environments
          if (this.browser) {
            try {
              const isConnected = this.browser.isConnected();
              console.log(`🔍 Browser connection status: ${isConnected}`);
              browserUsable = isConnected;
            } catch (error) {
              console.log(
                "🔍 Browser reference exists but not connected:",
                error,
              );
              browserUsable = true; // Context is still usable even if browser ref fails
            }
          } else {
            console.log(
              "� Browser reference is null, but context appears usable",
            );
            browserUsable = true; // Context can work without browser reference
          }

          if (browserUsable) {
            console.log("🌐 Reusing existing browser context");
            return; // Early return - don't continue with initialization
          }
        } else {
          console.log(
            "🔄 Context exists but pages access failed, reinitializing...",
          );
        }
      } catch (error) {
        console.log(
          "🔄 Context exists but not usable, reinitializing...",
          error,
        );
      }
      // If we reach here, context exists but is not usable
      browserUsable = false;
    } else if (this.browser) {
      // We have a browser but no context - this shouldn't happen with persistent contexts
      console.log(
        `🔄 Browser exists without context (unexpected state), reinitializing...`,
      );
      browserUsable = false;
    } else {
      // No existing browser or context
      console.log("🔍 No existing browser state, initializing fresh...");
      browserUsable = false;
    }

    // Clear stale references if browser is not usable
    if (!browserUsable) {
      // Remember if we had an existing context before clearing references
      const hadExistingContext = this.context !== null;

      this.browser = null;
      this.context = null;
      this.currentPage = null;

      // Only delete the browser profile if we're starting completely fresh
      // (no existing context at all). This preserves warmed-up sessions.
      if (!hadExistingContext && fs.existsSync("./temp-browser-profile")) {
        fs.rmSync("./temp-browser-profile", { recursive: true, force: true });
        console.log("🗑️ Deleted existing temp browser profile (fresh start)");
        // Reset warmup flag since we deleted the profile
        this.browserWarmedUp = false;
      } else if (hadExistingContext) {
        console.log("🔄 Preserving browser profile from existing session");
      }
    }

    // Generate random fingerprint if requested
    const fingerprint = useRandomFingerprint
      ? this.generateRandomFingerprint()
      : {
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.6 Mobile/15E148 Safari/604.1",
          viewport: { width: 430, height: 932 },
          deviceType: "iPhone (default)",
        };

    if (useRandomFingerprint) {
      console.log(
        `🎭 Using randomized fingerprint (${fingerprint.deviceType}): ${fingerprint.userAgent.substring(0, 80)}...`,
      );
      console.log(
        `🎭 Using randomized viewport: ${fingerprint.viewport.width}x${fingerprint.viewport.height}`,
      );
    } else {
      console.log(
        `🎭 Using default fingerprint (${fingerprint.deviceType}): ${fingerprint.userAgent.substring(0, 80)}...`,
      );
      console.log(
        `🎭 Using default viewport: ${fingerprint.viewport.width}x${fingerprint.viewport.height}`,
      );
    }

    // Detect platform (isLinux and hasNaturalDisplay already declared above)
    const isWindows = process.platform === "win32";

    // On Linux, always verify we have a working display
    if (isLinux) {
      console.log("🖥️ Linux detected, verifying display availability...");

      let displayWorking = false;

      // First, test if the current DISPLAY is working (if set)
      if (process.env.DISPLAY) {
        try {
          // Try to connect to the X display using native commands that are always available
          // We'll try multiple approaches in order of preference
          let testPassed = false;

          // Method 1: Try to list X server info using xset (usually available)
          try {
            execSync("xset q >/dev/null 2>&1", {
              stdio: "ignore",
              timeout: 3000,
            });
            testPassed = true;
          } catch (e) {
            // xset failed, try next method
          }

          // Method 2: Try to get display info using xwininfo on root window
          if (!testPassed) {
            try {
              execSync("xwininfo -root >/dev/null 2>&1", {
                stdio: "ignore",
                timeout: 3000,
              });
              testPassed = true;
            } catch (e) {
              // xwininfo failed, try next method
            }
          }

          // Method 3: Try to test the display using xlsclients (list X clients)
          if (!testPassed) {
            try {
              execSync("xlsclients >/dev/null 2>&1", {
                stdio: "ignore",
                timeout: 3000,
              });
              testPassed = true;
            } catch (e) {
              // xlsclients failed, try final method
            }
          }

          // Method 4: Try a basic X11 connection test using xhost
          if (!testPassed) {
            try {
              execSync("xhost >/dev/null 2>&1", {
                stdio: "ignore",
                timeout: 3000,
              });
              testPassed = true;
            } catch (e) {
              // All X11 tests failed
            }
          }

          if (testPassed) {
            console.log(
              `🖥️ Existing display ${process.env.DISPLAY} is working`,
            );
            displayWorking = true;
          } else {
            console.warn(
              `⚠️ Display ${process.env.DISPLAY} is set but not accessible (no X11 tools responded)`,
            );
          }
        } catch (e) {
          console.warn(
            `⚠️ Display ${process.env.DISPLAY} is not working or accessible`,
          );
        }
      } else {
        console.log("🖥️ No DISPLAY environment variable set");
      }

      // If we don't have a working display, check if we need to start/restart Xvfb
      if (!displayWorking) {
        console.log("🖥️ No working display found, checking Xvfb status...");

        // First, check if we have an existing Xvfb reference and verify it's still running
        if (this.xvfb && this.xvfbDisplay) {
          console.log("🖥️ Checking existing Xvfb instance...");
          try {
            // Check if the Xvfb process is still alive
            const displayNum = this.xvfbDisplay.replace(":", "");
            execSync(`pgrep -f "Xvfb.*:${displayNum}"`, { stdio: "ignore" });
            console.log(
              `🖥️ Verified Xvfb process is running on display ${this.xvfbDisplay}`,
            );
            // Xvfb library manages DISPLAY internally, no need to set it manually
            displayWorking = true;
          } catch (e) {
            console.warn(
              `⚠️ Xvfb process not found for display ${this.xvfbDisplay}, will restart it`,
            );
            this.xvfb = null;
            this.xvfbDisplay = null;
          }
        }
      }

      // If we still don't have a working display, start Xvfb
      if (!displayWorking) {
        console.log("🖥️ Starting Xvfb for virtual display...");
        try {
          // First check if Xvfb binary is available
          try {
            execSync("which Xvfb", { stdio: "ignore" });
          } catch (e) {
            console.error("❌ Xvfb binary not found in PATH");
            throw new Error(
              "Xvfb is not installed. Please install it with: sudo apt-get install xvfb",
            );
          }

          // Also check for xvfb-run as a secondary check
          try {
            execSync("which xvfb-run", { stdio: "ignore" });
          } catch (e) {
            console.warn("⚠️ xvfb-run not found, but Xvfb binary is available");
          }

          // Kill any existing Xvfb processes that might be stuck
          try {
            execSync('pkill -f "Xvfb.*:99"', { stdio: "ignore" });
            console.log("🧹 Cleaned up any existing Xvfb processes");
          } catch (e) {
            // Ignore errors - no existing processes to clean up
          }

          // Try multiple display numbers to find an available one
          const maxAttempts = 5;
          let displayNum = 99;
          let xvfbStarted = false;

          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
              console.log(
                `🖥️ Attempting to start Xvfb on display :${displayNum}...`,
              );

              this.xvfb = new Xvfb({
                silent: true,
                displayNum: displayNum,
                reuse: false,
                timeout: 10000, // Increased timeout to 10 seconds
                xvfb_args: [
                  "-screen",
                  "0",
                  "1280x720x24",
                  "-ac",
                  "+extension",
                  "GLX",
                  "-nolisten",
                  "tcp",
                  "-dpi",
                  "96",
                  "-noreset",
                  "+extension",
                  "RANDR",
                ],
              });

              this.xvfb.startSync();
              xvfbStarted = true;
              this.xvfbDisplay = process.env.DISPLAY || null; // Store the DISPLAY value
              console.log(
                `🖥️ Xvfb started successfully on display :${displayNum} (${process.env.DISPLAY})`,
              );
              break;
            } catch (displayError: any) {
              console.warn(
                `⚠️ Failed to start Xvfb on display :${displayNum}: ${displayError.message}`,
              );
              displayNum++;

              // Clean up the failed xvfb instance
              if (this.xvfb) {
                try {
                  this.xvfb.stopSync();
                } catch (cleanupError) {
                  // Ignore cleanup errors
                }
                this.xvfb = null;
              }

              if (attempt === maxAttempts - 1) {
                throw displayError;
              }
            }
          }

          if (!xvfbStarted) {
            throw new Error(
              `Failed to start Xvfb after ${maxAttempts} attempts`,
            );
          }
        } catch (error) {
          console.error("❌ Failed to start Xvfb:", error);
          console.error("💡 To fix this issue, either:");
          console.error("   1. Install Xvfb: sudo apt-get install xvfb");
          console.error(
            "   2. Run with xvfb-run: xvfb-run -a node your-app.js",
          );
          console.error(
            "   3. Set a DISPLAY environment variable if you have a GUI",
          );
          console.error(
            "   4. Try running in a container with proper display setup",
          );
          console.error(
            "   5. Ensure no other Xvfb processes are running: pkill Xvfb",
          );
          throw new Error(
            "Cannot run browser automation on Linux without a display server. Xvfb is required for headful operation - headless mode is not supported.",
          );
        }
      }
    }

    // Prepare browser arguments based on platform
    const browserArgs = [
      "--disable-blink-features=AutomationControlled",
      "--no-first-run",
      "--disable-default-browser-check",
      "--disable-password-generation",
      "--disable-save-password-bubble",
      "--disable-password-manager-reauthentication",
      "--password-store=basic",
      "--disable-features=PasswordManager",
      "--disable-features=VizDisplayCompositor",
      "--disable-password-manager",
      "--disable-save-password",
      "--disable-background-timer-throttling", // Prevent throttling
      "--disable-backgrounding-occluded-windows", // Prevent backgrounding
      // Additional stealth arguments
      "--disable-automation",
      "--disable-dev-shm-usage",
      "--disable-extensions-file-access-check",
      "--disable-extensions-http-throttling",
      "--disable-ipc-flooding-protection",
      "--disable-popup-blocking",
      "--disable-prompt-on-repost",
      "--disable-renderer-backgrounding",
      "--disable-sync",
      "--disable-translate",
      "--disable-features=TranslateUI",
      "--disable-features=Translate",
      "--metrics-recording-only",
      "--no-report-upload",
      "--disable-breakpad",
      "--disable-crash-reporter",
      "--disable-domain-reliability",
      "--disable-component-update",
      "--disable-background-networking",
      "--disable-features=InterestFeedContentSuggestions",
      "--disable-features=MediaRouter",
      "--disable-hang-monitor",
      "--disable-client-side-phishing-detection",
      "--disable-component-extensions-with-background-pages",
      "--disable-default-apps",
      "--mute-audio",
      "--no-default-browser-check",
      "--autoplay-policy=user-gesture-required",
      "--disable-features=AudioServiceOutOfProcess",
      "--force-color-profile=srgb",
      "--disable-threaded-animation",
      "--disable-threaded-scrolling",
      "--disable-checker-imaging",
      "--disable-image-animation-resync",
      "--aggressive-cache-discard",
      "--enable-surface-synchronization",
      // Advanced anti-detection flags
      "--disable-features=UserAgentClientHint",
      "--disable-features=UserAgentReduction",
      "--disable-features=WebRtcHideLocalIpsWithMdns",
      "--disable-web-security",
      "--disable-site-isolation-trials",
      "--disable-features=VizServiceDisplay",
      "--disable-features=VizHitTestSurfaceLayer",
      "--disable-features=VizDisplayCompositor",
      "--disable-logging",
      "--silent",
      "--disable-gpu-sandbox",
      "--disable-software-rasterizer",
      "--disable-zygote",
      "--no-zygote",
      "--disable-dev-tools",
      "--remote-debugging-port=0",
      "--disable-features=msSmartScreenProtection",
      "--disable-background-mode",
      "--disable-renderer-accessibility",
      "--disable-extensions",
      "--disable-plugins",
      "--disable-prerender-local-predictor",
      "--disable-sync-preferences",
      "--disable-sync-app-list",
      "--disable-speech-api",
      "--disable-file-system",
      "--disable-presentation-api",
      "--disable-permissions-api",
      "--disable-notification-content-image",
      "--disable-new-profile-management",
      "--disable-new-avatar-menu",
      "--disable-search-engine-choice-screen",
      "--simulate-outdated-no-au='Tue, 31 Dec 2099 23:59:59 GMT'",
      "--force-fieldtrials=*BackgroundTracing/default/",
      "--force-fieldtrial-params=BackgroundTracing.default:mode/preemptive",
      "--disable-field-trial-config",
      "--disable-background-tracing",
      "--disable-ipc-security-tests",
      "--allow-pre-commit-input",
      "--disable-v8-idle-tasks",
      "--max_old_space_size=4096",
    ];

    // Add platform-specific args
    if (isWindows) {
      // On Windows, start minimized
      browserArgs.push("--start-minimized");
    } else if (isLinux) {
      // On Linux with virtual display, add GPU-related args
      browserArgs.push(
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--use-gl=swiftshader",
      );
    }

    // Use persistent context instead of launch + newContext for more realistic browser behavior
    console.log("🌐 Launching persistent context with args:", browserArgs);
    this.context = await chromium.launchPersistentContext(
      "./temp-browser-profile",
      {
        channel: "chromium", // Use chromium
        headless: false, // Always headful for better compatibility
        hasTouch: true, // Simulate touch support
        isMobile: true, // Simulate mobile device
        userAgent: fingerprint.userAgent,
        viewport: fingerprint.viewport,
        args: browserArgs,
        // Add extra stealth options
        locale: "en-US",
        timezoneId: "America/New_York",
        colorScheme: "light",
        reducedMotion: "no-preference",
        forcedColors: "none",
        extraHTTPHeaders: {
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "sec-ch-ua":
            '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
          "sec-ch-ua-mobile": fingerprint.userAgent.includes("Mobile")
            ? "?1"
            : "?0",
          "sec-ch-ua-platform": fingerprint.userAgent.includes("iPhone")
            ? '"iOS"'
            : '"Android"',
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
      },
    );

    // Try to get the browser reference from the persistent context
    // Note: In some containerized environments, context.browser() may return null
    // even when the context is working perfectly fine
    if (!this.browser) {
      this.browser = this.context.browser();
    }

    // Wait a moment for browser to fully initialize
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Log browser reference status but don't fail if it's null
    // The persistent context can work fine without an explicit browser reference
    if (!this.browser) {
      console.warn(
        "⚠️ Browser reference is null, but persistent context is working",
      );
      console.log("Context details:", {
        contextExists: !!this.context,
        contextPages: this.context ? this.context.pages().length : "N/A",
      });
      console.log(
        "✅ Continuing with null browser reference (persistent context handles browser lifecycle)",
      );
    } else {
      console.log("✅ Browser instance obtained successfully");
    }
    // Minimal stealth - only hide the most obvious automation indicators
    await this.context.addInitScript((fingerprint) => {
      // Remove all webdriver traces
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      delete (window as any).webdriver;
      delete (window.navigator as any).webdriver;

      // Spoof platform and languages
      const ua = fingerprint.userAgent.toLowerCase();
      let platform = "iPhone"; // Default
      if (ua.includes("iphone")) {
        platform = "iPhone";
      } else if (ua.includes("ipad")) {
        platform = "iPad";
      } else if (ua.includes("android")) {
        platform = "Linux armv8l";
      } else if (ua.includes("win")) {
        platform = "Win32";
      }
      Object.defineProperty(navigator, "platform", { get: () => platform });
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });
      Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });

      // Additional stealth properties
      Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 4 });
      Object.defineProperty(navigator, "maxTouchPoints", {
        get: () =>
          ua.includes("iphone") || ua.includes("ipad") || ua.includes("android")
            ? 5
            : 0,
      });

      // Enhanced automation hiding
      Object.defineProperty(navigator, "connection", {
        get: () => ({
          effectiveType: "4g",
          rtt: 100 + Math.random() * 50,
          downlink: 10 + Math.random() * 5,
          saveData: false,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        }),
        configurable: false,
      });

      // Override Object.getOwnPropertyDescriptor to hide our spoofing
      const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
      Object.getOwnPropertyDescriptor = function (obj, prop) {
        if (
          obj === navigator &&
          typeof prop === "string" &&
          [
            "webdriver",
            "platform",
            "languages",
            "deviceMemory",
            "hardwareConcurrency",
            "maxTouchPoints",
            "connection",
          ].includes(prop)
        ) {
          return undefined; // Hide our modifications
        }
        return originalGetOwnPropertyDescriptor.call(this, obj, prop);
      };

      // Override Object.getOwnPropertyNames to hide automation properties
      const originalGetOwnPropertyNames = Object.getOwnPropertyNames;
      Object.getOwnPropertyNames = function (obj) {
        const props = originalGetOwnPropertyNames.call(this, obj);
        if (obj === navigator) {
          return props.filter(
            (prop) =>
              ![
                "webdriver",
                "__webdriver_script_fn",
                "__driver_evaluate",
                "__webdriver_evaluate",
                "__selenium_evaluate",
                "__fxdriver_id",
                "__fxdriver_unwrapped",
                "__webdriver_script_func",
                "__webdriver_script_function",
                "__webdriver_unwrapped",
              ].includes(prop),
          );
        }
        return props;
      };

      // Hide automation indicators
      try {
        delete (window.navigator as any).webdriver;
      } catch (e) {
        // Ignore if property can't be deleted
      }

      // More convincing Chrome object
      Object.defineProperty(window, "chrome", {
        get: () => ({
          runtime: {
            onConnect: null,
            onMessage: null,
            connect: function () {},
            sendMessage: function () {},
          },
          loadTimes: function () {
            return {
              commitLoadTime: Date.now() / 1000 - Math.random() * 10,
              connectionInfo: "h2",
              finishDocumentLoadTime: Date.now() / 1000 - Math.random() * 5,
              finishLoadTime: Date.now() / 1000 - Math.random() * 3,
              firstPaintAfterLoadTime: Date.now() / 1000 - Math.random() * 2,
              firstPaintTime: Date.now() / 1000 - Math.random() * 7,
              navigationType: "Navigation",
              npnNegotiatedProtocol: "h2",
              requestTime: Date.now() / 1000 - Math.random() * 15,
              startLoadTime: Date.now() / 1000 - Math.random() * 12,
              wasAlternateProtocolAvailable: false,
              wasFetchedViaSpdy: true,
              wasNpnNegotiated: true,
            };
          },
          csi: function () {
            return {
              pageT: Date.now() - Math.random() * 1000,
              startE: Date.now() - Math.random() * 2000,
              tran: 15,
            };
          },
          app: {
            isInstalled: false,
            InstallState: {
              DISABLED: "disabled",
              INSTALLED: "installed",
              NOT_INSTALLED: "not_installed",
            },
            RunningState: {
              CANNOT_RUN: "cannot_run",
              READY_TO_RUN: "ready_to_run",
              RUNNING: "running",
            },
          },
        }),
      });

      // Spoof screen properties to match viewport
      const screenWidth = fingerprint.viewport.width;
      const screenHeight = fingerprint.viewport.height;
      Object.defineProperty(screen, "width", { get: () => screenWidth });
      Object.defineProperty(screen, "height", { get: () => screenHeight });
      Object.defineProperty(screen, "availWidth", { get: () => screenWidth });
      Object.defineProperty(screen, "availHeight", { get: () => screenHeight });
      Object.defineProperty(screen, "colorDepth", { get: () => 24 });
      Object.defineProperty(screen, "pixelDepth", { get: () => 24 });

      // Spoof plugins with more realistic data
      const plugins = [
        {
          name: "Chrome PDF Plugin",
          filename: "internal-pdf-viewer",
          description: "Portable Document Format",
          length: 1,
        },
        {
          name: "Chrome PDF Viewer",
          filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
          description: "",
          length: 1,
        },
        {
          name: "Native Client",
          filename: "internal-nacl-plugin",
          description: "",
          length: 1,
        },
      ];
      Object.defineProperty(navigator, "plugins", {
        get: () => ({
          ...plugins,
          length: plugins.length,
          item: (index: number) => plugins[index] || null,
          namedItem: (name: string) =>
            plugins.find((p) => p.name === name) || null,
          refresh: () => {},
        }),
      });

      // Spoof WebGL vendor and renderer with more realistic mobile GPU info
      try {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (
          parameter: number,
        ) {
          if (parameter === 37445) {
            // UNMASKED_VENDOR_WEBGL
            if (ua.includes("iphone") || ua.includes("ipad")) {
              return "Apple Inc.";
            } else if (ua.includes("android")) {
              return "Qualcomm";
            }
            return "Apple Inc.";
          }
          if (parameter === 37446) {
            // UNMASKED_RENDERER_WEBGL
            if (ua.includes("iphone") || ua.includes("ipad")) {
              return "Apple A17 Pro GPU";
            } else if (ua.includes("android")) {
              return "Adreno (TM) 740";
            }
            return "Apple A17 Pro GPU";
          }
          return getParameter.call(this, parameter);
        };

        // Also spoof WebGL2 if available
        if (typeof WebGL2RenderingContext !== "undefined") {
          const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
          WebGL2RenderingContext.prototype.getParameter = function (
            parameter: number,
          ) {
            if (parameter === 37445) {
              if (ua.includes("iphone") || ua.includes("ipad")) {
                return "Apple Inc.";
              } else if (ua.includes("android")) {
                return "Qualcomm";
              }
              return "Apple Inc.";
            }
            if (parameter === 37446) {
              if (ua.includes("iphone") || ua.includes("ipad")) {
                return "Apple A17 Pro GPU";
              } else if (ua.includes("android")) {
                return "Adreno (TM) 740";
              }
              return "Apple A17 Pro GPU";
            }
            return getParameter2.call(this, parameter);
          };
        }
      } catch (e) {
        console.warn("Failed to spoof WebGL:", e);
      }

      // Spoof permissions with more realistic responses
      try {
        const originalQuery = navigator.permissions.query;
        navigator.permissions.query = function (
          parameters: PermissionDescriptor,
        ) {
          const permission = parameters.name;
          let state: PermissionState = "prompt";

          // Set realistic permission states for mobile devices
          if (permission === "notifications") {
            state = "granted";
          } else if (permission === "geolocation") {
            state = "prompt";
          } else if (permission === "camera") {
            state = "prompt";
          } else if (permission === "microphone") {
            state = "prompt";
          } else if (permission === "push") {
            state = "prompt";
          }

          return Promise.resolve({
            state: state,
            name: permission,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          } as PermissionStatus);
        };
      } catch (e) {
        console.warn("Failed to spoof permissions:", e);
      }

      // Spoof battery API for mobile realism
      if (
        ua.includes("mobile") ||
        ua.includes("iphone") ||
        ua.includes("android")
      ) {
        Object.defineProperty(navigator, "getBattery", {
          get: () => () =>
            Promise.resolve({
              charging: Math.random() > 0.5,
              chargingTime: Infinity,
              dischargingTime: Math.random() * 20000 + 3600,
              level: Math.random() * 0.5 + 0.5, // 50-100%
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => true,
            }),
        });
      }

      // Remove automation detection properties
      const propsToDelete = [
        "webdriver",
        "__webdriver_script_fn",
        "__webdriver_script_func",
        "__webdriver_script_function",
        "__fxdriver_id",
        "__fxdriver_unwrapped",
        "__driver_evaluate",
        "__webdriver_evaluate",
        "__selenium_evaluate",
        "__webdriver_script_fn",
        "__nightwatch_elem",
        "__playwright",
      ];

      propsToDelete.forEach((prop) => {
        try {
          delete (window as any)[prop];
          delete (document as any)[prop];
          delete (navigator as any)[prop];
        } catch (e) {
          // Ignore deletion errors
        }
      });

      // Override console methods to hide automation traces
      const originalConsole = { ...console };
      ["debug", "log", "warn", "error"].forEach((method) => {
        (console as any)[method] = function (...args: any[]) {
          const message = args.join(" ");
          if (
            message.includes("webdriver") ||
            message.includes("playwright") ||
            message.includes("automation") ||
            message.includes("HeadlessChrome")
          ) {
            return; // Suppress automation-related logs
          }
          (originalConsole as any)[method].apply(console, args);
        };
      });

      // Spoof media devices for mobile realism
      if (navigator.mediaDevices) {
        const originalEnumerateDevices =
          navigator.mediaDevices.enumerateDevices;
        navigator.mediaDevices.enumerateDevices = function () {
          return Promise.resolve([
            {
              deviceId: "default",
              kind: "audioinput" as MediaDeviceKind,
              label: "Default - Built-in Microphone",
              groupId: "group1",
            },
            {
              deviceId: "communications",
              kind: "audioinput" as MediaDeviceKind,
              label: "Communications - Built-in Microphone",
              groupId: "group1",
            },
            {
              deviceId: "camera1",
              kind: "videoinput" as MediaDeviceKind,
              label: "Built-in Camera",
              groupId: "group2",
            },
            {
              deviceId: "speaker1",
              kind: "audiooutput" as MediaDeviceKind,
              label: "Built-in Speaker",
              groupId: "group3",
            },
          ] as MediaDeviceInfo[]);
        };
      }

      // Add realistic timing jitter to Date.now()
      const originalDateNow = Date.now;
      let timeOffset = 0;
      Date.now = function () {
        // Add small random jitter to timing
        timeOffset += Math.random() * 2 - 1; // ±1ms jitter
        return originalDateNow() + Math.floor(timeOffset);
      };

      // Spoof performance.now() with realistic timing
      const originalPerformanceNow = performance.now;
      let performanceOffset = 0;
      performance.now = function () {
        performanceOffset += Math.random() * 0.1 - 0.05; // ±0.05ms jitter
        return originalPerformanceNow() + performanceOffset;
      };
    }, fingerprint);

    const displayMode = isWindows
      ? "headful (minimized)"
      : isLinux
        ? this.xvfbDisplay
          ? "headful (Xvfb virtual display)"
          : "headful (natural display)"
        : "headful";
    console.log(
      `🌐 Browser initialized with persistent context (${displayMode})`,
    );

    // Perform browser warmup if not already done for this profile
    if (!this.browserWarmedUp && useRandomFingerprint) {
      console.log("🔥 Warming up browser session...");
      try {
        // Create a new page for warmup activities
        const warmupPage = await this.context.newPage();

        // Visit a few common sites to establish browsing patterns
        const warmupSites = [
          "https://www.microsoft.com",
          "https://www.bing.com",
          "https://outlook.com",
          "https://www.google.com",
          "https://www.amazon.com",
          "https://www.facebook.com",
          "https://www.wikipedia.org",
          "https://www.yahoo.com",
          "https://www.ebay.com",
          "https://www.reddit.com",
        ];

        // Visit 3-4 sites randomly for warmup
        const sitesToVisit = Math.floor(Math.random() * 2) + 3; // 3 or 4 sites
        const selectedSites: string[] = [];

        for (let i = 0; i < sitesToVisit; i++) {
          const randomSite =
            warmupSites[Math.floor(Math.random() * warmupSites.length)];
          if (!selectedSites.includes(randomSite)) {
            selectedSites.push(randomSite);
          }
        }

        for (const site of selectedSites) {
          try {
            console.log(`🌐 Visiting ${site} for session warmup...`);

            await warmupPage.goto(site, {
              waitUntil: "domcontentloaded",
              timeout: 20000, // Increased timeout
            });

            // Wait for a bit, simulating reading time
            await warmupPage.waitForTimeout(2000 + Math.random() * 3000);

            // Simulate scrolling
            if (Math.random() > 0.3) {
              const scrollAmount = Math.random() * 500 + 200;
              await warmupPage.mouse.wheel(0, scrollAmount);
              await warmupPage.waitForTimeout(500 + Math.random() * 1000);
            }

            // More scrolling
            if (Math.random() > 0.5) {
              const scrollAmount2 = Math.random() * 800 + 300;
              await warmupPage.mouse.wheel(0, scrollAmount2);
              await warmupPage.waitForTimeout(1000 + Math.random() * 2000);
            }

            // Simulate some natural mouse movement over a few steps
            const viewport = warmupPage.viewportSize();
            if (viewport) {
              for (let j = 0; j < Math.floor(Math.random() * 3) + 2; j++) {
                await warmupPage.mouse.move(
                  Math.random() * viewport.width,
                  Math.random() * viewport.height,
                  { steps: 10 }, // Move in steps to look more human
                );
                await warmupPage.waitForTimeout(200 + Math.random() * 500);
              }
            }
          } catch (error) {
            console.warn(`⚠️ Warmup site ${site} failed:`, error);
            // Continue with warmup even if a site fails
          }
        }

        // Close the warmup page
        await warmupPage.close();

        // Mark warmup as completed
        this.browserWarmedUp = true;
        console.log("✅ Browser warmup completed");
      } catch (error) {
        console.warn("⚠️ Browser warmup failed:", error);
        // Don't fail the initialization if warmup fails
      }
    } else if (this.browserWarmedUp) {
      console.log("🔥 Browser profile already warmed up, skipping warmup");
    } else {
      console.log("🔥 Skipping warmup (not using randomized fingerprint)");
    }
  }

  private async closeBrowser(): Promise<void> {
    try {
      if (this.currentPage) {
        await this.currentPage.close();
        this.currentPage = null;
      }
    } catch (error) {
      console.warn("Warning: Failed to close current page:", error);
      this.currentPage = null;
    }

    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
    } catch (error) {
      console.warn("Warning: Failed to close browser context:", error);
      this.context = null;
    }

    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.warn("Warning: Failed to close browser:", error);
      this.browser = null;
    }

    // DON'T stop Xvfb here - we want to reuse it for retries
    // Xvfb will be stopped by internalCleanup when authentication is complete

    // Reset captured auth code when closing browser
    this.capturedAuthCode = null;

    // Reset warmup state when completely closing browser
    this.browserWarmedUp = false;
  }

  // Stop Xvfb when completely done (success or final failure)
  private async stopXvfb(): Promise<void> {
    if (this.xvfb) {
      const currentDisplay = this.xvfbDisplay; // Store current display before clearing
      try {
        console.log("🖥️ Stopping Xvfb...");
        this.xvfb.stopSync();
        console.log("🖥️ Xvfb stopped successfully");
      } catch (error) {
        console.warn("⚠️ Failed to stop Xvfb gracefully:", error);
        // Try to force kill if graceful stop fails
        if (currentDisplay) {
          try {
            const displayNum = currentDisplay.replace(":", "");
            execSync(`pkill -f "Xvfb.*:${displayNum}"`, { stdio: "ignore" });
            console.log("🖥️ Force killed Xvfb process");
          } catch (killError) {
            console.warn("⚠️ Failed to force kill Xvfb:", killError);
          }
        }
      } finally {
        this.xvfb = null;
        this.xvfbDisplay = null; // Clear stored display value
        // Don't modify process.env.DISPLAY - let the system handle it
      }
    }
  }

  // Enable debug mode to show browser and detailed logging
  public enableDebugMode(): void {
    this.debugMode = true;
  }

  public disableDebugMode(): void {
    this.debugMode = false;
  }

  // Private cleanup method for internal use
  private async internalCleanup(): Promise<void> {
    if (this.cleanupInProgress) {
      return; // Prevent concurrent cleanup
    }

    this.cleanupInProgress = true;

    try {
      await this.closeBrowser();
      await this.stopXvfb();
    } catch (error) {
      console.warn("Warning: Internal cleanup failed:", error);
    } finally {
      this.cleanupInProgress = false;
    }
  }

  async authenticate(): Promise<GMAPITokenResponse> {
    try {
      let loadedTokenSet = await this.loadMSToken();
      if (loadedTokenSet !== false) {
        // console.log("Using existing MS tokens");
        return await this.getGMAPIToken(loadedTokenSet);
      }

      // console.log("Performing full authentication");
      await this.doFullAuthSequence();
      loadedTokenSet = await this.loadMSToken();
      if (!loadedTokenSet)
        throw new Error(
          "Failed to load MS token set and could not generate a new one",
        );
      return await this.getGMAPIToken(loadedTokenSet);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.handleRequestError(error);
      } else {
        console.error("Authentication failed:", error);
      }

      // Ensure cleanup happens on any authentication error
      try {
        await this.internalCleanup();
      } catch (cleanupError) {
        console.warn(
          "Warning: Cleanup failed in authenticate error handler:",
          cleanupError,
        );
      }

      throw error;
    }
  }
  async doFullAuthSequence(): Promise<TokenSet> {
    const maxRetries = 4; // Increased from 2 to 4 (5 total attempts)
    let lastError: Error | null = null;
    let useRandomFingerprint = true; // Always use randomized fingerprint for better evasion

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(
            `🔄 Authentication attempt ${attempt + 1}/${maxRetries + 1} (retry ${attempt})`,
          );

          // More sophisticated backoff with human-like patterns
          const baseDelayMs =
            lastError && lastError.message.includes("Access Denied")
              ? 20000 + Math.random() * 10000 // 20-30 seconds for access denied with randomization
              : 8000 + Math.random() * 4000; // 8-12 seconds for other errors

          const exponentialDelay = baseDelayMs * Math.pow(1.5, attempt - 1); // Reduced exponential factor
          const jitter = Math.random() * 0.5 * exponentialDelay; // 50% jitter for unpredictability
          const delayMs = Math.floor(exponentialDelay + jitter);

          const delaySeconds = (delayMs / 1000).toFixed(1);
          console.log(
            `⏳ Will retry authentication in ${delaySeconds} seconds...`,
          );

          // Add random micro-breaks during long delays to simulate human behavior
          let remainingDelay = delayMs;
          while (remainingDelay > 5000) {
            const microBreak = Math.min(5000, remainingDelay);
            await new Promise((resolve) => setTimeout(resolve, microBreak));
            remainingDelay -= microBreak;

            // Occasional longer pause (like human getting distracted)
            if (Math.random() < 0.1) {
              const extraPause = Math.random() * 3000 + 1000;
              console.log(
                `🤔 Taking a brief pause... (${(extraPause / 1000).toFixed(1)}s)`,
              );
              await new Promise((resolve) => setTimeout(resolve, extraPause));
            }
          }

          if (remainingDelay > 0) {
            await new Promise((resolve) => setTimeout(resolve, remainingDelay));
          }
        }

        // Reset any previously captured authorization code
        this.capturedAuthCode = null;

        const { authorizationUrl, code_verifier } =
          await this.startMSAuthorizationFlow();

        // Use browser automation with randomized fingerprint for better evasion
        if (attempt === 0) {
          console.log(
            "🎭 Using randomized browser fingerprint for authentication",
          );

          // Pre-warm the browser session with Microsoft domains to establish legitimacy
          console.log(
            "🔥 Pre-warming browser session with Microsoft domains...",
          );
          try {
            if (!this.context) {
              throw new Error("Browser context not available for pre-warming");
            }

            const warmupPage = await this.context.newPage();

            // Visit Microsoft login page without credentials to establish session
            await warmupPage.goto("https://login.microsoftonline.com", {
              waitUntil: "domcontentloaded",
              timeout: 15000,
            });

            // Simulate light browsing behavior
            await warmupPage.waitForTimeout(2000 + Math.random() * 3000);

            // Scroll around like a real user
            if (Math.random() > 0.3) {
              await warmupPage.mouse.wheel(0, Math.random() * 300 + 100);
              await warmupPage.waitForTimeout(1000 + Math.random() * 2000);
            }

            // Move mouse around naturally
            const viewport = warmupPage.viewportSize();
            if (viewport) {
              for (let i = 0; i < 2; i++) {
                await warmupPage.mouse.move(
                  Math.random() * viewport.width,
                  Math.random() * viewport.height,
                  { steps: Math.floor(Math.random() * 8) + 3 },
                );
                await warmupPage.waitForTimeout(500 + Math.random() * 1000);
              }
            }

            await warmupPage.close();
            console.log("✅ Pre-warming completed successfully");

            // Small delay after warmup
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 + Math.random() * 2000),
            );
          } catch (warmupError) {
            console.warn(
              "⚠️ Pre-warming failed, continuing anyway:",
              warmupError,
            );
          }
        }
        await this.submitCredentials(authorizationUrl, useRandomFingerprint);

        // Only call handleMFA if the auth code wasn't captured by submitCredentials
        if (!this.capturedAuthCode) {
          await this.handleMFA();
        }

        const authCode = await this.getAuthorizationCode();
        if (!authCode) {
          throw new Error(
            "🚫 Failed to get authorization code after all attempts. Possible incorrect credentials, MFA issue, or unexpected page flow.",
          );
        }

        const tokenSet = await this.getMSToken(authCode, code_verifier);
        await this.saveTokens(tokenSet);

        if (attempt > 0) {
          console.log(`✅ Authentication succeeded on attempt ${attempt + 1}`);
        }

        // Always clean up browser resources after successful authentication
        try {
          await this.internalCleanup();
        } catch (cleanupError) {
          console.warn(
            "Warning: Browser cleanup failed after success:",
            cleanupError,
          );
        }

        return tokenSet;
      } catch (error) {
        lastError = error as Error;
        console.error(
          `❌ Authentication attempt ${attempt + 1} failed:`,
          error,
        );

        // Always clean up browser resources after each attempt
        try {
          await this.closeBrowser();
        } catch (cleanupError) {
          console.warn("Warning: Browser cleanup failed:", cleanupError);
        }

        // If this is not the last attempt, continue to retry
        if (attempt < maxRetries) {
          const isAccessDenied = lastError.message.includes("Access Denied");
          const nextDelaySeconds = isAccessDenied
            ? `${((12000 * Math.pow(2, attempt)) / 1000).toFixed(1)}-${((12000 * Math.pow(2, attempt) * 1.4) / 1000).toFixed(1)}`
            : `${((5000 * Math.pow(2, attempt)) / 1000).toFixed(1)}-${((5000 * Math.pow(2, attempt) * 1.4) / 1000).toFixed(1)}`;
          console.log(
            `⏳ Will retry authentication in ~${nextDelaySeconds} seconds...`,
          );
          continue;
        }
      }
    }

    // If we get here, all retries failed
    console.error(`🚫 Authentication failed after ${maxRetries + 1} attempts`);

    // Clean up on final failure
    try {
      await this.internalCleanup();
    } catch (cleanupError) {
      console.warn(
        "Warning: Cleanup failed after final failure:",
        cleanupError,
      );
    }

    throw (
      lastError || new Error("Authentication failed after all retry attempts")
    );
  }

  private async saveTokens(tokenSet: TokenSet): Promise<void> {
    // console.log("Saving MS tokens to ", this.MSTokenPath);
    fs.writeFileSync(this.MSTokenPath, JSON.stringify(tokenSet));

    // Save the GM API token as well
    if (this.currentGMAPIToken) {
      const tokenFilePath = this.GMTokenPath; // Define the path for the token file
      // console.log("Saving GM tokens to ", this.GMTokenPath);
      fs.writeFileSync(tokenFilePath, JSON.stringify(this.currentGMAPIToken));
      // console.log("Saved current GM API token to ", tokenFilePath);
    }
  }
  private async getAuthorizationCode(): Promise<string | null> {
    // Return the authorization code captured during the browser flow
    if (this.capturedAuthCode) {
      console.log("Using authorization code captured from browser redirect");
      return this.capturedAuthCode;
    } else {
      return null;
    }
  }
  private async handleMFA(): Promise<void> {
    console.log("Handling MFA via browser automation");

    if (!this.context || !this.currentPage) {
      throw new Error(
        "Browser context and page not initialized - call submitCredentials first",
      );
    }

    const page = this.currentPage;
    console.log("Page title:", await page.title());

    try {
      // Wait for MFA page to load
      await page.waitForLoadState("networkidle");

      // Look for MFA elements
      await page.waitForSelector(
        'input[name="otpCode"], input[name="emailMfa"], input[name="strongAuthenticationPhoneNumber"]',
        { timeout: 60000 },
      );

      const pageContent = await page.content();

      // Determine MFA type
      let mfaType = null;
      if (
        (await page.locator('input[name="otpCode"]').count()) > 0 ||
        pageContent.includes("otpCode")
      ) {
        mfaType = "TOTP";
      } else if (
        (await page.locator('input[name="emailMfa"]').count()) > 0 ||
        pageContent.includes("emailMfa")
      ) {
        mfaType = "EMAIL";
      } else if (
        (await page
          .locator('input[name="strongAuthenticationPhoneNumber"]')
          .count()) > 0 ||
        pageContent.includes("strongAuthenticationPhoneNumber")
      ) {
        mfaType = "SMS";
      }

      if (mfaType == null) {
        throw new Error("Could not determine MFA Type. Bad email or password?");
      }

      if (mfaType != "TOTP") {
        throw new Error(
          `Only TOTP via "Third-Party Authenticator" is currently supported by this implementation. Please update your OnStar account to use this method, if possible.`,
        );
      }

      // Generate TOTP code
      var totp_secret = this.config.totpKey.trim();
      // Handle instances where users blindly copy the TOTP link. We can just extract the key.
      if (totp_secret.includes("secret=")) {
        const match = this.getRegexMatch(totp_secret, "secret=(.*?)&");
        totp_secret = match ?? totp_secret;
      }
      if (totp_secret.length != 16) {
        throw new Error(
          "Provided TOTP Key does not meet expected key length. Key should be 16 alphanumeric characters.",
        );
      }

      const { otp } = TOTP.generate(totp_secret, {
        digits: 6,
        algorithm: "SHA-1",
        period: 30,
      });

      console.log("Submitting OTP Code:", otp); // Fill in the OTP code
      const otpField = await page
        .locator(
          'input[name="otpCode"], [aria-label*="One-Time Passcode"i], [aria-label*="OTP"i]',
        )
        .first();
      await otpField.click({ delay: Math.random() * 200 + 50 });
      await otpField.type(otp, { delay: Math.random() * 150 + 50 });
      await page.waitForTimeout(500 + Math.random() * 500); // Pause before clicking

      // Enable CDP Network domain for low-level network monitoring
      const client = await page.context().newCDPSession(page);
      await client.send("Network.enable");

      // Set up CDP network listener to catch everything that appears in DevTools
      client.on("Network.requestWillBeSent", (params: any) => {
        const requestUrl = params.request.url;
        // if (this.debugMode) {
        //   console.log(
        //     `[DEBUG handleMFA CDP requestWillBeSent] Request to: ${requestUrl}`,
        //   );
        // }

        if (
          requestUrl
            .toLowerCase()
            .startsWith("msauth.com.gm.mychevrolet://auth")
        ) {
          console.log(
            `[SUCCESS handleMFA CDP requestWillBeSent] Captured msauth redirect via CDP. URL: ${requestUrl}`,
          );
          this.capturedAuthCode = this.getRegexMatch(
            requestUrl,
            `[?&]code=([^&]*)`,
          );
          if (this.capturedAuthCode) {
            console.log(
              `[SUCCESS handleMFA CDP requestWillBeSent] Extracted authorization code: ${this.capturedAuthCode}`,
            );
          } else {
            console.error(
              `[ERROR handleMFA CDP requestWillBeSent] msauth redirect found, but FAILED to extract code from: ${requestUrl}`,
            );
          }
        }
      });

      // // Also listen for redirects at CDP level
      // client.on("Network.responseReceived", (params: any) => {
      //   const response = params.response;
      //   if (
      //     (response.status === 301 || response.status === 302) &&
      //     response.headers &&
      //     response.headers.location
      //   ) {
      //     const location = response.headers.location;
      //     if (this.debugMode) {
      //       console.log(
      //         `[DEBUG handleMFA CDP responseReceived] Redirect from ${response.url} to: ${location}`,
      //       );
      //     }

      //     if (
      //       location
      //         .toLowerCase()
      //         .startsWith("msauth.com.gm.mychevrolet://auth")
      //     ) {
      //       console.log(
      //         `[SUCCESS handleMFA CDP responseReceived] Captured msauth redirect via CDP response. Location: ${location}`,
      //       );
      //       this.capturedAuthCode = this.getRegexMatch(
      //         location,
      //         `[?&]code=([^&]*)`,
      //       );
      //       if (this.capturedAuthCode) {
      //         console.log(
      //           `[SUCCESS handleMFA CDP responseReceived] Extracted authorization code: ${this.capturedAuthCode}`,
      //         );
      //       } else {
      //         console.error(
      //           `[ERROR handleMFA CDP responseReceived] msauth redirect found, but FAILED to extract code from: ${location}`,
      //         );
      //       }
      //     }
      //   }
      // });

      // Submit the MFA form
      const submitMfaButton = await page // Renamed variable to avoid conflict
        .locator(
          'button[type="submit"], input[type="submit"], button:has-text("Verify"), button:has-text("Continue"), button:has-text("Submit"), [role="button"][aria-label*="Verify"i], [role="button"][aria-label*="Continue"i], [role="button"][aria-label*="Submit"i]',
        )
        .first();
      await submitMfaButton.waitFor({ timeout: 60000 });

      await submitMfaButton.click();

      if (this.debugMode)
        console.log("⌛ Waiting for redirect after MFA submission...");
      await page.waitForLoadState("networkidle", { timeout: 60000 }); // Wait for potential redirects or network activity

      try {
        // Wait for the auth code to be captured by CDP listeners
        if (this.debugMode)
          console.log(
            "⌛ [handleMFA] Waiting for auth code capture after submit...",
          );
        const captured = await this.waitForAuthCode(60000); // Use the new helper
        if (!captured && this.debugMode) {
          console.log(
            "🚫 [handleMFA] Did not capture auth code after submit within timeout.",
          );
        }
      } catch (e) {
        console.error("🚫 [handleMFA] Error during waitForAuthCode:", e);
      }

      try {
        await client.detach();
      } catch (e) {
        // CDP session might already be detached
      }

      if (this.debugMode)
        console.log("⌛ Waiting for redirect after MFA submission...");
      await page.waitForLoadState("networkidle");

      if (this.capturedAuthCode) {
        console.log("Successfully captured authorization code");
      } else {
        console.log(
          "Failed to capture authorization code from browser redirect",
        );
      }
    } catch (error) {
      console.error("Error in handleMFA:", error);
      throw error;
    }
  }

  private async syncCookiesFromBrowser(): Promise<void> {
    if (!this.context) return;

    // Get all cookies from the browser context
    const cookies = await this.context.cookies();

    // Add each cookie to the tough-cookie jar
    for (const cookie of cookies) {
      const cookieString = `${cookie.name}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}`;
      try {
        await this.jar.setCookie(cookieString, `https://${cookie.domain}`);
      } catch (error) {
        // Skip cookies that can't be set (e.g., invalid format)
        console.warn(`Failed to sync cookie ${cookie.name}:`, error);
      }
    }
  }

  // Generate randomized browser fingerprint to avoid detection
  private generateRandomFingerprint() {
    const deviceProfiles = [
      // iPhones
      {
        type: "iPhone",
        osVersions: [
          "15_8_3",
          "16_0",
          "16_1",
          "16_2",
          "16_3",
          "16_4",
          "16_5",
          "16_6",
          "16_7",
          "17_0",
          "17_1",
          "17_2",
          "17_3",
          "17_4",
          "17_5",
          "17_6",
          "18_0",
          "18_1",
          "18_2",
          "18_3",
        ],
        safariVersions: [
          "604.1",
          "605.1.15",
          "606.1.36",
          "607.1.56",
          "608.1.49",
          "609.1.20",
          "610.4.3",
          "611.2.7",
        ],
        webkitVersions: [
          "605.1.15",
          "606.4.10",
          "607.3.10",
          "608.4.9",
          "609.4.1",
          "610.1.28",
          "611.3.10",
          "612.1.6",
        ],
        viewports: [
          { width: 430, height: 932 }, // iPhone 15 Pro Max
          { width: 393, height: 852 }, // iPhone 15 Pro
          { width: 390, height: 844 }, // iPhone 15/15 Plus
          { width: 428, height: 926 }, // iPhone 14 Pro Max
          { width: 393, height: 852 }, // iPhone 14 Pro
          { width: 390, height: 844 }, // iPhone 14/14 Plus
          { width: 428, height: 926 }, // iPhone 13 Pro Max
          { width: 390, height: 844 }, // iPhone 13/13 Pro/13 Mini
          { width: 375, height: 812 }, // iPhone 12/12 Pro/12 Mini
          { width: 414, height: 896 }, // iPhone 11/11 Pro Max/XR/XS Max
          { width: 375, height: 812 }, // iPhone X/XS/11 Pro
          { width: 414, height: 736 }, // iPhone 8 Plus/7 Plus/6s Plus
          { width: 375, height: 667 }, // iPhone 8/7/6s/6/SE
        ],
        getUserAgent: (p: any) =>
          `Mozilla/5.0 (iPhone; CPU iPhone OS ${this.getRandom(p.osVersions)} like Mac OS X) AppleWebKit/${this.getRandom(p.webkitVersions)} (KHTML, like Gecko) Version/${this.getRandom(p.safariVersions)} Mobile/15E148 Safari/${this.getRandom(p.safariVersions)}`,
      },
      // iPads
      {
        type: "iPad",
        osVersions: [
          "15_8_3",
          "16_0",
          "16_1",
          "16_2",
          "16_3",
          "16_4",
          "16_5",
          "16_6",
          "16_7",
          "17_0",
          "17_1",
          "17_2",
          "17_3",
          "17_4",
          "17_5",
          "17_6",
          "18_0",
          "18_1",
        ],
        safariVersions: [
          "604.1",
          "605.1.15",
          "606.1.36",
          "607.1.56",
          "608.1.49",
          "609.1.20",
        ],
        webkitVersions: [
          "605.1.15",
          "606.4.10",
          "607.3.10",
          "608.4.9",
          "609.4.1",
          "610.1.28",
        ],
        viewports: [
          { width: 1024, height: 1366 }, // iPad Pro 12.9"
          { width: 834, height: 1194 }, // iPad Pro 11"
          { width: 820, height: 1180 }, // iPad Air
          { width: 768, height: 1024 }, // iPad Mini/9.7"
        ],
        getUserAgent: (p: any) =>
          `Mozilla/5.0 (iPad; CPU OS ${this.getRandom(p.osVersions)} like Mac OS X) AppleWebKit/${this.getRandom(p.webkitVersions)} (KHTML, like Gecko) Version/${this.getRandom(p.safariVersions)} Mobile/15E148 Safari/${this.getRandom(p.safariVersions)}`,
      },
      // Samsung Phones (Android)
      {
        type: "Samsung Phone",
        androidVersions: ["13", "14", "15"],
        chromeVersions: ["124.0.6367.113", "125.0.6422.112", "126.0.6478.71"],
        models: [
          "SM-S928B", // Galaxy S24 Ultra
          "SM-S918U", // Galaxy S23 Ultra
          "SM-G998B", // Galaxy S21 Ultra
          "SM-F946B", // Galaxy Z Fold 5
        ],
        viewports: [
          { width: 412, height: 915 },
          { width: 384, height: 854 },
          { width: 360, height: 740 },
        ],
        getUserAgent: (p: any) =>
          `Mozilla/5.0 (Linux; Android ${this.getRandom(p.androidVersions)}; ${this.getRandom(p.models)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.getRandom(p.chromeVersions)} Mobile Safari/537.36`,
      },
      // Google Pixel Phones (Android)
      {
        type: "Google Pixel",
        androidVersions: ["12", "13", "14", "15"],
        chromeVersions: [
          "122.0.6261.119",
          "123.0.6312.99",
          "124.0.6367.113",
          "125.0.6422.112",
          "126.0.6478.71",
          "127.0.6533.64",
        ],
        models: [
          "Pixel 9 Pro XL",
          "Pixel 9 Pro",
          "Pixel 9",
          "Pixel 8a",
          "Pixel 8 Pro",
          "Pixel 8",
          "Pixel 7a",
          "Pixel 7 Pro",
          "Pixel 7",
          "Pixel 6a",
          "Pixel 6 Pro",
          "Pixel 6",
          "Pixel 5a",
          "Pixel 5",
          "Pixel 4a",
          "Pixel 4",
        ],
        viewports: [
          { width: 412, height: 915 }, // Pixel 9 Pro XL
          { width: 384, height: 854 }, // Pixel 9 Pro
          { width: 393, height: 851 }, // Pixel 9/8/7
          { width: 412, height: 892 }, // Pixel 8a/7a/6a
          { width: 412, height: 869 }, // Pixel 6 Pro
          { width: 393, height: 786 }, // Pixel 5a/5
          { width: 393, height: 851 }, // Pixel 4a/4
        ],
        getUserAgent: (p: any) =>
          `Mozilla/5.0 (Linux; Android ${this.getRandom(p.androidVersions)}; ${this.getRandom(p.models)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.getRandom(p.chromeVersions)} Mobile Safari/537.36`,
      },
      // Microsoft Surface (Windows Tablet)
      {
        type: "Microsoft Surface",
        edgeVersions: ["124.0.2478.80", "125.0.2535.51", "126.0.2592.56"],
        chromeVersions: ["124.0.6367.113", "125.0.6422.112", "126.0.6478.71"],
        viewports: [
          { width: 915, height: 1368 }, // Surface Pro
          { width: 810, height: 1080 }, // Surface Go
        ],
        getUserAgent: (p: any) =>
          `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.getRandom(p.chromeVersions)} Safari/537.36 Edg/${this.getRandom(p.edgeVersions)}`,
      },
    ];

    // Select a random device profile
    const profile = this.getRandom(deviceProfiles);

    // Generate user agent and viewport from the selected profile
    const userAgent = profile.getUserAgent(profile);
    const viewport = this.getRandom(profile.viewports);

    return { userAgent, viewport, deviceType: profile.type };
  }

  // Helper to get a random element from an array
  private getRandom(arr: any[]) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private async submitCredentials(
    authorizationUrl: string,
    useRandomFingerprint: boolean = false,
  ): Promise<void> {
    console.log("Starting browser-based authentication");

    // Initialize browser if not already done
    await this.initBrowser(useRandomFingerprint);
    if (!this.context) {
      throw new Error("Browser context not initialized");
    }

    const page = await this.context.newPage();
    this.currentPage = page;

    try {
      // Navigate to the authorization URL
      console.log("Navigating to auth URL...");
      let attempts = 0;
      const maxAttempts = 3;
      let navigationSuccessful = false;
      while (attempts < maxAttempts && !navigationSuccessful) {
        try {
          await page.goto(authorizationUrl, {
            waitUntil: "load", // Changed from domcontentloaded
            timeout: 60000, // Increased timeout
          });
          navigationSuccessful = true;
        } catch (e: any) {
          attempts++;
          console.warn(`Navigation attempt ${attempts} failed: ${e.message}`);
          if (attempts >= maxAttempts) {
            throw e; // Re-throw the error after max attempts
          }
          await page.waitForTimeout(2000 * attempts); // Exponential backoff
        }
      }

      await page.waitForLoadState("networkidle", { timeout: 60000 }); // Keep this for after successful goto

      console.log("Page loaded, current URL:", page.url());
      console.log("Page title:", await page.title());

      // Simulate human browsing behavior - scroll and mouse movement
      await page.waitForTimeout(1000 + Math.random() * 2000);

      // Random mouse movements to simulate reading
      const viewport = page.viewportSize();
      if (viewport) {
        for (let i = 0; i < 3; i++) {
          await page.mouse.move(
            Math.random() * viewport.width,
            Math.random() * viewport.height,
            { steps: Math.floor(Math.random() * 10) + 5 },
          );
          await page.waitForTimeout(500 + Math.random() * 1000);
        }
      }

      // Simulate slight scrolling (like humans checking the page)
      if (Math.random() > 0.3) {
        await page.mouse.wheel(0, Math.random() * 200 + 50);
        await page.waitForTimeout(300 + Math.random() * 500);
        await page.mouse.wheel(0, -(Math.random() * 100 + 25)); // Scroll back up a bit
        await page.waitForTimeout(200 + Math.random() * 400);
      }

      // Check if we're stuck on a loading page
      const title = await page.title();
      if (
        title.includes("Loading") ||
        title.trim() === "" ||
        title.includes("...")
      ) {
        console.log("Detected loading page, attempting to recover...");
        // await page.screenshot({
        //   path: "debug-loading-page.png",
        //   fullPage: true,
        // });
        // console.log("Screenshot saved as debug-loading-page.png");

        // Try refreshing the page
        console.log("Attempting page refresh...");
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle");

        const newTitle = await page.title();
        console.log("Page title after refresh:", newTitle);
      }

      console.log("Looking for email field...");

      // Find and fill email field
      const emailField = page
        .locator(
          'input[type="email"], input[name="logonIdentifier"], input#logonIdentifier, [aria-label*="Email"i], [placeholder*="Email"i]',
        )
        .first();
      await emailField.waitFor({ timeout: 60000 });

      // Simulate realistic human behavior - pause to "read" the page
      await page.waitForTimeout(2000 + Math.random() * 3000);

      // Simulate mouse movement before clicking email field
      const emailBox = await emailField.boundingBox();
      if (emailBox) {
        // Move mouse to a random point near the email field first
        await page.mouse.move(
          emailBox.x +
            emailBox.width * 0.1 +
            Math.random() * (emailBox.width * 0.3),
          emailBox.y +
            emailBox.height * 0.1 +
            Math.random() * (emailBox.height * 0.3),
          { steps: Math.floor(Math.random() * 10) + 5 },
        );
        await page.waitForTimeout(200 + Math.random() * 500);
      }

      await emailField.click({ delay: Math.random() * 200 + 50 });

      // Simulate realistic typing with occasional pauses (like humans do)
      const email = this.config.username;
      for (let i = 0; i < email.length; i++) {
        await page.keyboard.type(email[i], { delay: Math.random() * 150 + 50 });

        // Occasionally pause while typing (like humans thinking)
        if (Math.random() < 0.1) {
          await page.waitForTimeout(300 + Math.random() * 800);
        }
      }

      console.log("Looking for Continue button...");
      await page.waitForTimeout(800 + Math.random() * 1200); // Human hesitation before proceeding

      // Click continue button with realistic mouse movement
      const continueButton = page
        .locator(
          'button#continue[data-dtm="sign in"][aria-label="Continue"], button:has-text("Continue")[data-dtm="sign in"], [role="button"][aria-label*="Continue"i]',
        )
        .first();
      await continueButton.waitFor({ timeout: 60000 });

      // Hover before clicking (human-like behavior)
      await continueButton.hover();
      await page.waitForTimeout(200 + Math.random() * 400);

      // Move mouse slightly before final click
      const continueBox = await continueButton.boundingBox();
      if (continueBox) {
        await page.mouse.move(
          continueBox.x + continueBox.width * (0.3 + Math.random() * 0.4),
          continueBox.y + continueBox.height * (0.3 + Math.random() * 0.4),
          { steps: 3 },
        );
        await page.waitForTimeout(100 + Math.random() * 200);
      }

      await continueButton.click({ delay: Math.random() * 200 + 50 });

      console.log("Looking for Password field...");

      // Wait for password page and fill password
      await page.waitForLoadState("networkidle", { timeout: 60000 });

      const passwordField = page
        .locator(
          'input[type="password"], input[name="password"], [aria-label*="Password"i], [placeholder*="Password"i]',
        )
        .first();
      await passwordField.waitFor({ timeout: 60000 });

      // Simulate human behavior - pause to see the new page
      await page.waitForTimeout(1500 + Math.random() * 2500);

      // Simulate mouse movement before password field interaction
      const passwordBox = await passwordField.boundingBox();
      if (passwordBox) {
        // Move to password field area with realistic movement
        await page.mouse.move(
          passwordBox.x +
            passwordBox.width * 0.2 +
            Math.random() * (passwordBox.width * 0.3),
          passwordBox.y +
            passwordBox.height * 0.2 +
            Math.random() * (passwordBox.height * 0.3),
          { steps: Math.floor(Math.random() * 8) + 4 },
        );
        await page.waitForTimeout(150 + Math.random() * 300);
      }

      await passwordField.click({ delay: Math.random() * 200 + 50 });

      // Type password with human-like patterns
      const password = this.config.password;
      for (let i = 0; i < password.length; i++) {
        await page.keyboard.type(password[i], {
          delay: Math.random() * 120 + 40,
        });

        // Occasional hesitation while typing password
        if (Math.random() < 0.08) {
          await page.waitForTimeout(200 + Math.random() * 600);
        }
      }
      console.log(
        "Looking for Sign In button and preparing to capture redirect...",
      );
      await page.waitForTimeout(500 + Math.random() * 500); // Pause before clicking

      // Enable CDP Network domain for low-level network monitoring
      const client = await page.context().newCDPSession(page);
      await client.send("Network.enable");

      // Flag to track if access is denied
      let accessDenied = false;

      // Set up CDP network listener to catch everything that appears in DevTools
      client.on("Network.requestWillBeSent", (params: any) => {
        const requestUrl = params.request.url;
        if (this.debugMode) {
          // console.log(
          //   `[DEBUG CDP requestWillBeSent] Request to: ${requestUrl}`,
          // );
        }

        if (
          requestUrl
            .toLowerCase()
            .startsWith("msauth.com.gm.mychevrolet://auth")
        ) {
          console.log(
            `[SUCCESS CDP requestWillBeSent] Captured msauth redirect via CDP. URL: ${requestUrl}`,
          );
          this.capturedAuthCode = this.getRegexMatch(
            requestUrl,
            `[?&]code=([^&]*)`,
          );
          if (this.capturedAuthCode) {
            console.log(
              `[SUCCESS CDP requestWillBeSent] Extracted authorization code: ${this.capturedAuthCode}`,
            );
          } else {
            console.error(
              `[ERROR CDP requestWillBeSent] msauth redirect found, but FAILED to extract code from: ${requestUrl}`,
            );
          }
        }
      });

      // Listen for responses to check for Access Denied
      client.on("Network.responseReceived", async (params: any) => {
        const response = params.response;

        try {
          // Get the response body to check for access denied
          const responseBody = await client.send("Network.getResponseBody", {
            requestId: params.requestId,
          });

          if (
            responseBody.body &&
            responseBody.body.includes("<TITLE>Access Denied</TITLE>")
          ) {
            console.log(
              `[ACCESS DENIED] Detected access denied response from: ${response.url}`,
            );
            accessDenied = true;
          }
        } catch (error) {
          // Ignore errors when getting response body (some responses may not be available)
        }

        // Also check redirects at CDP level for auth codes
        if (
          (response.status === 301 || response.status === 302) &&
          response.headers &&
          response.headers.location
        ) {
          const location = response.headers.location;
          if (this.debugMode) {
            console.log(
              `[DEBUG CDP responseReceived] Redirect from ${response.url} to: ${location}`,
            );
          }

          if (
            location
              .toLowerCase()
              .startsWith("msauth.com.gm.mychevrolet://auth")
          ) {
            console.log(
              `[SUCCESS CDP responseReceived] Captured msauth redirect via CDP response. Location: ${location}`,
            );
            this.capturedAuthCode = this.getRegexMatch(
              location,
              `[?&]code=([^&]*)`,
            );
            if (this.capturedAuthCode) {
              console.log(
                `[SUCCESS CDP responseReceived] Extracted authorization code: ${this.capturedAuthCode}`,
              );
            } else {
              console.error(
                `[ERROR CDP responseReceived] msauth redirect found, but FAILED to extract code from: ${location}`,
              );
            }
          }
        }
      });

      // Click the sign-in button
      const submitButton = page
        .locator(
          'button#continue[data-dtm="sign in"][aria-label="Sign in"], button:has-text("Log In")[data-dtm="sign in"], button:has-text("Sign in")[data-dtm="sign in"], [role="button"][aria-label*="Sign in"i], [role="button"][aria-label*="Log In"i]',
        )
        .first();

      await submitButton.waitFor({ timeout: 60000 });
      await submitButton.hover();
      await page.waitForTimeout(100 + Math.random() * 200);
      await submitButton.click({ delay: Math.random() * 200 + 50 });

      // Wait a bit for the redirect to potentially happen
      await page.waitForTimeout(3000);
      var postSubmitTitle = await page.title();

      // Check for access denied response detected by CDP
      if (accessDenied) {
        throw new Error(
          "🚫 Access Denied: Authentication blocked. This could be due to rate limiting, IP blocking, or security restrictions. Please wait before retrying or check if your IP is blocked.",
        );
      }

      // Wait for network to be idle in case other things are happening,
      // or if MFA is indeed the next step.
      console.log(
        "Waiting for network idle after credential submission attempt...",
      );
      await page.waitForLoadState("networkidle", { timeout: 60000 });
      // Wait a bit for the redirect to potentially happen
      await page.waitForTimeout(3000);
      postSubmitTitle = await page.title();

      await page.waitForLoadState("networkidle", { timeout: 60000 });

      postSubmitTitle = await page.title();

      // Check if we're still on the sign-in page (credential submission failed)
      if (postSubmitTitle.toLowerCase().includes("sign in")) {
        console.log(
          `⚠️ Still on sign-in page after credential submission: "${postSubmitTitle}". This suggests credentials weren't accepted properly.`,
        );

        // // Check for any error messages on the page
        // const errorMessages = await page
        //   .locator(
        //     '[role="alert"], .error, .alert, [class*="error"], [class*="alert"]',
        //   )
        //   .allTextContents();
        // if (errorMessages.length > 0) {
        //   console.log("Found error messages on page:", errorMessages);
        //   throw new Error(
        //     `Authentication failed with errors: ${errorMessages.join(", ")}`,
        //   );
        // }

        // Try refreshing and re-submitting credentials once more
        console.log(
          "🔄 Attempting to refresh page and retry credential submission...",
        );
        await page.reload({ waitUntil: "networkidle" });

        // Re-find and fill email field
        const retryEmailField = page
          .locator(
            'input[type="email"], input[name="logonIdentifier"], input#logonIdentifier, [aria-label*="Email"i], [placeholder*="Email"i]',
          )
          .first();
        await retryEmailField.waitFor({ timeout: 30000 });
        await retryEmailField.fill(this.config.username);

        // Click continue button again
        const retryContinueButton = page
          .locator(
            'button#continue[data-dtm="sign in"][aria-label="Continue"], button:has-text("Continue")[data-dtm="sign in"], [role="button"][aria-label*="Continue"i]',
          )
          .first();
        await retryContinueButton.click();

        // Wait for password page
        await page.waitForLoadState("networkidle", { timeout: 30000 });

        // Re-find and fill password field
        const retryPasswordField = page
          .locator(
            'input[type="password"], input[name="password"], [aria-label*="Password"i], [placeholder*="Password"i]',
          )
          .first();
        await retryPasswordField.waitFor({ timeout: 30000 });
        await retryPasswordField.fill(this.config.password);

        // Click the sign-in button again
        const retrySubmitButton = page
          .locator(
            'button#continue[data-dtm="sign in"][aria-label="Sign in"], button:has-text("Log In")[data-dtm="sign in"], button:has-text("Sign in")[data-dtm="sign in"], [role="button"][aria-label*="Sign in"i], [role="button"][aria-label*="Log In"i]',
          )
          .first();
        await retrySubmitButton.waitFor({ timeout: 30000 });
        await retrySubmitButton.click();

        // Wait for response after retry
        await page.waitForTimeout(3000);
        await page.waitForLoadState("networkidle", { timeout: 60000 });

        const retryTitle = await page.title();
        console.log(`Page title after retry: "${retryTitle}"`);

        // // If still stuck on sign-in page after retry, something is seriously wrong
        // if (retryTitle.toLowerCase().includes("sign in")) {
        //   // Save a screenshot
        //   await page.screenshot({
        //     path: "debug-retry-failed.png",
        //     fullPage: true,
        //   });
        //   throw new Error(
        //     `Credentials repeatedly rejected. Page title after retry: "${retryTitle}". Please check your username and password.`,
        //   );
        // }

        // Update postSubmitTitle for subsequent checks
        postSubmitTitle = retryTitle;
      }

      // if the current page title contains "Verify" or "MFA" or "Authentication" or "Security" or "Challenge", we have moved to MFA step
      if (
        postSubmitTitle.includes("Verify") ||
        postSubmitTitle.includes("MFA") ||
        postSubmitTitle.includes("Authentication") ||
        postSubmitTitle.includes("Security") ||
        postSubmitTitle.includes("Challenge")
      ) {
        console.log(
          "Detected MFA challenge page based on title, proceeding to handleMFA step.",
        );
      } else {
        console.log(
          `Post-submit page title does not indicate MFA "${postSubmitTitle}", continuing to check for auth code.`,
        );

        try {
          // Wait for the auth code to be captured by CDP listeners
          if (this.debugMode)
            console.log(
              "⌛ [submitCredentials] Waiting for auth code capture after submit...",
            );
          const captured = await this.waitForAuthCode(15000); // Use the new helper
          if (!captured && this.debugMode) {
            console.log(
              "🚫 [submitCredentials] Did not capture auth code after submit within timeout. This is probably OK.",
            );
          }
        } catch (e) {
          console.error(
            "🚫 [submitCredentials] Error during waitForAuthCode:",
            e,
          );
        }
      }

      // Clean up CDP session
      try {
        await client.detach();
      } catch (e) {
        // CDP session might already be detached
      }

      console.log(
        "Credentials submitted (or redirect captured). Current URL:",
        page.url(),
      );
      console.log("Page title:", await page.title());
    } catch (error) {
      console.error("Error in submitCredentials:", error);
      throw error;
    }
  }

  static GMAuthTokenIsValid(authToken: GMAPITokenResponse): boolean {
    return authToken.expires_at > Date.now() + 5 * 60 * 1000;
  }

  private async loadCurrentGMAPIToken(): Promise<void> {
    // console.log("Loading existing GM API token, if it exists.");
    const tokenFilePath = this.GMTokenPath; // Define the path for the token file

    if (fs.existsSync(tokenFilePath)) {
      try {
        const storedToken = JSON.parse(
          fs.readFileSync(tokenFilePath, "utf-8"),
        ) as GMAPITokenResponse;

        // Decode the JWT payload
        const decodedPayload = jwt.decode(storedToken.access_token);

        // Check if the stored token is for this user's account
        if (
          !decodedPayload ||
          (decodedPayload as any).uid.toUpperCase() !==
            this.config.username.toUpperCase()
        ) {
          console.log(
            "Stored GM API token was for different user, getting new token",
          );
        } else {
          const now = Math.floor(Date.now() / 1000);

          // Check if the token is still valid
          if (storedToken.expires_at && storedToken.expires_at > now + 5 * 60) {
            // console.log("GM expires at: ", storedToken.expires_at, " now: ", now);
            // console.log("Loaded existing GM API token");
            this.currentGMAPIToken = storedToken;
          } else {
            // console.log("Existing GM API token has expired");
          }
        }
      } catch (err) {
        console.log("Stored GM API token was not parseable, getting new token");
      }
    } else {
      // console.log("No existing GM API token, we'll get a new one.");
    }
  }

  private async getGMAPIToken(tokenSet: TokenSet): Promise<GMAPITokenResponse> {
    // Check if we already have a valid token
    const now = Math.floor(Date.now() / 1000);
    if (
      this.currentGMAPIToken &&
      this.currentGMAPIToken.expires_at > now + 5 * 60
    ) {
      // console.log("Returning existing GM API token");

      // Clean up any browser resources since we're using existing tokens
      try {
        await this.closeBrowser(); // Only close browser, keep Xvfb for potential future use
      } catch (cleanupError) {
        console.warn(
          "Warning: Browser cleanup failed when returning existing token:",
          cleanupError,
        );
      }

      return this.currentGMAPIToken;
    }

    // console.log("Requesting GM API Token using MS Access Token");
    const url = "https://na-mobile-api.gm.com/sec/authz/v3/oauth/token";

    try {
      const response = await this.axiosClient.post<GMAPITokenResponse>(
        url,
        {
          grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
          subject_token: tokenSet.access_token,
          subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
          scope: "msso role_owner priv onstar gmoc user user_trailer",
          device_id: this.config.deviceId,
        },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            accept: "application/json",
          },
        },
      );

      // Decode the JWT payload
      const decodedPayload = jwt.decode(
        response.data.access_token,
      ) as DecodedPayload;
      if (!decodedPayload?.vehs) {
        // Delete the tokens and start over
        console.log(
          "Returned GM API token was missing vehicle information. Deleting existing tokens for reauth.",
        );
        if (fs.existsSync(this.MSTokenPath)) {
          fs.renameSync(this.MSTokenPath, `${this.MSTokenPath}.old`);
        }
        if (fs.existsSync(this.GMTokenPath)) {
          fs.renameSync(this.GMTokenPath, `${this.GMTokenPath}.old`);
        }
        // Clear current token in memory and recursively call authenticate()
        this.currentGMAPIToken = null;
        return await this.authenticate();
      }

      const expires_at =
        Math.floor(Date.now() / 1000) +
        parseInt(response.data.expires_in.toString());
      response.data.expires_in = parseInt(response.data.expires_in.toString());
      response.data.expires_at = expires_at;
      // console.log(JSON.stringify(response.data));
      // console.log("GM Says we expire in ", response.data.expires_in);
      // console.log("Set GM Token expiration to ", expires_at);

      // Store the new token
      this.currentGMAPIToken = response.data;
      this.saveTokens(tokenSet);

      // Clean up browser resources after successful token retrieval
      try {
        await this.closeBrowser(); // Only close browser, keep Xvfb for potential future use
      } catch (cleanupError) {
        console.warn(
          "Warning: Browser cleanup failed after new token retrieval:",
          cleanupError,
        );
      }

      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error(
          `GM API Token Error ${error.response.status}: ${error.response.statusText}`,
        );
        console.error("Error details:", error.response.data);
        if (error.response.status === 401) {
          console.error(
            "Token exchange failed. MS Access token may be invalid.",
          );
        }
      } else if (error.request) {
        console.error("No response received from GM API");
        console.error(error.request);
      } else {
        console.error("Request Error:", error.message);
      }
      throw error;
    }
  }

  // Add this method to manually extract and add cookies from response headers
  private processCookieHeaders(response: AxiosResponse, url: string): void {
    const setCookieHeaders = response.headers["set-cookie"];
    if (setCookieHeaders && Array.isArray(setCookieHeaders)) {
      setCookieHeaders.forEach((cookieString) => {
        const parsedUrl = new URL(url);
        try {
          // Use setCookieSync to handle each Set-Cookie header
          this.jar.setCookieSync(cookieString, parsedUrl.origin);
          if (this.debugMode) {
            console.log(`Added cookie: ${cookieString.split(";")[0]}`);
          }
        } catch (error) {
          console.error(`Failed to add cookie: ${error}`);
        }
      });
    }
  }

  private async getRequest(url: string): Promise<AxiosResponse> {
    try {
      // Get cookies for this URL before the request
      const cookieStringBefore = await this.jar.getCookieString(url);

      if (this.debugMode) {
        console.log("Cookies before GET:", cookieStringBefore);
        console.log("GET URL:", url);
      }

      const response = await this.axiosClient.get(url, {
        withCredentials: true,
        maxRedirects: 0,
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          Connection: "keep-alive",
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.6 Mobile/15E148 Safari/604.1",
          ...(cookieStringBefore && { Cookie: cookieStringBefore }),
        },
      });

      // Process and store cookies from the response
      this.processCookieHeaders(response, url);

      if (this.debugMode) {
        console.log(
          "Set-Cookie headers after GET:",
          response.headers["set-cookie"],
        );
        console.log(
          "Current cookies after GET:",
          await this.jar.getCookieString(url),
        );

        // Also check for cookies for the domain
        const domain = new URL(url).hostname;
        console.log(
          `Cookies for domain ${domain}:`,
          await this.jar.getCookieString(`https://${domain}/`),
        );
      }

      return response;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        this.handleRequestError(error);
      } else {
        console.error("GET Request failed:", error);
      }
      return error.response;
    }
  }

  private async postRequest(
    url: string,
    postData: any,
    csrfToken: string | null,
  ): Promise<AxiosResponse> {
    try {
      // Properly serialize form data
      const formData = new URLSearchParams();
      for (const [key, value] of Object.entries(postData)) {
        formData.append(key, value as string);
      }

      // Get cookies for the specific URL and also for the base domain
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // Try to get cookies from both URL path and root path
      const cookieString = await this.jar.getCookieString(url);
      const domainCookieString = await this.jar.getCookieString(
        `https://${domain}/`,
      );

      // Combine cookie strings if they're different
      const combinedCookies =
        cookieString !== domainCookieString
          ? `${cookieString}; ${domainCookieString}`.replace(/;\s+;/g, "; ")
          : cookieString;

      if (this.debugMode) {
        console.log("POST URL:", url);
        console.log("Cookies before POST (URL):", cookieString);
        console.log("Cookies before POST (domain):", domainCookieString);
        console.log("Combined cookies:", combinedCookies);
        console.log("POST data:", postData);
      }

      const response = await this.axiosClient.post(url, formData.toString(), {
        withCredentials: true,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "en-US,en;q=0.9",
          Origin: "https://custlogin.gm.com",
          "x-csrf-token": csrfToken,
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.6 Mobile/15E148 Safari/604.1",
          "X-Requested-With": "XMLHttpRequest",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          // Using the combined cookies
          ...(combinedCookies && { Cookie: combinedCookies }),
        },
      });

      // Process and store cookies from the response
      this.processCookieHeaders(response, url);

      if (this.debugMode) {
        console.log(
          "Set-Cookie headers after POST:",
          response.headers["set-cookie"],
        );
        console.log(
          "Current cookies after POST:",
          await this.jar.getCookieString(url),
        );
      }

      return response;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        this.handleRequestError(error);
      } else {
        console.error("POST Request failed:", error);
      }
      return error.response;
    }
  }

  private handleRequestError(error: any): void {
    console.log("reqer");
    if (error.response) {
      console.error(
        `HTTP Error ${error.response.status}: ${error.response.statusText}`,
      );
      console.debug("Response data:", error.response.data);
      if (error.response.status === 401) {
        console.error("Authentication failed. Please check your credentials.");
      }
    } else if (error.request) {
      console.error("No response received from server");
      console.debug(error.request);
    } else {
      console.error("Request Error:", error.message);
    }
  }

  private getRegexMatch(haystack: string, regexString: string): string | null {
    const re = new RegExp(regexString);
    const r = haystack.match(re);
    return r ? r[1] : null;
  }

  private async captureRedirectLocation(url: string): Promise<string> {
    try {
      // Get cookies for this URL before the request
      const cookieStringBefore = await this.jar.getCookieString(url);

      if (this.debugMode) {
        console.log("Cookies before redirect capture:", cookieStringBefore);
        console.log("Redirect capture URL:", url);
      }

      const response = await this.axiosClient.get(url, {
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          Connection: "keep-alive",
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.6 Mobile/15E148 Safari/604.1",
          ...(cookieStringBefore && { Cookie: cookieStringBefore }),
        },
      });

      // Process and store cookies from the response
      this.processCookieHeaders(response, url);

      if (this.debugMode) {
        console.log(
          "Set-Cookie headers after redirect capture:",
          response.headers["set-cookie"],
        );
        console.log(
          "Current cookies after redirect capture:",
          await this.jar.getCookieString(url),
        );

        // Check for domain cookies too
        const domain = new URL(url).hostname;
        console.log(
          `Cookies for domain ${domain}:`,
          await this.jar.getCookieString(`https://${domain}/`),
        );
      }

      if (response.status === 302) {
        const redirectLocation = response.headers["location"];
        if (!redirectLocation) {
          throw new Error("No redirect location found in response headers");
        }
        return redirectLocation;
      }

      throw new Error(`Unexpected response status: ${response.status}`);
    } catch (error: any) {
      this.handleRequestError(error);
      throw error;
    }
  }

  private async setupOpenIDClient(): Promise<openidClient.Client> {
    // Hard-coded fallback configuration with required endpoints
    const fallbackConfig = {
      issuer:
        "https://custlogin.gm.com/gmb2cprod.onmicrosoft.com/b2c_1a_seamless_mobile_signuporsignin/v2.0/",
      authorization_endpoint:
        "https://custlogin.gm.com/gmb2cprod.onmicrosoft.com/b2c_1a_seamless_mobile_signuporsignin/v2.0/authorize",
      token_endpoint:
        "https://custlogin.gm.com/gmb2cprod.onmicrosoft.com/b2c_1a_seamless_mobile_signuporsignin/v2.0/token",
      jwks_uri:
        "https://custlogin.gm.com/gmb2cprod.onmicrosoft.com/b2c_1a_seamless_mobile_signuporsignin/discovery/v2.0/keys",
      response_types_supported: ["code", "id_token", "code id_token"],
      response_modes_supported: ["query", "fragment", "form_post"],
      grant_types_supported: [
        "authorization_code",
        "implicit",
        "refresh_token",
      ],
      subject_types_supported: ["pairwise"],
      id_token_signing_alg_values_supported: ["RS256"],
      scopes_supported: ["openid"],
    };

    let issuer: openidClient.Issuer | null = null;

    try {
      // Try direct discovery first
      const discoveryUrl =
        "https://custlogin.gm.com/gmb2cprod.onmicrosoft.com/b2c_1a_seamless_mobile_signuporsignin/v2.0/.well-known/openid-configuration";

      if (this.debugMode) {
        console.log("Attempting OpenID discovery from:", discoveryUrl);
      }

      const response = await axios.get(discoveryUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.6 Mobile/15E148 Safari/604.1",
        },
        timeout: 60000,
      });

      // Use the discovery data but merge with fallback to ensure required fields
      const discoveredConfig = response.data;

      // Create issuer with combined configuration
      issuer = new this.oidc.Issuer({
        ...fallbackConfig,
        ...discoveredConfig,
        // Ensure these critical endpoints are defined
        authorization_endpoint:
          discoveredConfig.authorization_endpoint ||
          fallbackConfig.authorization_endpoint,
        token_endpoint:
          discoveredConfig.token_endpoint || fallbackConfig.token_endpoint,
        jwks_uri: discoveredConfig.jwks_uri || fallbackConfig.jwks_uri,
      });

      if (this.debugMode) {
        console.log("Successfully created issuer with discovery data");
      }
    } catch (error) {
      console.warn(
        "OpenID discovery failed, using fallback configuration",
        error,
      );

      // Create issuer using fallback configuration
      issuer = new this.oidc.Issuer(fallbackConfig);

      if (this.debugMode) {
        console.log("Created issuer with fallback configuration");
      }
    }

    if (!issuer) {
      throw new Error("Failed to create OpenID issuer");
    }

    // Verify the critical endpoint is available
    if (!issuer.authorization_endpoint) {
      throw new Error(
        "Issuer missing authorization_endpoint even after fallback",
      );
    }

    // Create client
    const client = new issuer.Client({
      client_id: "3ff30506-d242-4bed-835b-422bf992622e",
      redirect_uris: ["msauth.com.gm.myChevrolet://auth"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    });

    client[custom.clock_tolerance] = 5; // to allow a 5 second skew

    return client;
  }

  private async startMSAuthorizationFlow(): Promise<{
    authorizationUrl: string;
    code_verifier: string;
  }> {
    // console.log("Starting PKCE auth");
    const client = await this.setupOpenIDClient();
    const code_verifier = this.oidc.generators.codeVerifier();
    const code_challenge = this.oidc.generators.codeChallenge(code_verifier);

    const state = this.oidc.generators.nonce();
    // const nonce = this.oidc.generators.nonce();
    const authorizationUrl = client.authorizationUrl({
      scope:
        "https://gmb2cprod.onmicrosoft.com/3ff30506-d242-4bed-835b-422bf992622e/Test.Read openid profile offline_access",
      code_challenge,
      code_challenge_method: "S256",
      bundleID: "com.gm.myChevrolet",
      client_id: "3ff30506-d242-4bed-835b-422bf992622e",
      mode: "dark",
      evar25:
        "mobile_mychevrolet_chevrolet_us_app_launcher_sign_in_or_create_account",
      channel: "lightreg",
      ui_locales: "en-US",
      brand: "chevrolet",
      // nonce,
      state,
    });

    return { authorizationUrl, code_verifier };
  }

  private async getMSToken(
    code: string,
    code_verifier: string,
  ): Promise<TokenSet> {
    const client = await this.setupOpenIDClient();

    try {
      const openIdTokenSet = await client.callback(
        "msauth.com.gm.myChevrolet://auth",
        { code },
        { code_verifier },
      );

      // Validate that we received the required tokens
      if (!openIdTokenSet.access_token) {
        throw new Error(
          "No access token received from authentication provider",
        );
      }

      // Convert the openid-client TokenSet to our TokenSet format
      const tokenSet: TokenSet = {
        access_token: openIdTokenSet.access_token,
        // Only include optional properties if they exist
        ...(openIdTokenSet.id_token && { id_token: openIdTokenSet.id_token }),
        ...(openIdTokenSet.refresh_token && {
          refresh_token: openIdTokenSet.refresh_token,
        }),
        ...(openIdTokenSet.expires_at && {
          expires_at: openIdTokenSet.expires_at,
        }),
        ...(openIdTokenSet.expires_in && {
          expires_in: openIdTokenSet.expires_in,
        }),
      };

      // console.log("Access Token:", tokenSet.access_token);
      // console.log("ID Token:", tokenSet.id_token);

      return tokenSet;
    } catch (err) {
      console.error("Failed to obtain access token:", err);
      throw err;
    }
  }

  private async loadMSToken(): Promise<TokenSet | false> {
    // console.log("Loading existing MS tokens, if they exist.");
    let tokenSet: TokenSet;

    if (fs.existsSync(this.MSTokenPath)) {
      let storedTokens = null;
      try {
        storedTokens = JSON.parse(
          fs.readFileSync(this.MSTokenPath, "utf-8"),
        ) as TokenSet;
      } catch (err) {
        console.log("Stored MS token was not parseable, getting new token");
        return false;
      }

      // Decode the JWT payload
      const decodedPayload = jwt.decode(storedTokens.access_token);
      if (
        !decodedPayload ||
        ((decodedPayload as any).name.toUpperCase() !==
          this.config.username.toUpperCase() &&
          (decodedPayload as any).email.toUpperCase() !==
            this.config.username.toUpperCase())
      ) {
        console.log(
          "Stored MS token was for different user, getting new token",
        );
        return false;
      }

      const now = Math.floor(Date.now() / 1000);

      if (storedTokens.expires_at && storedTokens.expires_at > now + 5 * 60) {
        // console.log("MS Access token is still valid");
        // console.log("MS expires at: ", storedTokens.expires_at, " now: ", now);
        tokenSet = storedTokens;
      } else if (storedTokens.refresh_token) {
        // console.log("Refreshing MS access token");
        const client = await this.setupOpenIDClient();
        const refreshedTokens = await client.refresh(
          storedTokens.refresh_token,
        );

        // Verify that the refreshed tokens contain the required access_token
        if (!refreshedTokens.access_token) {
          throw new Error("Refresh token response missing access_token");
        }

        // Create a valid TokenSet object
        tokenSet = {
          access_token: refreshedTokens.access_token,
          refresh_token: refreshedTokens.refresh_token,
          id_token: refreshedTokens.id_token,
          expires_in: refreshedTokens.expires_in,
          expires_at: refreshedTokens.expires_at,
        };

        // console.log("Saving current MS tokens to ", this.MSTokenPath);
        fs.writeFileSync(this.MSTokenPath, JSON.stringify(tokenSet));
      } else {
        throw new Error("Token expired and no refresh token available.");
      }
      return tokenSet;
    }

    return false;
  }
}

interface AuthConfig {
  username: string | undefined;
  password: string | undefined;
  deviceId: string | undefined;
  totpKey: string | undefined;
  tokenLocation?: string | undefined;
}

export async function getGMAPIJWT(config: AuthConfig) {
  if (
    !config.username ||
    !config.password ||
    !config.deviceId ||
    !config.totpKey
  ) {
    throw new Error("Missing required configuration parameters");
  }

  config.tokenLocation = config.tokenLocation ?? "./";

  const auth = new GMAuth(config as GMAuthConfig);
  const token = await auth.authenticate();
  // Decode the JWT payload
  const decodedPayload = jwt.decode(token.access_token) as DecodedPayload;
  return {
    token,
    auth,
    decodedPayload,
  };
}
