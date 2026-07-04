import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Send,
  DoorOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  Zap,
} from "lucide-react";

interface WebexStatus {
  connected: boolean;
  mode: "live" | "simulation";
  botName?: string;
  roomName?: string;
  alertsSent: number;
  incidentRoomsCreated: number;
  lastAlertTime?: string;
}

interface WebexAlert {
  id: string;
  type: string;
  senderId: string;
  content: string;
  timestamp: string;
  delivered: boolean;
}

export function WebexStatusCard() {
  const { data: status } = useQuery<WebexStatus>({
    queryKey: ["/api/cisco/webex/status"],
    refetchInterval: 5000,
  });

  const { data: alerts = [] } = useQuery<WebexAlert[]>({
    queryKey: ["/api/cisco/webex/alerts"],
    refetchInterval: 5000,
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cisco/webex/test", { method: "POST" });
      return res.json();
    },
  });

  const recentAlerts = alerts.slice(-3).reverse();

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-semibold text-slate-900">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
            </div>
            Cisco Webex
          </div>
          <Badge
            className={
              status?.mode === "live"
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                : "bg-amber-100 text-amber-700 hover:bg-amber-100"
            }
          >
            {status?.mode === "live" ? "🟢 Live" : "🟡 Simulated"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Bot & Room Info */}
        <div className="rounded-lg bg-indigo-50 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-800">
              {status?.botName || "ResQNet Bot"}
            </span>
            <span className="text-xs text-indigo-600">
              → {status?.roomName || "resQ Alerts"}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-center">
            <div className="flex items-center justify-center gap-1">
              <Send className="h-3 w-3 text-slate-400" />
            </div>
            <div className="mt-0.5 text-lg font-bold text-slate-900">
              {status?.alertsSent || 0}
            </div>
            <div className="text-[10px] text-slate-500">Alerts Sent</div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-center">
            <div className="flex items-center justify-center gap-1">
              <DoorOpen className="h-3 w-3 text-slate-400" />
            </div>
            <div className="mt-0.5 text-lg font-bold text-slate-900">
              {status?.incidentRoomsCreated || 0}
            </div>
            <div className="text-[10px] text-slate-500">Inc. Rooms</div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-center">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-slate-400" />
            </div>
            <div className="mt-0.5 text-lg font-bold text-emerald-600">
              {alerts.filter((a) => a.delivered).length}
            </div>
            <div className="text-[10px] text-slate-500">Delivered</div>
          </div>
        </div>

        {/* Recent Alerts */}
        {recentAlerts.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-500">Recent Alerts</div>
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2"
              >
                <div
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    alert.type === "sos"
                      ? "bg-red-500"
                      : alert.type === "network"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-slate-800">
                    {alert.content.slice(0, 60)}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(alert.timestamp).toLocaleTimeString()}
                    {alert.delivered && (
                      <CheckCircle2 className="ml-1 h-2.5 w-2.5 text-emerald-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Test Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => testMutation.mutate()}
          disabled={testMutation.isPending}
        >
          <Zap className="mr-1.5 h-3 w-3" />
          {testMutation.isPending ? "Sending..." : "Send Test Alert to Webex"}
        </Button>
      </CardContent>
    </Card>
  );
}
