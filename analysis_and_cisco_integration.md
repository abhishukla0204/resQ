# ResQNet: Project Analysis & Cisco Integration Strategy

## 📋 Project Overview

**ResQNet** is an IoT-based Disaster Communication Network that simulates a resilient mesh topology for emergency communication when traditional infrastructure fails. It's built for the **"Resilient Disaster Response"** theme of the Code with Cisco challenge.

---

## 🏗️ Current Architecture Summary

### Tech Stack
| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Radix UI, Mapbox GL |
| **Backend** | Node.js, Express.js, PostgreSQL (Neon), Drizzle ORM |
| **Routing** | Wouter (client-side), REST API (server) |
| **State** | TanStack React Query, local simulation state |
| **Realtime** | WebSocket (ws), client-side simulation intervals |
| **IoT/BLE** | Web Bluetooth API with simulation fallback |
| **Crypto** | Web Crypto API (ECDSA P-256, AES-256-GCM, HKDF) |
| **Maps** | Mapbox GL JS with 3D buildings, satellite/dark modes |

### Pages & Routing

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Landing | Hero landing page |
| `/app` | Home (Dashboard) | Main console with metrics, node list, security, BLE |
| `/maps` | Maps | Mapbox-powered node visualization with GPS tracking |
| `/messages` | MessagesView | Message log and chat |
| `/settings` | SettingsView | App settings |
| `/simulation` | Simulation | 6-step animated disaster response scenario |

### Core Modules

1. **Network Simulation Engine** ([network-simulation.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/network-simulation.ts))
   - Manages 12 mesh nodes around RV College, Bangalore
   - Self-healing: nodes go offline/online dynamically
   - BLE device integration from discovery service
   - Event-driven architecture (subscribe/emit pattern)
   - Emergency mode with latency reduction

2. **Dijkstra Routing** ([dijkstra.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/dijkstra.ts))
   - Full Dijkstra implementation for shortest-path routing
   - Edge weights consider both distance and latency
   - BFS-based flood broadcast for SOS messages
   - Multi-path computation support

3. **Cryptographic Security** ([crypto-service.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/crypto-service.ts))
   - ECDSA P-256 keypair per node (12 default nodes)
   - Digital signatures on all messages
   - AES-256-GCM end-to-end encryption
   - HKDF symmetric key derivation
   - Stats tracking (signed, encrypted, integrity failures)

4. **Bluetooth Discovery** ([bluetooth-service.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/bluetooth-service.ts))
   - Web Bluetooth API integration with GATT support
   - ResQNet-specific BLE service UUIDs
   - BLE advertisement parsing (manufacturer data)
   - Simulated fallback via [ble-simulator.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/ble-simulator.ts)
   - 6 simulated BLE devices with movement patterns

5. **Location Tracking** ([location-service.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/location-service.ts))
   - Real GPS via Geolocation API
   - Continuous watch mode with subscriber pattern

6. **Server/Database** ([storage.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/server/storage.ts), [routes.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/server/routes.ts))
   - Full CRUD for nodes, messages, connections
   - SOS broadcast endpoint (`POST /api/sos`)
   - Network stats aggregation endpoint
   - 12 pre-seeded nodes with 17 mesh connections
   - PostgreSQL via Neon serverless

### Simulation Scenario (6 Steps)
1. **Incident Detected** — Kengeri Camp → Gate Relay → RV Base
2. **Route Calculated** — Dijkstra avoids failed hospital, picks backup relay
3. **Broadcast Fan-out** — Command broadcasts to 6 devices
4. **Rescue Dispatched** — Rescue Van acknowledges and updates
5. **Network Heals** — Backup relay keeps hospital route alive
6. **Secure Channel Verified** — E2E encryption and digital signatures visualized

---

## 🔌 Cisco Technology Integration Plan

The challenge requires Cisco technology to be **part of the solution architecture, not a decorative mention**. Below is how each Cisco product maps **naturally** into ResQNet's existing architecture.

---

### 1. 🌐 CONNECT: Cisco Meraki / Catalyst — Community Connectivity Backbone

> **Current gap:** ResQNet simulates mesh connectivity using BLE and WebSocket, but has no real network infrastructure layer.

