# ResQNet — Complete Project Documentation

> **Disaster Relief Communication Network powered by Cisco**
> Code with Cisco · Capture the Silver Flag · July 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [File Structure & Module Breakdown](#4-file-structure--module-breakdown)
5. [Core Systems Deep-Dive](#5-core-systems-deep-dive)
6. [Cisco Integration — What's Done](#6-cisco-integration--whats-done)
7. [Cisco Integration — What's Working vs Not](#7-cisco-integration--whats-working-vs-not)
8. [API Reference](#8-api-reference)
9. [What Can Be Done Further](#9-what-can-be-done-further)
10. [Environment Variables](#10-environment-variables)
11. [Running the Project](#11-running-the-project)

---

## 1. Project Overview

**ResQNet** is an IoT-based Disaster Communication Network that creates a resilient mesh topology for emergency communication when traditional infrastructure (cell towers, internet) fails during natural disasters.

### The Problem
During floods, earthquakes, or cyclones, communication infrastructure is often the first thing to fail. Rescue teams can't coordinate, civilians can't call for help, and shelters can't report capacity or supply needs.

### Our Solution
ResQNet deploys a self-healing mesh network using Cisco Meraki access points as backbone nodes. Each node communicates with its neighbors, and messages are routed through the network using Dijkstra's shortest-path algorithm. If a node goes down, the network automatically reroutes through surviving paths.

### Key Features
- **Self-healing mesh network** — 12 nodes across Bangalore with auto-failover
- **Dijkstra-based smart routing** — finds optimal message paths in real-time
- **SOS broadcast system** — flood-protocol emergency alerts to all nodes
- **End-to-end encryption** — ECDSA P-256 signatures + AES-256-GCM encryption
- **BLE device discovery** — finds nearby devices via Bluetooth Low Energy
- **Real GPS tracking** — tracks user location for rescue coordination
- **Cisco Webex alerts** — SOS triggers real messages in Webex Spaces
- **Cisco Meraki monitoring** — maps network APs to mesh node locations
- **ThousandEyes path monitoring** — tracks network health between nodes
- **Shelter monitoring** — temperature, humidity, occupancy tracking at relief sites
- **6-step animated simulation** — demonstrates the entire disaster response flow

### Challenge Alignment
This project targets **Theme 1: Resilient Disaster Response** from the Code with Cisco challenge, addressing the question: *"When the ground shakes or the flood rises, how do you keep people connected, located, and safe?"*

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React 18 + TypeScript | Component-based UI |
| **Styling** | Tailwind CSS + Radix UI (shadcn/ui) | Design system |
| **Maps** | Mapbox GL JS | 3D map visualization with satellite/dark modes |
| **State Management** | TanStack React Query | Server state + cache + real-time polling |
| **Client Routing** | Wouter | Lightweight SPA routing |
| **Backend** | Node.js + Express.js | REST API server |
| **Database** | PostgreSQL (Neon serverless) | Persistent data (with in-memory mock fallback) |
| **ORM** | Drizzle ORM | Type-safe database queries |
| **Build Tool** | Vite | Fast dev server + HMR |
| **IoT Simulation** | Web Bluetooth API | BLE device discovery and mesh extension |
| **Cryptography** | Web Crypto API | ECDSA signing, AES-GCM encryption, HKDF key derivation |
| **GPS** | Geolocation API | Real-time user location tracking |
| **Cisco: Engage** | Webex APIs | SOS alerts + incident room creation |
| **Cisco: Connect** | Meraki Dashboard API | Network infrastructure monitoring |
| **Cisco: Observe** | ThousandEyes + Splunk | Path health + event analytics |
| **Cisco: Sense** | Cisco Spaces + Meraki MT | Shelter environment monitoring (simulated) |
| **Env Management** | dotenv | Server-side environment variable loading |

---

## 3. Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                     ResQNet System Architecture                       │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    FIELD LAYER (Connect + Sense)                │  │
│  │                                                                 │  │
│  │  Cisco Meraki MR         Meraki MT Sensors      Cisco Spaces    │  │
│  │  Access Points           (Temp/Humidity/         (Occupancy/    │  │
│  │  (12 Mesh Nodes)          Water/Air Quality)     Location)      │  │
│  │                                                                 │  │
│  │  BLE Beacons             GPS (Geolocation API)                  │  │
│  │  (6 Simulated Devices)   (Real + Fallback)                      │  │
│  └───────────────────────────┬─────────────────────────────────────┘  │
│                              │                                        │
│  ┌───────────────────────────┴─────────────────────────────────────┐  │
│  │                  APPLICATION LAYER (Express.js)                 │  │
│  │                                                                 │  │
│  │  ┌──────────────┐   ┌──────────────┐  ┌──────────────────────┐  │  │
│  │  │   Storage    │   │   Routes     │  │   Cisco Services     │  │  │
│  │  │  (Mock DB/   │   │  (REST API)  │  │  ┌────────────────┐  │  │  │
│  │  │   Postgres)  │   │              │  │  │ webex-service  │  │  │  │
│  │  └──────────────┘   │  /api/nodes  │  │  │ meraki-service │  │  │  │
│  │                     │  /api/sos    │  │  │ observability  │  │  │  │
│  │                     │  /api/cisco/*│  │  └────────────────┘  │  │  │
│  │                     └──────────────┘  └──────────────────────┘  │  │
│  └───────────────────────────┬─────────────────────────────────────┘  │
│                               │                                       │
│  ┌───────────────────────────┴─────────────────────────────────────┐  │
│  │                    OBSERVE LAYER                                │  │
│  │                                                                 │  │
│  │  ThousandEyes              Splunk                               │  │
│  │  (Network Path Health)     (Event Analytics + Anomaly Detect.)  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    SECURE LAYER                                 │  │
│  │                                                                 │  │
│  │  Web Crypto API           Cisco Duo (planned)                   │  │
│  │  (ECDSA + AES-GCM)        (MFA for dashboard access)            │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    ENGAGE LAYER                                 │  │
│  │                                                                 │  │
│  │  Webex Messaging API       Webex Rooms API                      │  │
│  │  (SOS Alerts → Space)      (Auto-create incident rooms)         │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                 FRONTEND (React + Mapbox + Simulation)          │  │
│  │                                                                 │  │
│  │  Dashboard │ Maps │ Simulation │ Messages │ Settings            │  │
│  │                                                                 │  │
│  │  Dashboard Cards:                                               │  │
│  │  Metrics │ Network │ Nodes │ Security │ BLE │ Emergency         │  │
│  │  Webex   │ Meraki  │ Observability   │ Shelter Monitoring       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 4. File Structure & Module Breakdown

### Server (`server/`)

| File | Lines | Purpose |
|------|-------|---------|
| [index.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/server/index.ts) | 26 | Entry point — loads dotenv, creates app, starts Vite dev server on port 5050 |
| [app.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/server/app.ts) | ~50 | Express app factory — configures middleware, registers routes |
| [routes.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/server/routes.ts) | 345 | All API endpoints — nodes, messages, connections, SOS, network stats, + 13 Cisco endpoints |
| [storage.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/server/storage.ts) | 333 | Database storage interface + PostgreSQL implementation with default data seeding |
| [db.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/server/db.ts) | 495 | Mock database implementation — full in-memory DB with 12 nodes, 17 connections, 5 messages |
| [vite.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/server/vite.ts) | ~70 | Vite dev server integration + static file serving for production |

### Server Services (`server/services/`) — *NEW: Cisco Integration*

| File | Lines | Purpose |
|------|-------|---------|
| [webex-service.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/server/services/webex-service.ts) | ~300 | **Cisco Webex** — sends SOS alerts to Spaces, creates incident rooms, tracks alert history. Live mode with real Webex API calls. |
| [meraki-service.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/server/services/meraki-service.ts) | ~335 | **Cisco Meraki** — fetches device status from Dashboard API, calculates network health, maps APs to mesh nodes. Connected to DevNet sandbox. |
| [observability-service.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/server/services/observability-service.ts) | ~280 | **ThousandEyes + Splunk** — event logging, network path health monitoring, anomaly detection (mass disconnections, SOS triggers). Simulated mode. |

### Client Pages (`client/src/pages/`)

| File | Lines | Purpose |
|------|-------|---------|
| [landing.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/pages/landing.tsx) | ~80 | Hero landing page with gradient animation and "Enter App" CTA |
| [home.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/pages/home.tsx) | 311 | Main dashboard — metric cards, network overview, node list, security status, BLE, + 4 Cisco cards |
| [maps.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/pages/maps.tsx) | 741 | Mapbox GL map with mesh node markers, connection lines, GPS tracking, emergency mode, 3D buildings, style switching |
| [simulation.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/pages/simulation.tsx) | ~1000 | 6-step animated disaster response scenario with network graph visualization |
| [not-found.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/pages/not-found.tsx) | ~20 | 404 page |

### Client Components (`client/src/components/`)

| File | Lines | Purpose |
|------|-------|---------|
| [sos-button.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/sos-button.tsx) | ~250 | Animated SOS button — triggers broadcast to all nodes + Webex alert |
| [bluetooth-manager.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/bluetooth-manager.tsx) | ~450 | BLE device scanner — shows discovered devices, signal strength, emergency status |
| [messages-view.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/messages-view.tsx) | ~350 | Chat-like message log with routing path visualization and encryption indicators |
| [emergency-features.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/emergency-features.tsx) | 311 | Emergency status panel — network health, BLE device counts, emergency protocol info |
| [settings-view.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/settings-view.tsx) | ~220 | App settings — map style, notifications, encryption toggles |
| [bottom-navigation.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/bottom-navigation.tsx) | ~60 | Mobile-style bottom nav bar — Home, Maps, Simulation, Messages, Settings |

### Dashboard Cards (`client/src/components/dashboard/`)

| File | Purpose | Status |
|------|---------|--------|
| [metric-card.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/dashboard/metric-card.tsx) | Reusable metric display (value + label + icon) | Original |
| [network-overview.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/dashboard/network-overview.tsx) | SVG mesh topology visualization with animated connections | Original |
| [node-list-card.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/dashboard/node-list-card.tsx) | Scrollable list of all 12 nodes with status/signal indicators | Original |
| [location-status-card.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/dashboard/location-status-card.tsx) | GPS coordinates, accuracy, and refresh button | Original |
| [emergency-actions-card.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/dashboard/emergency-actions-card.tsx) | Quick action buttons — find helpers, share location, contacts | Original |
| [landing-hero.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/dashboard/landing-hero.tsx) | Animated hero section for landing page | Original |
| [webex-status-card.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/dashboard/webex-status-card.tsx) | Webex live/sim badge, bot info, alert history, "Test Alert" button | **NEW — Cisco** |
| [cisco-infrastructure-card.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/dashboard/cisco-infrastructure-card.tsx) | Meraki AP list, network health bar, online/offline/alerting counts | **NEW — Cisco** |
| [observability-card.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/dashboard/observability-card.tsx) | ThousandEyes path health, Splunk event feed, anomaly alerts, avg latency | **NEW — Cisco** |
| [shelter-monitoring-card.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/dashboard/shelter-monitoring-card.tsx) | 4 shelter sites with live temp/humidity/air quality/occupancy bars | **NEW — Cisco** |

### Core Libraries (`client/src/lib/`)

| File | Lines | Purpose |
|------|-------|---------|
| [network-simulation.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/network-simulation.ts) | ~350 | Mesh network simulation engine — node management, self-healing, event system, emergency mode |
| [dijkstra.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/dijkstra.ts) | ~150 | Dijkstra's shortest-path algorithm + BFS flood broadcast for SOS |
| [crypto-service.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/crypto-service.ts) | ~400 | Full crypto pipeline — ECDSA P-256 keypairs, AES-256-GCM encryption, HKDF key derivation, signature verification |
| [bluetooth-service.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/bluetooth-service.ts) | ~550 | Web Bluetooth API integration with GATT, service UUIDs, advertisement parsing, simulation fallback |
| [ble-simulator.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/ble-simulator.ts) | 338 | 6 simulated BLE devices with movement patterns (walking/driving/static), battery drain, RSSI calculation |
| [location-service.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/location-service.ts) | 157 | GPS location tracking with subscriber pattern, Haversine distance calculation |
| [queryClient.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/queryClient.ts) | ~50 | TanStack React Query client configuration |
| [utils.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/utils.ts) | ~15 | Utility functions (formatRounded, cn class merger) |

---

## 5. Core Systems Deep-Dive

### 5.1 Mesh Network Simulation

The network consists of **12 nodes** around RV College, Bangalore, connected via **17 bidirectional links**. The simulation engine ([network-simulation.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/network-simulation.ts)) provides:

- **Self-healing**: Nodes randomly go offline/online; the mesh reroutes around failures
- **Emergency mode**: Reduces latency multipliers, increases broadcast frequency
- **Event-driven**: Subscribe to node_connected, node_disconnected, message_sent, sos_broadcast events
- **BLE integration**: Discovered BLE devices are added as temporary mesh nodes

**Nodes**: user (RV College), rv-gate, mysore-road, kengeri, hoskerehalli, rajarajeshwari, banashankari, jayanagar, vijayanagar, magadi-road, nandini-layout, peenya

### 5.2 Dijkstra Routing

[dijkstra.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/dijkstra.ts) implements:
- **Shortest-path**: Standard Dijkstra with edge weights = `distance × latency_factor`
- **Multi-path**: Can compute multiple alternative routes
- **Flood broadcast**: BFS-based flooding for SOS messages — reaches all reachable nodes
- **Dynamic recalculation**: Routes recalculated when node status changes

### 5.3 Cryptographic Security

[crypto-service.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/crypto-service.ts) provides enterprise-grade security:
- **ECDSA P-256** keypair generation — one per node (12 default pairs)
- **Digital signatures** on all messages — SHA-256 hash signed with private key
- **AES-256-GCM** end-to-end encryption — messages encrypted with per-pair symmetric keys
- **HKDF** key derivation — derives symmetric keys from ECDH shared secrets
- **Stats tracking**: messages signed, encrypted, integrity failures

### 5.4 BLE Device Discovery

[bluetooth-service.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/bluetooth-service.ts) +
[ble-simulator.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/lib/ble-simulator.ts):
- **Real Bluetooth**: Uses Web Bluetooth API with ResQNet-specific GATT service UUIDs
- **Simulated fallback**: 6 devices — emergency responder phone, college beacon, relay station, medical device, civilian phone, emergency vehicle
- **Movement**: Walking, driving, and static patterns with realistic RSSI calculation
- **Battery drain**: Medical devices drain faster, beacons are efficient, relay stations have backup power

### 5.5 Simulation Scenario (6 Steps)

The [simulation page](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/pages/simulation.tsx) walks through:
1. **Incident Detected** — Kengeri Camp → Gate Relay → RV Base
2. **Route Calculated** — Dijkstra avoids failed hospital, picks backup relay
3. **Broadcast Fan-out** — Command broadcasts to 6 devices
4. **Rescue Dispatched** — Rescue Van acknowledges and updates
5. **Network Heals** — Backup relay keeps hospital route alive
6. **Secure Channel Verified** — E2E encryption and digital signatures visualized

---

## 6. Cisco Integration — What's Done

### 6.1 Cisco Webex (Engage Layer) ✅ LIVE

**What we built**: When an SOS is triggered in ResQNet, it sends a **real message** to a Webex Space via the Webex Messaging API and auto-creates a dedicated **incident room** for responder coordination.

**Files**:
- [webex-service.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/server/services/webex-service.ts) — API wrapper
- [webex-status-card.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/dashboard/webex-status-card.tsx) — Dashboard UI
- Modified [routes.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/server/routes.ts) — SOS endpoint wired to Webex

**Features**:
- SOS → sends formatted markdown alert to "resQ Alerts" Webex Space with Google Maps link
- Auto-creates a new Webex Space per incident (e.g., "ResQNet Incident #6 - 4/7/2026")
- Posts initial briefing message to incident room
- Status update alerts (network events, node changes)
- "Send Test Alert" button on dashboard sends a real message
- Alert history tracking with delivery confirmation
- Dashboard shows: live/sim badge, bot name, room name, alerts sent count, recent alert feed

**Verified**: ✅ Test alert appeared in real Webex Space. SOS broadcast delivered with message ID.

---

### 6.2 Cisco Meraki (Connect Layer) ✅ CONNECTED (with simulated baseline)

**What we built**: ResQNet's 12 mesh nodes are mapped to Cisco Meraki MR access points. The dashboard shows Meraki AP status, network health score, and device details.

**Files**:
- [meraki-service.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/server/services/meraki-service.ts) — Dashboard API wrapper
- [cisco-infrastructure-card.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/dashboard/cisco-infrastructure-card.tsx) — Dashboard UI

**Features**:
- Connected to Meraki Dashboard API via DevNet Always-On Sandbox
- Auto-discovers organizations and networks from API
- 8 simulated Meraki MR access points (MR44, MR46, MR56) mapped to ResQNet locations
- Each AP has: serial, model, status (online/offline/alerting), LAN IP, firmware version, tags
- Network health score calculated as % of online devices
- Health bar with color coding (green/amber/red)
- Scrollable device list with status indicators

**Verified**: ✅ API connected to DevNet sandbox. Simulated AP data renders on dashboard.

---

### 6.3 ThousandEyes + Splunk (Observe Layer) 🟡 SIMULATED

**What we built**: An observability service that monitors network path health between mesh nodes, logs all network events, and detects anomalies.

**Files**:
- [observability-service.ts](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/server/services/observability-service.ts) — Event logging + path health + anomaly detection
- [observability-card.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/dashboard/observability-card.tsx) — Dashboard UI

**Features**:
- **8 monitored network paths** with latency, jitter, and packet loss metrics
- Path health status: healthy / degraded / critical
- Path health refreshes every 15 seconds with realistic fluctuations
- **Event logging**: All node status changes and SOS broadcasts are logged
- **Anomaly detection**: 3+ node disconnections in 60 seconds triggers a "mass disconnection" alert
- SOS broadcasts are flagged as anomalies
- Event analytics: breakdown by type and severity
- Recent event feed on dashboard
- Splunk HEC forwarding ready (sends structured JSON events when configured)
- ThousandEyes API integration ready (queries path health when configured)

**Verified**: ✅ Path health data renders. SOS event logged with critical severity. Anomaly detection triggered.

---

### 6.4 Cisco Spaces + Meraki MT Sensors (Sense Layer) 🟡 SIMULATED

**What we built**: A shelter monitoring dashboard showing environmental conditions at relief sites, mapped to the Cisco Spaces and Meraki MT sensor API format.

**Files**:
- [shelter-monitoring-card.tsx](file:///c:/Abhinav_Shukla/MyProjects/DisasterNetworkSimulator/client/src/components/dashboard/shelter-monitoring-card.tsx) — Dashboard UI with simulated sensor data

**Features**:
- **4 shelter sites**: Kengeri Relief Camp, RV College Shelter, Banashankari Community Hall, Magadi Road Hospital
- Live-updating data (8-second interval): temperature, humidity, air quality, occupancy
- Occupancy bars with color coding: green (<70%), amber (70-90%), red (>90%)
- Water level indicators: adequate / low / critical
- Summary metrics: total occupancy, average temperature, active sites
- Data format matches Meraki MT sensor API response structure

**Verified**: ✅ All 4 shelters render with live-updating data on dashboard.

---

### 6.5 Cisco Duo (Secure Layer) ❌ NOT YET IMPLEMENTED

**Planned**: MFA authentication for dashboard access. Responders must verify identity via Duo before accessing sensitive features (SOS, node management).

---

## 7. Cisco Integration — What's Working vs Not

### ✅ Fully Working

| Feature | Mode | Evidence |
|---------|------|----------|
| Webex SOS alerts | **LIVE** | Real messages appear in Webex Space with message ID |
| Webex incident rooms | **LIVE** | New Webex Space auto-created per SOS with briefing message |
| Webex test alert button | **LIVE** | Dashboard button sends real message to Webex |
| Webex alert history | **LIVE** | Delivery tracking with timestamps |
| Meraki API connection | **LIVE** | Connected to DevNet sandbox, org discovered |
| Meraki AP dashboard | **Simulated** | 8 APs with realistic status, health score |
| ThousandEyes path health | **Simulated** | 8 paths with latency/jitter/loss, auto-refreshing |
| Event logging | **Working** | All node changes and SOS events logged in-memory |
| Anomaly detection | **Working** | Mass disconnection detection, SOS flagging |
| Shelter monitoring | **Simulated** | 4 sites with live-updating sensor data |
| All 13 Cisco API endpoints | **Working** | Tested via API calls, all return 200/304 |
| Dashboard Cisco cards | **Working** | All 4 cards render correctly with live data |

### ⚠️ Partially Working

| Feature | Issue | Fix |
|---------|-------|-----|
| Meraki live device data | DevNet sandbox returns empty device list for some orgs | Simulated baseline ensures dashboard always shows data |
| Splunk event forwarding | Needs Splunk Cloud trial HEC token | Events stored in-memory; add `SPLUNK_HEC_URL` + `SPLUNK_HEC_TOKEN` to enable |
| ThousandEyes live data | Needs ThousandEyes API token | Simulated data is architecturally correct; add `THOUSANDEYES_API_TOKEN` to enable |

### ❌ Not Working / Not Implemented

| Feature | Reason | Priority |
|---------|--------|----------|
| Cisco Duo MFA | Not implemented yet | Low — security pillar covered by existing Web Crypto |
| Cisco Umbrella | Not implemented — requires enterprise account | Low |
| Webex Meetings | Not implemented — would create instant meetings for command teams | Medium |
| Webex Webhooks (inbound) | Not implemented — would allow Webex → ResQNet bidirectional messaging | Medium |
| Real Meraki MV cameras | Requires physical hardware | N/A for POC |

---

## 8. API Reference

### Original Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/nodes` | All 12 mesh nodes |
| GET | `/api/nodes/:nodeId` | Single node details |
| POST | `/api/nodes` | Create a new node |
| PATCH | `/api/nodes/:nodeId/status` | Update node online/signal status (+ logs to observability) |
| GET | `/api/messages` | All messages |
| GET | `/api/messages/:nodeId` | Messages for a specific node |
| POST | `/api/messages` | Send a new message |
| PATCH | `/api/messages/:id/deliver` | Mark message as delivered |
| DELETE | `/api/messages` | Clear all messages |
| GET | `/api/connections` | All mesh connections |
| POST | `/api/connections` | Create a new connection |
| POST | `/api/sos` | **SOS broadcast** — sends to all nodes + Webex alert + incident room |
| GET | `/api/network/stats` | Network statistics (connected nodes, latency, coverage) |

### Cisco Integration Endpoints (NEW)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/cisco/status` | Unified status of all Cisco integrations |
| GET | `/api/cisco/webex/status` | Webex connection status, bot info, counts |
| GET | `/api/cisco/webex/alerts` | Alert history (all sent Webex messages) |
| GET | `/api/cisco/webex/rooms` | List of auto-created incident rooms |
| POST | `/api/cisco/webex/test` | Send a test message to Webex |
| GET | `/api/cisco/meraki/status` | Meraki API connection status |
| GET | `/api/cisco/meraki/devices` | Meraki AP device list with status |
| GET | `/api/cisco/meraki/health` | Network health score |
| GET | `/api/cisco/observability/status` | Splunk/ThousandEyes connection status |
| GET | `/api/cisco/observability/events` | Event log (filterable by `?limit=N`) |
| GET | `/api/cisco/observability/analytics` | Event breakdown by type/severity |
| GET | `/api/cisco/observability/anomalies` | Detected anomalies |
| GET | `/api/cisco/observability/path-health` | ThousandEyes-style path health data |

---

## 9. What Can Be Done Further

### 9.1 Webex Webhooks (Bidirectional Messaging)
**What**: Register a webhook so messages sent by responders in Webex appear in ResQNet's message log.
**Impact**: Demonstrates true two-way Cisco integration — not just push, but pull.
**Effort**: ~2 hours

### 9.2 Webex Adaptive Cards
**What**: Instead of plain markdown, send rich interactive cards in Webex with buttons like "Acknowledge SOS", "En Route", "Resolved".
**Impact**: Makes the demo video much more impressive.
**Effort**: ~1-2 hours

### 9.3 Cisco Duo Authentication
**What**: Add a login page with Duo MFA. Responders must verify their identity before accessing the dashboard.
**Impact**: Completes the "Secure" pillar of Cisco integration.
**Effort**: ~3-4 hours (needs free Duo developer account)

### 9.4 Real Splunk Dashboard
**What**: Connect to Splunk Cloud (free trial) and show real Splunk dashboards with ResQNet event data.
**Impact**: Demonstrates enterprise-grade analytics capability.
**Effort**: ~2 hours (needs Splunk Cloud trial)

### 9.5 AI-Powered Features
**What**: Add AI capabilities tied to Cisco products:
- **Route prediction**: Use historical ThousandEyes data to predict path degradation
- **SOS prioritization**: NLP classification of SOS messages by severity
- **Incident summarization**: Auto-generate after-action reports from Splunk event logs
- **Shelter capacity forecasting**: Predict shelter occupancy from Cisco Spaces trends
**Impact**: Directly addresses the challenge requirement: *"AI can support prediction, prioritization, routing, summarization, and reporting"*
**Effort**: ~4-6 hours

### 9.6 Enhanced Simulation (Step 7: Cisco Alert)
**What**: Add a 7th step to the simulation showing the Webex notification flow — SOS triggers, Webex message sent, responder acknowledges in Webex, status reflected back in ResQNet.
**Impact**: Makes the simulation tell the complete Cisco-powered story.
**Effort**: ~2-3 hours

### 9.7 Architecture Diagram Page
**What**: Create an interactive page in the app showing the full system architecture with Cisco product logos and data flow arrows.
**Impact**: Helps with the 3-slide deck and makes the POC self-documenting.
**Effort**: ~2 hours

### 9.8 README Update
**What**: Update the README.md with Cisco architecture, setup instructions, and screenshots.
**Impact**: Required for the public GitHub repository submission.
**Effort**: ~1 hour

---

## 10. Environment Variables

```env
# ── Existing ──────────────────────────────────────────────
DATABASE_URL="postgresql://..."          # Neon PostgreSQL (or mock DB used)
VITE_MAPBOX_API_KEY="pk.eyJ1..."         # Mapbox GL for map visualization

# ── Cisco: Webex (Engage) ── CONFIGURED ✅ ────────────────
WEBEX_BOT_TOKEN="M2RmYjgx..."           # From developer.webex.com
WEBEX_ROOM_ID="Y2lzY29zcG..."           # "resQ Alerts" Webex Space ID

# ── Cisco: Meraki (Connect) ── CONFIGURED ✅ ──────────────
MERAKI_API_KEY="6bec40cf..."             # DevNet Always-On Sandbox key
MERAKI_ORG_ID=                           # Auto-discovered from API
MERAKI_NETWORK_ID=                       # Auto-discovered from API

# ── Cisco: ThousandEyes (Observe) ── OPTIONAL ─────────────
THOUSANDEYES_API_TOKEN=                  # From DevNet sandbox

# ── Cisco: Splunk (Observe) ── OPTIONAL ───────────────────
SPLUNK_HEC_URL=                          # e.g. https://instance.splunkcloud.com:8088
SPLUNK_HEC_TOKEN=                        # HEC authentication token

# ── Cisco: Duo (Secure) ── NOT YET IMPLEMENTED ───────────
DUO_CLIENT_ID=
DUO_CLIENT_SECRET=
DUO_API_HOST=
```

All Cisco env vars are **optional** — the app runs in simulation mode without them.

---

## 11. Running the Project

```bash
# Install dependencies
npm install

# Start development server (loads .env via dotenv)
npm run dev

# Server starts on http://localhost:5050
# Console output shows Cisco service status:
#   🟢 Webex Service: LIVE mode
#   🟢 Meraki Service: LIVE mode
#   🟢 Observability: Splunk=SIMULATION, ThousandEyes=SIMULATION
```

### Routes
| URL | Page |
|-----|------|
| `/` | Landing page |
| `/app` | Main dashboard with Cisco cards |
| `/maps` | Mapbox visualization |
| `/simulation` | 6-step disaster response scenario |
| `/messages` | Message log |
| `/settings` | App settings |

---

> **Total files in project**: ~40+ source files
> **New files added for Cisco**: 7 (3 services + 4 dashboard components)
> **Modified files for Cisco**: 4 (routes.ts, index.ts, home.tsx, .env)
> **Cisco API endpoints**: 13 new endpoints
> **Lines of code added**: ~2,500+ lines for Cisco integration
