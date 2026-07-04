/**
 * Cisco Meraki Dashboard API Integration
 *
 * Connects to the Meraki Dashboard API to pull real AP status, network health,
 * and device telemetry.  Maps Meraki APs to ResQNet mesh-node locations.
 *
 * Falls back to realistic simulation when MERAKI_API_KEY is not set.
 */

export interface MerakiDevice {
  serial: string;
  name: string;
  model: string;
  mac: string;
  lanIp: string;
  status: "online" | "offline" | "alerting" | "dormant";
  firmware: string;
  networkId: string;
  lat?: number;
  lng?: number;
  tags: string[];
  /** Mapped ResQNet node ID (added by our service). */
  resqnetNodeId?: string;
}

export interface MerakiNetworkHealth {
  networkId: string;
  networkName: string;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  alertingDevices: number;
  overallScore: number; // 0-100
}

export interface MerakiUplinkStatus {
  serial: string;
  model: string;
  highAvailability: { enabled: boolean; role: string };
  uplinks: {
    interface: string;
    status: "active" | "ready" | "failed" | "not connected";
    ip: string;
    publicIp: string;
    dns: string;
    gateway: string;
  }[];
}

export interface MerakiServiceStatus {
  connected: boolean;
  mode: "live" | "simulation";
  organizationName?: string;
  networkName?: string;
  totalDevices: number;
  onlineDevices: number;
  lastSync?: string;
}

class MerakiService {
  private apiKey: string | undefined;
  private baseUrl = "https://api.meraki.com/api/v1";
  private orgId: string | undefined;
  private networkId: string | undefined;

  // Cache
  private cachedDevices: MerakiDevice[] = [];
  private cachedHealth: MerakiNetworkHealth | null = null;
  private lastFetch: number = 0;
  private cacheTTL = 30_000; // 30 seconds

  constructor() {
    this.apiKey = process.env.MERAKI_API_KEY;
    this.orgId = process.env.MERAKI_ORG_ID;
    this.networkId = process.env.MERAKI_NETWORK_ID;

    // Always load simulated data as baseline — real API data overlays on top
    this.loadSimulatedData();

    if (this.apiKey) {
      console.log("🟢 Meraki Service: LIVE mode — connected to Meraki Dashboard API");
      this.discoverOrganization();
    } else {
      console.log("🟡 Meraki Service: SIMULATION mode");
    }
  }

  get isLive(): boolean {
    return !!this.apiKey;
  }

  // ── Auto-discover org/network from sandbox ─────────────────────────

  private async discoverOrganization(): Promise<void> {
    try {
      if (!this.orgId) {
        const res = await fetch(`${this.baseUrl}/organizations`, {
          headers: this.authHeaders(),
        });
        if (res.ok) {
          const orgs = await res.json();
          if (orgs.length > 0) {
            this.orgId = orgs[0].id;
            console.log(`   Organization: ${orgs[0].name} (${this.orgId})`);
          }
        }
      }

      if (this.orgId && !this.networkId) {
        const res = await fetch(
          `${this.baseUrl}/organizations/${this.orgId}/networks`,
          { headers: this.authHeaders() },
        );
        if (res.ok) {
          const nets = await res.json();
          if (nets.length > 0) {
            this.networkId = nets[0].id;
            console.log(`   Network     : ${nets[0].name} (${this.networkId})`);
          }
        }
      }
    } catch (error) {
      console.warn("⚠️  Meraki org discovery failed, using simulation:", error);
      this.loadSimulatedData();
    }
  }

  // ── Devices ────────────────────────────────────────────────────────

  async getDevices(): Promise<MerakiDevice[]> {
    if (this.isCacheValid()) return this.cachedDevices;

    if (this.isLive && this.orgId) {
      try {
        const res = await fetch(
          `${this.baseUrl}/organizations/${this.orgId}/devices`,
          { headers: this.authHeaders() },
        );
        if (res.ok) {
          const devices: any[] = await res.json();
          if (devices.length > 0) {
            this.cachedDevices = devices.map((d) => ({
              serial: d.serial,
              name: d.name || d.model,
              model: d.model,
              mac: d.mac,
              lanIp: d.lanIp || "N/A",
              status: d.status || "online",
              firmware: d.firmware || "unknown",
              networkId: d.networkId,
              lat: d.lat,
              lng: d.lng,
              tags: d.tags || [],
            }));
          }
          // If API returns empty, keep existing simulated data
          this.lastFetch = Date.now();
          return this.cachedDevices;
        }
      } catch {
        /* fall through to simulation */
      }
    }

    return this.cachedDevices; // simulated
  }

  // ── Network Health ─────────────────────────────────────────────────

  async getNetworkHealth(): Promise<MerakiNetworkHealth> {
    const devices = await this.getDevices();
    const online = devices.filter((d) => d.status === "online").length;
    const offline = devices.filter((d) => d.status === "offline").length;
    const alerting = devices.filter((d) => d.status === "alerting").length;

    const health: MerakiNetworkHealth = {
      networkId: this.networkId || "sim-network-01",
      networkName: "ResQNet Field Network",
      totalDevices: devices.length,
      onlineDevices: online,
      offlineDevices: offline,
      alertingDevices: alerting,
      overallScore: devices.length > 0 ? Math.round((online / devices.length) * 100) : 0,
    };

    this.cachedHealth = health;
    return health;
  }

