/**
 * Cisco Webex Integration Service
 *
 * Sends SOS alerts to Webex Spaces, creates incident rooms for responder
 * coordination, and maintains an alert history log.
 *
 * Falls back to simulation mode when WEBEX_BOT_TOKEN is not configured.
 */

export interface WebexAlert {
  id: string;
  type: "sos" | "incident" | "status" | "network";
  senderId: string;
  location?: { latitude: number; longitude: number };
  content: string;
  timestamp: string;
  delivered: boolean;
  webexMessageId?: string;
  roomId?: string;
  roomTitle?: string;
}

export interface WebexIncidentRoom {
  id: string;
  title: string;
  created: string;
  incidentId: string;
  memberCount: number;
}

export interface WebexServiceStatus {
  connected: boolean;
  mode: "live" | "simulation";
  botName?: string;
  roomName?: string;
  alertsSent: number;
  incidentRoomsCreated: number;
  lastAlertTime?: string;
}

class WebexService {
  private botToken: string | undefined;
  private roomId: string | undefined;
  private baseUrl = "https://webexapis.com/v1";
  private alertHistory: WebexAlert[] = [];
  private incidentRooms: WebexIncidentRoom[] = [];
  private alertCounter = 0;
  private botName: string | undefined;
  private roomName: string | undefined;

  constructor() {
    this.botToken = process.env.WEBEX_BOT_TOKEN;
    this.roomId = process.env.WEBEX_ROOM_ID;

    if (this.botToken && this.roomId) {
      console.log("🟢 Webex Service: LIVE mode — connected to Webex APIs");
      this.fetchBotInfo();
      this.fetchRoomInfo();
    } else {
      console.log("🟡 Webex Service: SIMULATION mode — no API keys configured");
    }
  }

  /** Check whether we have real credentials. */
  get isLive(): boolean {
    return !!(this.botToken && this.roomId);
  }

  // ── Bot & Room Info ────────────────────────────────────────────────