#### Integration Strategy

**Meraki MR Access Points as Mesh Backbone Nodes:**
- Each of the 12 nodes in ResQNet (RV Gate Station, Mysore Road Junction, Kengeri Camp, etc.) maps to a **Meraki MR wireless access point** deployed at that physical location
- Meraki's built-in **mesh networking** replaces the BLE-only simulation — Meraki APs can form self-healing mesh networks natively
- Use the [Meraki Dashboard API](https://developer.cisco.com/meraki/api-v1/) to:
  - **GET `/organizations/{orgId}/networks/{networkId}/devices`** → populate the node list dynamically
  - **GET `/devices/{serial}/wireless/status`** → get real signal strength, channel, client count
  - Monitor AP online/offline status in real-time

**Meraki MV Cameras at Relief Centers:**
- At shelters (Kengeri Camp) and hospitals (Magadi Road), Meraki MV cameras provide visual monitoring
- Use the Meraki Snapshot API to capture evidence for incident reports

**Implementation in code:**
```typescript
// NEW: server/services/meraki-service.ts
class MerakiService {
  private apiKey = process.env.MERAKI_API_KEY;
  private baseUrl = 'https://api.meraki.com/api/v1';

  async getNetworkDevices(networkId: string) {
    // Maps to ResQNet's /api/nodes endpoint
    const response = await fetch(
      `${this.baseUrl}/networks/${networkId}/devices`,
      { headers: { 'X-Cisco-Meraki-API-Key': this.apiKey } }
    );
    return response.json();
  }

  async getDeviceStatus(serial: string) {
    // Maps to node signal strength and online status
    const response = await fetch(
      `${this.baseUrl}/devices/${serial}/wireless/status`,
      { headers: { 'X-Cisco-Meraki-API-Key': this.apiKey } }
    );
    return response.json();
  }
}
```

---

### 2. 📡 SENSE: Cisco Spaces + Meraki Sensors — Environmental Awareness

> **Current gap:** ResQNet tracks node positions and signal strength but lacks environmental data (occupancy, air quality, water, temperature).

#### Integration Strategy

**Meraki MT Sensors at Shelters & Hospitals:**
- **MT10 Temperature/Humidity sensors** at relief shelters → monitor livability conditions
- **MT12 Water Leak sensors** → detect flooding in camps
- **MT14 Air Quality sensors** → detect smoke/gas in disaster zones
- **MT20 Door sensors** → track shelter occupancy (entry/exit counting)

**Cisco Spaces API for Location Analytics:**
- Use Cisco Spaces to track people movement and crowd density at shelters
- Real-time occupancy counts for capacity planning
- Heatmap of shelter usage to optimize resource distribution

**Implementation in code:**
```typescript
// NEW: server/services/sensor-service.ts
class CiscoSensorService {
  async getShelterEnvironment(sensorSerial: string) {
    // Meraki sensor readings
    const response = await fetch(
      `${this.baseUrl}/devices/${sensorSerial}/sensor/readings`,
      { headers: { 'X-Cisco-Meraki-API-Key': this.apiKey } }
    );
    return response.json();
    // Returns: temperature, humidity, water, air quality
  }

  async getShelterOccupancy(networkId: string) {
    // Cisco Spaces occupancy data
    const response = await fetch(
      `https://spaces.cisco.com/api/v1/occupancy/${networkId}`,
      { headers: { Authorization: `Bearer ${this.spacesToken}` } }
    );
    return response.json();
  }
}
```

**New UI Component — Shelter Dashboard:**
- Add a "Shelter Conditions" card to the home dashboard showing live sensor data
- Temperature, humidity, air quality gauges
- Occupancy bar chart per shelter

---

### 3. 👁️ OBSERVE: ThousandEyes + Splunk — Network Reliability & Analytics

> **Current gap:** ResQNet shows average latency and connection counts, but lacks deep network observability and anomaly detection.

#### Integration Strategy

**ThousandEyes for Network Path Monitoring:**
- Configure ThousandEyes agents at each mesh node location
- Monitor network path performance between nodes (latency, jitter, packet loss)
- Detect outages and degradation *before* they cause message delivery failures
- Feed outage data into Dijkstra to proactively reroute around degraded paths

**Splunk for Log Analytics & Anomaly Detection:**
- Stream all ResQNet events (node connect/disconnect, SOS broadcasts, message deliveries, integrity failures) to Splunk
- Use Splunk dashboards for:
  - **Real-time incident timeline** — correlate network events with disaster events
  - **Anomaly detection** — spot unusual patterns (e.g., sudden mass disconnections = new disaster impact zone)
  - **Reporting** — generate after-action reports for disaster response evaluation

**Implementation in code:**
```typescript
// NEW: server/services/observability-service.ts
class ObservabilityService {
  // ThousandEyes integration
  async getNetworkPathHealth(fromNode: string, toNode: string) {
    const response = await fetch(
      `https://api.thousandeyes.com/v7/tests`,
      { headers: { Authorization: `Bearer ${this.teToken}` } }
    );
    return response.json();
    // Returns: latency, jitter, packet loss between nodes
  }

