import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  Server,
  Signal,
  Router,
} from "lucide-react";

interface MerakiDevice {
  serial: string;
  name: string;
  model: string;
  status: "online" | "offline" | "alerting" | "dormant";
  lanIp: string;
  tags: string[];
  resqnetNodeId?: string;
}

interface MerakiHealth {
  networkName: string;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  alertingDevices: number;
  overallScore: number;
}

interface MerakiStatus {
  connected: boolean;
  mode: "live" | "simulation";
  organizationName?: string;
  networkName?: string;
  totalDevices: number;
  onlineDevices: number;
}

export function CiscoInfrastructureCard() {
  const { data: status } = useQuery<MerakiStatus>({
    queryKey: ["/api/cisco/meraki/status"],
    refetchInterval: 10000,
  });

  const { data: devices = [] } = useQuery<MerakiDevice[]>({
    queryKey: ["/api/cisco/meraki/devices"],
    refetchInterval: 15000,
  });

  const { data: health } = useQuery<MerakiHealth>({
    queryKey: ["/api/cisco/meraki/health"],
    refetchInterval: 10000,
  });

  const onlineCount = devices.filter((d) => d.status === "online").length;
  const offlineCount = devices.filter((d) => d.status === "offline").length;
  const alertingCount = devices.filter((d) => d.status === "alerting").length;

  const healthScore = health?.overallScore ?? 0;
  const healthColor =
    healthScore >= 80
      ? "text-emerald-600"
      : healthScore >= 50
        ? "text-amber-600"
        : "text-red-600";

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-semibold text-slate-900">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
              <Router className="h-4 w-4 text-teal-600" />
            </div>
            Cisco Meraki
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
        {/* Org Info */}
        <div className="rounded-lg bg-teal-50 px-3 py-2">
          <div className="text-xs font-medium text-teal-800">
            {status?.organizationName || "Cisco DevNet Sandbox"}
          </div>
          <div className="text-[10px] text-teal-600">
            {status?.networkName || "ResQNet Field Network"}
          </div>
        </div>

        {/* Health Score */}
        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
          <span className="text-xs font-medium text-slate-600">
            Network Health
          </span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  healthScore >= 80
                    ? "bg-emerald-500"
                    : healthScore >= 50
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
            <span className={`text-sm font-bold ${healthColor}`}>
              {healthScore}%
            </span>
          </div>
        </div>

        {/* Device Counts */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-center">
            <Wifi className="mx-auto h-3.5 w-3.5 text-emerald-600" />
            <div className="mt-0.5 text-lg font-bold text-emerald-700">
              {onlineCount}
            </div>
            <div className="text-[10px] text-emerald-600">Online</div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-center">
            <WifiOff className="mx-auto h-3.5 w-3.5 text-slate-400" />
            <div className="mt-0.5 text-lg font-bold text-slate-600">
              {offlineCount}
            </div>
            <div className="text-[10px] text-slate-500">Offline</div>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-2 text-center">
            <AlertTriangle className="mx-auto h-3.5 w-3.5 text-amber-500" />
            <div className="mt-0.5 text-lg font-bold text-amber-600">
              {alertingCount}
            </div>
            <div className="text-[10px] text-amber-600">Alerting</div>
          </div>
        </div>

        {/* Device List */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-500">
            Access Points ({devices.length})
          </div>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {devices.slice(0, 6).map((device) => (
              <div
                key={device.serial}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      device.status === "online"
                        ? "bg-emerald-500"
                        : device.status === "alerting"
                          ? "bg-amber-500 animate-pulse"
                          : "bg-slate-300"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-medium text-slate-800">
                      {device.name.split("—")[0].trim()}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {device.model} · {device.lanIp}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {device.tags?.slice(0, 1).map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {devices.length > 6 && (
            <div className="text-center text-[10px] text-slate-400">
              +{devices.length - 6} more devices
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
