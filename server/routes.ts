import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, insertNetworkNodeSchema } from "@shared/schema";
import { z } from "zod";
import { webexService } from "./services/webex-service";
import { merakiService } from "./services/meraki-service";
import { observabilityService } from "./services/observability-service";

const nodeStatusSchema = z.object({
  isOnline: z.boolean(),
  signalStrength: z.number().int().min(0).max(100).optional(),
});

const sosSchema = z.object({
  senderId: z.string().min(1),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  content: z.string().min(1).optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Network nodes routes
  app.get("/api/nodes", async (req, res) => {
    try {
      const nodes = await storage.getAllNodes();
      res.json(nodes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch nodes" });
    }
  });

  app.get("/api/nodes/:nodeId", async (req, res) => {
    try {
      const node = await storage.getNode(req.params.nodeId);
      if (!node) {
        return res.status(404).json({ message: "Node not found" });
      }
      res.json(node);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch node" });
    }
  });

  app.post("/api/nodes", async (req, res) => {
    try {
      const nodeData = insertNetworkNodeSchema.parse(req.body);
      const node = await storage.createNode(nodeData);
      res.status(201).json(node);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid node data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create node" });
    }
  });

  app.patch("/api/nodes/:nodeId/status", async (req, res) => {
    try {
      const { isOnline, signalStrength } = nodeStatusSchema.parse(req.body);
      await storage.updateNodeStatus(req.params.nodeId, isOnline, signalStrength);

      // Log to Cisco Observability
      await observabilityService.logEvent(
        isOnline ? "node_connected" : "node_disconnected",
        req.params.nodeId,
        `Node ${req.params.nodeId} went ${isOnline ? "online" : "offline"}${signalStrength ? ` (signal: ${signalStrength}%)` : ""}`,
        isOnline ? "info" : "warning",
        { isOnline, signalStrength },
      );

      res.json({ message: "Node status updated" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid node status", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update node status" });
    }
  });

  // Network connections routes
  app.get("/api/connections", async (req, res) => {
    try {
      const connections = await storage.getAllConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });

  app.get("/api/connections/:nodeId", async (req, res) => {
    try {
      const connections = await storage.getConnectionsForNode(req.params.nodeId);
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch node connections" });
    }
  });

  // Messages routes
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getAllMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/:nodeId", async (req, res) => {
    try {
      const messages = await storage.getMessagesByNode(req.params.nodeId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch node messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.patch("/api/messages/:messageId/delivered", async (req, res) => {
    try {
      const messageId = Number(req.params.messageId);
      if (!Number.isInteger(messageId)) {
        return res.status(400).json({ message: "Invalid message id" });
      }

      await storage.markMessageDelivered(messageId);
      res.json({ message: "Message marked as delivered" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update message status" });
    }
  });

  app.delete("/api/messages", async (req, res) => {
    try {
      await storage.clearAllMessages();
      res.json({ message: "All messages cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear messages" });
    }
  });

  // SOS broadcast endpoint — now triggers Cisco Webex alerts
  app.post("/api/sos", async (req, res) => {
    try {
      const { senderId, location, content } = sosSchema.parse(req.body);
      
      // Get all online nodes for broadcasting
      const nodes = await storage.getAllNodes();
      const onlineNodes = nodes.filter(node => node.isOnline && node.nodeId !== senderId);
      
      // Create SOS message for each online node
      const sosMessages = await Promise.all(
        onlineNodes.map(node => 
          storage.createMessage({
            senderId,
            receiverId: node.nodeId,
            content: content || `SOS Alert from ${senderId}. Location: ${location.latitude}, ${location.longitude}`,
            messageType: "sos",
            routingPath: [senderId, node.nodeId],
            hops: 1,
          })
        )
      );

      // ── Cisco Webex Integration ─────────────────────────────────
      // Send SOS alert to Webex Space for responder coordination
      const webexAlert = await webexService.sendSOSAlert({
        senderId,
        location,
        content: content || `SOS Alert from ${senderId}`,
      });

      // Create a dedicated incident room for this SOS
      const incidentRoom = await webexService.createIncidentRoom(
        String(sosMessages[0]?.id || Date.now()),
      );

      // ── Cisco Observability ─────────────────────────────────────
      // Log the SOS event for analytics and anomaly detection
      await observabilityService.logEvent(
        "sos_broadcast",
        senderId,
        `SOS broadcast to ${onlineNodes.length} nodes. Location: ${location.latitude}, ${location.longitude}`,
        "critical",
        { location, recipientCount: onlineNodes.length },
      );

      res.json({ 
        message: "SOS broadcast sent", 
        recipientCount: onlineNodes.length,
        messages: sosMessages,
        cisco: {
          webexAlert: {
            delivered: webexAlert.delivered,
            messageId: webexAlert.webexMessageId,
          },
          incidentRoom: {
            id: incidentRoom.id,
            title: incidentRoom.title,
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid SOS payload", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to broadcast SOS" });
    }
  });

  // Network statistics endpoint
  app.get("/api/network/stats", async (req, res) => {
    try {
      const nodes = await storage.getAllNodes();
      const connections = await storage.getAllConnections();
      const messages = await storage.getAllMessages();
      
      const onlineNodes = nodes.filter(node => node.isOnline);
      const activeConnections = connections.filter(conn => conn.isActive);
      const averageLatency = activeConnections.length > 0 
        ? Math.round(activeConnections.reduce((sum, conn) => sum + conn.latency, 0) / activeConnections.length)
        : 0;
      
      // Calculate coverage radius (max distance from user node)
      const userConnections = activeConnections.filter(conn => 
        conn.fromNodeId === "user" || conn.toNodeId === "user"
      );
      const maxDistance = userConnections.length > 0 
        ? Math.max(...userConnections.map(conn => conn.distance))
        : 0;

      res.json({
        connectedNodes: onlineNodes.length,
        totalNodes: nodes.length,
        activeConnections: activeConnections.length,
        averageLatency,
        coverageRadius: maxDistance,
        totalMessages: messages.length,
        unreadMessages: messages.filter(msg => !msg.isDelivered && msg.receiverId === "user").length,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch network statistics" });
    }
  });

  // ══════════════════════════════════════════════════════════════════
  //  CISCO INTEGRATION ROUTES
  // ══════════════════════════════════════════════════════════════════

  // ── Cisco Unified Status ────────────────────────────────────────
  app.get("/api/cisco/status", async (_req, res) => {
    try {
      res.json({
        webex: webexService.getStatus(),
        meraki: merakiService.getStatus(),
        observability: observabilityService.getStatus(),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch Cisco status" });
    }
  });

  // ── Webex Routes ────────────────────────────────────────────────
  app.get("/api/cisco/webex/status", async (_req, res) => {
    res.json(webexService.getStatus());
  });

  app.get("/api/cisco/webex/alerts", async (_req, res) => {
    res.json(webexService.getAlertHistory());
  });

  app.get("/api/cisco/webex/rooms", async (_req, res) => {
    res.json(webexService.getIncidentRooms());
  });

  app.post("/api/cisco/webex/test", async (_req, res) => {
    try {
      const alert = await webexService.sendStatusUpdate(
        "🧪 **Test Alert** — ResQNet Webex integration is working correctly."
      );
      res.json({ success: true, alert });
    } catch (error) {
      res.status(500).json({ message: "Test alert failed" });
    }
  });

  // ── Meraki Routes ───────────────────────────────────────────────
  app.get("/api/cisco/meraki/status", async (_req, res) => {
    res.json(merakiService.getStatus());
  });

  app.get("/api/cisco/meraki/devices", async (_req, res) => {
    try {
      const devices = await merakiService.getDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch Meraki devices" });
    }
  });

  app.get("/api/cisco/meraki/health", async (_req, res) => {
    try {
      const health = await merakiService.getNetworkHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch network health" });
    }
  });

  // ── Observability Routes ────────────────────────────────────────
  app.get("/api/cisco/observability/status", async (_req, res) => {
    res.json(observabilityService.getStatus());
  });

  app.get("/api/cisco/observability/events", async (req, res) => {
    const limit = Number(req.query.limit) || 50;
    res.json(observabilityService.getEvents(limit));
  });

  app.get("/api/cisco/observability/analytics", async (_req, res) => {
    res.json(observabilityService.getAnalytics());
  });

  app.get("/api/cisco/observability/anomalies", async (_req, res) => {
    res.json(observabilityService.getAnomalies());
  });

  app.get("/api/cisco/observability/path-health", async (_req, res) => {
    try {
      const paths = await observabilityService.getPathHealth();
      res.json(paths);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch path health" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