  // Splunk log forwarding
  async logEvent(event: NetworkEvent) {
    await fetch(process.env.SPLUNK_HEC_URL!, {
      method: 'POST',
      headers: {
        'Authorization': `Splunk ${process.env.SPLUNK_HEC_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event: {
          type: event.type,
          nodeId: event.nodeId,
          timestamp: event.timestamp,
          data: event.data,
          source: 'resqnet'
        }
      })
    });
  }
}
```

---

### 4. 💬 ENGAGE: Webex APIs — Volunteer Coordination & Alerts

> **Current gap:** ResQNet has SOS broadcasting and messaging between nodes, but no integration with real communication platforms for responders.

#### Integration Strategy

**Webex Messaging for Responder Coordination:**
- Create dedicated Webex **Spaces** for each disaster zone/shelter
- When a node sends an SOS, automatically post an alert to the Webex Space
- Responders can coordinate via Webex on their phones while ResQNet handles mesh routing

**Webex Webhooks for Bi-directional Alerts:**
- Register webhooks to receive messages from Webex back into ResQNet
- Responders can send status updates from Webex that appear on the ResQNet dashboard

**Webex Meetings for Remote Command:**
- Automatically create a Webex Meeting for the incident command team when an SOS triggers
- Embed the meeting link in the SOS broadcast

**Implementation in code:**
```typescript
// NEW: server/services/webex-service.ts
class WebexService {
  private botToken = process.env.WEBEX_BOT_TOKEN;

  async sendSOSAlert(sosData: SOSPayload) {
    // Post to disaster response Webex Space
    await fetch('https://webexapis.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roomId: process.env.WEBEX_DISASTER_ROOM_ID,
        markdown: `## 🚨 SOS ALERT\n` +
          `**From:** ${sosData.senderId}\n` +
          `**Location:** ${sosData.location.latitude}, ${sosData.location.longitude}\n` +
          `**Message:** ${sosData.content}\n` +
          `**Time:** ${new Date().toISOString()}\n` +
          `[View on ResQNet Dashboard](${process.env.APP_URL}/maps)`
      })
    });
  }

  async createIncidentRoom(incidentId: string) {
    // Create a dedicated Webex Space for the incident
    const response = await fetch('https://webexapis.com/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `ResQNet Incident ${incidentId} - ${new Date().toLocaleDateString()}`
      })
    });
    return response.json();
  }

  async createEmergencyMeeting() {
    // Create instant Webex Meeting for command team
    const response = await fetch('https://webexapis.com/v1/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Emergency Response Coordination',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 3600000).toISOString(),
        enabledAutoRecordMeeting: true
      })
    });
    return response.json();
  }
}
```

**Modify existing SOS endpoint to trigger Webex:**
```diff
// server/routes.ts - POST /api/sos
+ import { webexService } from './services/webex-service';

  app.post("/api/sos", async (req, res) => {
    // ... existing SOS broadcast logic ...

+   // Send alert to Webex Space
+   await webexService.sendSOSAlert({ senderId, location, content });
+
+   // Create incident room for coordination
+   const room = await webexService.createIncidentRoom(sosMessages[0].id);

    res.json({ message: "SOS broadcast sent", ... });
  });