  private async fetchBotInfo(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/people/me`, {
        headers: this.authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        this.botName = data.displayName;
        console.log(`   Bot identity: ${this.botName}`);
      }
    } catch {
      /* ignore — non-critical */
    }
  }

  private async fetchRoomInfo(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/rooms/${this.roomId}`, {
        headers: this.authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        this.roomName = data.title;
        console.log(`   Target room : ${this.roomName}`);
      }
    } catch {
      /* ignore */
    }
  }

  // ── SOS Alert ──────────────────────────────────────────────────────

  /**
   * Send an SOS alert to the configured Webex Space.
   * In simulation mode this stores the alert locally.
   */
  async sendSOSAlert(payload: {
    senderId: string;
    location: { latitude: number; longitude: number };
    content?: string;
  }): Promise<WebexAlert> {
    const alert: WebexAlert = {
      id: `alert-${++this.alertCounter}`,
      type: "sos",
      senderId: payload.senderId,
      location: payload.location,
      content:
        payload.content ||
        `🚨 SOS from ${payload.senderId} at ${payload.location.latitude.toFixed(4)}, ${payload.location.longitude.toFixed(4)}`,
      timestamp: new Date().toISOString(),
      delivered: false,
      roomId: this.roomId,
    };

    if (this.isLive) {
      try {
        const markdown =
          `## 🚨 ResQNet SOS ALERT\n\n` +
          `**Sender:** \`${payload.senderId}\`\n` +
          `**Location:** [${payload.location.latitude.toFixed(5)}, ${payload.location.longitude.toFixed(5)}](https://www.google.com/maps?q=${payload.location.latitude},${payload.location.longitude})\n` +
          `**Message:** ${alert.content}\n` +
          `**Time:** ${new Date().toLocaleString()}\n\n` +
          `---\n` +
          `_Sent by ResQNet Disaster Communication Network_`;

        const res = await fetch(`${this.baseUrl}/messages`, {
          method: "POST",
          headers: {
            ...this.authHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomId: this.roomId,
            markdown,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          alert.delivered = true;
          alert.webexMessageId = data.id;
          console.log(`✅ Webex SOS alert sent — message ID: ${data.id}`);
        } else {
          const err = await res.text();
          console.error(`❌ Webex API error: ${res.status} — ${err}`);
        }
      } catch (error) {
        console.error("❌ Webex API call failed:", error);
      }
    } else {
      // Simulation mode — mark as delivered locally
      alert.delivered = true;
      alert.webexMessageId = `sim-msg-${this.alertCounter}`;
      console.log(`📨 [SIM] Webex SOS alert logged: ${alert.id}`);
    }

    this.alertHistory.push(alert);
    return alert;
  }

  // ── Status Update ──────────────────────────────────────────────────

  /** Send a general status update to the Webex Space. */
  async sendStatusUpdate(message: string): Promise<WebexAlert> {
    const alert: WebexAlert = {
      id: `alert-${++this.alertCounter}`,
      type: "status",
      senderId: "system",
      content: message,
      timestamp: new Date().toISOString(),
      delivered: false,
      roomId: this.roomId,
    };

    if (this.isLive) {
      try {
        const res = await fetch(`${this.baseUrl}/messages`, {
          method: "POST",
          headers: {
            ...this.authHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomId: this.roomId,
            markdown: `ℹ️ **ResQNet Status Update**\n\n${message}\n\n_${new Date().toLocaleString()}_`,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          alert.delivered = true;
          alert.webexMessageId = data.id;
        }
      } catch {
        /* fall through to simulation */
      }
    } else {
      alert.delivered = true;
      alert.webexMessageId = `sim-msg-${this.alertCounter}`;
    }

    this.alertHistory.push(alert);
    return alert;
  }

  // ── Network Alert ──────────────────────────────────────────────────

  /** Send a network event alert (node down, anomaly, etc). */
  async sendNetworkAlert(payload: {
    eventType: string;
    nodeId: string;
    details: string;
  }): Promise<WebexAlert> {
    const alert: WebexAlert = {
      id: `alert-${++this.alertCounter}`,
      type: "network",
      senderId: payload.nodeId,
      content: `[${payload.eventType}] ${payload.details}`,
      timestamp: new Date().toISOString(),
      delivered: false,
      roomId: this.roomId,
    };

    if (this.isLive) {
      try {
        const emoji =
          payload.eventType === "node_disconnected"
            ? "🔴"
            : payload.eventType === "node_connected"
              ? "🟢"
              : "⚡";

        const res = await fetch(`${this.baseUrl}/messages`, {
          method: "POST",
          headers: {
            ...this.authHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomId: this.roomId,
            markdown:
              `${emoji} **Network Event — ${payload.eventType.replace(/_/g, " ")}**\n\n` +
              `**Node:** \`${payload.nodeId}\`\n` +
              `**Details:** ${payload.details}\n` +
              `_${new Date().toLocaleString()}_`,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          alert.delivered = true;
          alert.webexMessageId = data.id;
        }
      } catch {
        /* simulation fallback */
      }
    } else {
      alert.delivered = true;
      alert.webexMessageId = `sim-msg-${this.alertCounter}`;
    }

    this.alertHistory.push(alert);
    return alert;
  }

  // ── Incident Rooms ─────────────────────────────────────────────────

  /** Create a dedicated Webex Space for a specific incident. */
  async createIncidentRoom(
    incidentId: string,
    title?: string,
  ): Promise<WebexIncidentRoom> {
    const roomTitle =
      title || `ResQNet Incident #${incidentId} — ${new Date().toLocaleDateString()}`;

    const room: WebexIncidentRoom = {
      id: `room-${incidentId}`,
      title: roomTitle,
      created: new Date().toISOString(),
      incidentId,
      memberCount: 1,
    };

    if (this.isLive) {
      try {
        const res = await fetch(`${this.baseUrl}/rooms`, {
          method: "POST",
          headers: {
            ...this.authHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: roomTitle }),
        });

        if (res.ok) {
          const data = await res.json();
          room.id = data.id;
          console.log(`✅ Webex incident room created: ${roomTitle}`);

          // Post initial message to the room
          await fetch(`${this.baseUrl}/messages`, {
            method: "POST",
            headers: {
              ...this.authHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              roomId: data.id,
              markdown:
                `# 🚨 Incident ${incidentId}\n\n` +
                `This space was auto-created by **ResQNet** for coordinating the response to incident #${incidentId}.\n\n` +
                `**Created:** ${new Date().toLocaleString()}\n\n` +
                `All responders assigned to this incident will be added here.`,
            }),
          });
        }
      } catch (error) {
        console.error("❌ Failed to create incident room:", error);
      }
    } else {
      console.log(`📋 [SIM] Incident room created: ${roomTitle}`);
    }

    this.incidentRooms.push(room);
    return room;
  }

  // ── Queries ────────────────────────────────────────────────────────

  getAlertHistory(): WebexAlert[] {
    return [...this.alertHistory];
  }

  getRecentAlerts(count = 10): WebexAlert[] {
    return this.alertHistory.slice(-count);
  }

  getIncidentRooms(): WebexIncidentRoom[] {
    return [...this.incidentRooms];
  }

  getStatus(): WebexServiceStatus {
    return {
      connected: this.isLive,
      mode: this.isLive ? "live" : "simulation",
      botName: this.botName || (this.isLive ? "ResQNet Bot" : "Simulated Bot"),
      roomName: this.roomName || (this.isLive ? "Unknown" : "resQ Alerts (sim)"),
      alertsSent: this.alertHistory.length,
      incidentRoomsCreated: this.incidentRooms.length,
      lastAlertTime: this.alertHistory.at(-1)?.timestamp,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.botToken}` };
  }
}

export const webexService = new WebexService();