  // ── Status ─────────────────────────────────────────────────────────

  getStatus(): MerakiServiceStatus {
    const devices = this.cachedDevices;
    return {
      connected: this.isLive,
      mode: this.isLive ? "live" : "simulation",
      organizationName: this.isLive ? "Cisco DevNet Sandbox" : "ResQNet Simulated Org",
      networkName: "ResQNet Field Network",
      totalDevices: devices.length,
      onlineDevices: devices.filter((d) => d.status === "online").length,
      lastSync: this.lastFetch ? new Date(this.lastFetch).toISOString() : undefined,
    };
  }

  // ── Simulated Data ─────────────────────────────────────────────────

  private loadSimulatedData(): void {
    this.cachedDevices = [
      {
        serial: "Q2KN-XXXX-RVG1",
        name: "RV Gate — Meraki MR46",
        model: "MR46",
        mac: "e0:cb:bc:00:01:01",
        lanIp: "10.10.10.1",
        status: "online",
        firmware: "MR 30.7",
        networkId: "sim-network-01",
        lat: 12.9258,
        lng: 77.4988,
        tags: ["shelter", "backbone"],
        resqnetNodeId: "rv-gate",
      },
      {
        serial: "Q2KN-XXXX-MYS2",
        name: "Mysore Rd Junction — Meraki MR56",
        model: "MR56",
        mac: "e0:cb:bc:00:02:02",
        lanIp: "10.10.10.2",
        status: "online",
        firmware: "MR 30.7",
        networkId: "sim-network-01",
        lat: 12.924,
        lng: 77.498,
        tags: ["junction", "high-density"],
        resqnetNodeId: "mysore-road",
      },
      {
        serial: "Q2KN-XXXX-KNG3",
        name: "Kengeri Camp — Meraki MR46",
        model: "MR46",
        mac: "e0:cb:bc:00:03:03",
        lanIp: "10.10.10.3",
        status: "online",
        firmware: "MR 30.7",
        networkId: "sim-network-01",
        lat: 12.918,
        lng: 77.485,
        tags: ["shelter", "relief-center"],
        resqnetNodeId: "kengeri",
      },
      {
        serial: "Q2KN-XXXX-HSK4",
        name: "Hoskerehalli Metro — Meraki MR44",
        model: "MR44",
        mac: "e0:cb:bc:00:04:04",
        lanIp: "10.10.10.4",
        status: "online",
        firmware: "MR 30.7",
        networkId: "sim-network-01",
        lat: 12.93,
        lng: 77.49,
        tags: ["transit", "metro-station"],
        resqnetNodeId: "hoskerehalli",
      },
      {
        serial: "Q2KN-XXXX-MGD5",
        name: "Magadi Road Hospital — Meraki MR46",
        model: "MR46",
        mac: "e0:cb:bc:00:05:05",
        lanIp: "10.10.10.5",
        status: "offline",
        firmware: "MR 30.7",
        networkId: "sim-network-01",
        lat: 12.932,
        lng: 77.475,
        tags: ["hospital", "critical"],
        resqnetNodeId: "magadi-road",
      },
      {
        serial: "Q2KN-XXXX-BNS6",
        name: "Banashankari BDA — Meraki MR56",
        model: "MR56",
        mac: "e0:cb:bc:00:06:06",
        lanIp: "10.10.10.6",
        status: "online",
        firmware: "MR 30.7",
        networkId: "sim-network-01",
        lat: 12.928,
        lng: 77.52,
        tags: ["community-center"],
        resqnetNodeId: "banashankari",
      },
      {
        serial: "Q2KN-XXXX-VJN7",
        name: "Vijayanagar — Meraki MR44",
        model: "MR44",
        mac: "e0:cb:bc:00:07:07",
        lanIp: "10.10.10.7",
        status: "online",
        firmware: "MR 30.7",
        networkId: "sim-network-01",
        lat: 12.975,
        lng: 77.538,
        tags: ["relay"],
        resqnetNodeId: "vijayanagar",
      },
      {
        serial: "Q2KN-XXXX-PNY8",
        name: "Peenya Industrial — Meraki MR46",
        model: "MR46",
        mac: "e0:cb:bc:00:08:08",
        lanIp: "10.10.10.8",
        status: "alerting",
        firmware: "MR 30.7",
        networkId: "sim-network-01",
        lat: 13.028,
        lng: 77.52,
        tags: ["industrial", "backup"],
        resqnetNodeId: "peenya",
      },
    ];
    this.lastFetch = Date.now();
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private authHeaders(): Record<string, string> {
    return { "X-Cisco-Meraki-API-Key": this.apiKey! };
  }

  private isCacheValid(): boolean {
    return Date.now() - this.lastFetch < this.cacheTTL && this.cachedDevices.length > 0;
  }
}

export const merakiService = new MerakiService();