```

---

### 5. 🔒 SECURE: Duo / Secure Access / Umbrella — Protected Access

> **Current gap:** ResQNet has crypto (ECDSA, AES-GCM) for message-level security but no user authentication or network-level security.

#### Integration Strategy

**Cisco Duo for Multi-Factor Authentication:**
- Responders and coordinators must authenticate via Duo MFA before accessing the ResQNet dashboard
- Ensures only authorized personnel can view sensitive disaster data and send commands
- Use Duo Web SDK for seamless browser-based MFA

**Cisco Umbrella for DNS-layer Security:**
- All outbound traffic from ResQNet nodes routes through Umbrella
- Blocks malicious domains that might try to spoof disaster communications
- Prevents phishing attacks targeting responders during chaos

**Cisco Secure Access:**
- Zero-trust access to the ResQNet backend APIs
- Each mesh node must authenticate before joining the network

**Implementation in code:**
```typescript
// NEW: server/middleware/duo-auth.ts
import Duo from '@duosecurity/duo_universal';

const duoClient = new Duo.Client({
  clientId: process.env.DUO_CLIENT_ID!,
  clientSecret: process.env.DUO_CLIENT_SECRET!,
  apiHost: process.env.DUO_API_HOST!,
  redirectUrl: `${process.env.APP_URL}/api/auth/duo-callback`
});

