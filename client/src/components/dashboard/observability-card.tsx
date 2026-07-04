import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Eye,
  AlertOctagon,
  TrendingUp,
  BarChart3,
  Clock,
  ArrowUpDown,
} from "lucide-react";

interface PathHealth {
  from: string;
  to: string;
  latency: number;
  jitter: number;
  packetLoss: number;
  status: "healthy" | "degraded" | "critical";
}

interface ObservabilityStatus {
  splunkConnected: boolean;
  thousandEyesConnected: boolean;
  mode: "live" | "simulation";
  totalEvents: number;
  anomaliesDetected: number;
  activeAnomalies: number;
}

interface Analytics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  recentActivity: { id: string; type: string; nodeId: string; timestamp: string; severity: string; details: string }[];
}

export function ObservabilityCard() {
  const { data: status } = useQuery<ObservabilityStatus>({
    queryKey: ["/api/cisco/observability/status"],
    refetchInterval: 5000,
  });

  const { data: paths = [] } = useQuery<PathHealth[]>({
    queryKey: ["/api/cisco/observability/path-health"],
    refetchInterval: 10000,
  });

  const { data: analytics } = useQuery<Analytics>({
    queryKey: ["/api/cisco/observability/analytics"],
    refetchInterval: 5000,
  });

  const healthyPaths = paths.filter((p) => p.status === "healthy").length;
  const degradedPaths = paths.filter((p) => p.status === "degraded").length;
  const criticalPaths = paths.filter((p) => p.status === "critical").length;
  const avgLatency =
    paths.length > 0
      ? Math.round(paths.reduce((s, p) => s + p.latency, 0) / paths.length)
      : 0;

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-semibold text-slate-900">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
              <Eye className="h-4 w-4 text-violet-600" />
            </div>
            Observability
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 text-[10px]">
              ThousandEyes
            </Badge>
            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-[10px]">
              Splunk
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-center">
            <BarChart3 className="mx-auto h-3.5 w-3.5 text-violet-500" />
            <div className="mt-0.5 text-lg font-bold text-slate-900">
              {status?.totalEvents || 0}
            </div>
            <div className="text-[10px] text-slate-500">Events</div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-center">
            <AlertOctagon className="mx-auto h-3.5 w-3.5 text-amber-500" />
            <div className={`mt-0.5 text-lg font-bold ${(status?.activeAnomalies || 0) > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {status?.activeAnomalies || 0}
            </div>
            <div className="text-[10px] text-slate-500">Anomalies</div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-center">
            <ArrowUpDown className="mx-auto h-3.5 w-3.5 text-blue-500" />
            <div className="mt-0.5 text-lg font-bold text-slate-900">
              {avgLatency}ms
            </div>
            <div className="text-[10px] text-slate-500">Avg Latency</div>
          </div>
        </div>

        {/* Path Health Summary */}
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <div className="mb-1.5 text-xs font-medium text-slate-600">
            Network Path Health (ThousandEyes)
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-600">{healthyPaths} healthy</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-xs text-slate-600">{degradedPaths} degraded</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-slate-600">{criticalPaths} critical</span>
            </div>
          </div>
        </div>

        {/* Top Path Details */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-500">
            Monitored Paths
          </div>
          <div className="max-h-36 space-y-1 overflow-y-auto">
            {paths.slice(0, 5).map((path) => (
              <div
                key={`${path.from}-${path.to}`}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      path.status === "healthy"
                        ? "bg-emerald-500"
                        : path.status === "degraded"
                          ? "bg-amber-500"
                          : "bg-red-500 animate-pulse"
                    }`}
                  />
                  <span className="text-xs text-slate-700">
                    {path.from} → {path.to}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-slate-500">
                    {Math.round(path.latency)}ms
                  </span>
                  <span className="text-slate-400">
                    {path.packetLoss.toFixed(1)}% loss
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        {analytics && analytics.recentActivity.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-500">
              Recent Events (Splunk)
            </div>
            {analytics.recentActivity.slice(-3).reverse().map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5"
              >
                <div
                  className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    event.severity === "critical"
                      ? "bg-red-500"
                      : event.severity === "warning"
                        ? "bg-amber-500"
                        : "bg-blue-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10px] text-slate-700">
                    {event.details.slice(0, 55)}
                  </div>
                  <div className="text-[9px] text-slate-400">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