export async function duoAuthMiddleware(req, res, next) {
  // Verify Duo session token
  const duoToken = req.headers['x-duo-token'];
  if (!duoToken) {
    return res.status(401).json({ message: 'Duo authentication required' });
  }

  try {
    const result = await duoClient.exchangeAuthorizationCodeFor2FAResult(
      duoToken, req.session.userId
    );
    if (result.auth_result.status === 'allow') {
      next();
    } else {
      res.status(403).json({ message: 'MFA verification failed' });
    }
  } catch (error) {
    res.status(401).json({ message: 'Invalid Duo token' });
  }
}
```

---

## 🧠 AI Layer (Bonus — Tied to POC)

> The challenge says: *"AI can support prediction, prioritization, routing, summarization, and reporting."*

**How to add AI explainably:**

| AI Use Case | Implementation | Cisco Tie-in |
|-------------|----------------|--------------|
| **Route Prediction** | Use historical latency data from ThousandEyes to predict which paths will degrade next | ThousandEyes data → ML model → proactive Dijkstra re-routing |
| **SOS Prioritization** | Classify incoming SOS messages by severity using NLP | Splunk anomaly detection → priority queue in Webex Spaces |
| **Incident Summarization** | Auto-generate after-action reports from Splunk event logs | Splunk search → LLM summary → posted to Webex Space |
| **Resource Optimization** | Use Cisco Spaces occupancy data to predict shelter capacity | Cisco Spaces → demand forecasting → resource allocation |

---

## 📊 Updated Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        ResQNet Architecture                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  FIELD LAYER (Connect + Sense)                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │ Meraki MR    │  │ Meraki MT   │  │ Cisco Spaces│               │
│  │ Access Points│  │ Sensors     │  │ Location    │               │
│  │ (Mesh Nodes) │  │ (Env. Data) │  │ Analytics   │               │
│  └──────┬───────┘  └──────┬──────┘  └──────┬──────┘               │
│         │                 │                 │                      │
│  ───────┴────────────────┴────────────────┴──────────────         │
│                           │                                        │
│  APPLICATION LAYER                                                 │
│  ┌──────────────────────────────────────────────────┐             │
│  │              ResQNet Backend (Express.js)         │             │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │             │
│  │  │ Dijkstra │ │ Crypto   │ │ Webex Service    │  │             │
│  │  │ Router   │ │ Engine   │ │ (Alerts/Rooms)   │  │             │
│  │  └──────────┘ └──────────┘ └──────────────────┘  │             │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │             │
│  │  │ Meraki   │ │ Sensor   │ │ Observability    │  │             │
│  │  │ Service  │ │ Service  │ │ Service          │  │             │
│  │  └──────────┘ └──────────┘ └──────────────────┘  │             │
│  └──────────────────────────────────────────────────┘             │
│                           │                                        │
│  OBSERVE LAYER                                                     │
│  ┌─────────────┐  ┌─────────────┐                                 │
│  │ThousandEyes │  │   Splunk    │                                 │
│  │ Path Monitor│  │  Analytics  │                                 │
│  └─────────────┘  └─────────────┘                                 │
│                                                                    │
│  SECURE LAYER                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │  Cisco Duo  │  │  Umbrella   │  │Secure Access│               │
│  │    (MFA)    │  │ (DNS Sec.)  │  │ (Zero Trust)│               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                    │
│  ENGAGE LAYER                                                      │
│  ┌───────────────────────────────────────────────┐                │
│  │             Webex APIs                         │                │
│  │  Messaging │ Meetings │ Webhooks │ Bots       │                │
│  └───────────────────────────────────────────────┘                │
│                                                                    │
│  FRONTEND (React Dashboard + Mapbox + Simulation)                  │
│  ┌───────────────────────────────────────────────┐                │
│  │  Dashboard │ Maps │ Simulation │ Messages     │                │
│  └───────────────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Strengths of Your Current Project

| Strength | Why It Matters for the Challenge |
|----------|----------------------------------|
| ✅ Self-healing mesh with Dijkstra | Directly solves "keep people connected when conditions are unstable" |
| ✅ Full crypto pipeline (ECDSA + AES-GCM) | Strong security story for the "Secure" pillar |
| ✅ BLE simulation with realistic device types | Shows IoT field-level sensing capability |
| ✅ 6-step animated simulation | Perfect for the 5-minute demo video |
| ✅ Real GPS + Mapbox visualization | Visually compelling for the pitch |
| ✅ SOS broadcast with flood routing | Emergency response feature baked in |
| ✅ PostgreSQL persistence | Production-ready data layer |

## ⚠️ Gaps to Address Before Submission

| Gap | Priority | Fix |
|-----|----------|-----|
| No Cisco products integrated | 🔴 Critical | Implement Webex API (fastest ROI) + Meraki dashboard API |
| No volunteer/resource tracking | 🟡 Medium | Add a shelter resource tracker using Cisco Spaces occupancy |
| No early warning alerts | 🟡 Medium | Connect ThousandEyes outage detection → SOS auto-trigger |
| No user authentication | 🟠 Low | Add Duo MFA for dashboard access |
| README doesn't mention Cisco | 🔴 Critical | Update README with Cisco architecture |

---

## 🚀 Recommended Implementation Priority

Given you have until **July 13**, here's the order I'd recommend:

### Week 1 (July 4-9): Core Cisco Integrations
1. **Webex API integration** (1-2 days) — Fastest to implement, highest impact for demo
   - SOS → Webex Space alert
   - Incident room creation
   - Webhook for bi-directional messaging
2. **Meraki Dashboard API** (1-2 days) — Connects field data
   - Pull real device status from Meraki API
   - Map Meraki APs to ResQNet nodes
   - Show Meraki network health on dashboard

### Week 2 (July 9-13): Polish & Submission
3. **ThousandEyes/Splunk observability** (1 day) — Observability layer
   - Log events to Splunk HEC
   - Show ThousandEyes path health data
4. **Duo auth** (0.5 days) — Quick security win
5. **3-slide deck + demo video** (1-2 days)
6. **README and documentation update** (0.5 days)

---

> [!IMPORTANT]
> The **#1 most impactful thing you can do right now** is integrate the **Webex API**. It's the easiest Cisco API to get started with (free developer accounts available at [developer.webex.com](https://developer.webex.com)), it directly ties into your existing SOS broadcast feature, and it demonstrates the "Engage" pillar convincingly.

> [!TIP]
> For the Meraki API, you can use the [Meraki Dashboard API sandbox](https://developer.cisco.com/meraki/meraki-platform/) — Cisco provides free sandbox environments for exactly these kinds of hackathons. Check [devnetsandbox.cisco.com](https://devnetsandbox.cisco.com) for reservable sandbox instances.
