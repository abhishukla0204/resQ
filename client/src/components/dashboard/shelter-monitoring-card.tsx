import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Thermometer,
  Droplets,
  Wind,
  Users,
  Building2,
} from "lucide-react";
import { useState, useEffect } from "react";

interface ShelterData {
  id: string;
  name: string;
  nodeId: string;
  temperature: number;
  humidity: number;
  airQuality: "good" | "moderate" | "poor";
  occupancy: number;
  capacity: number;
  waterLevel: "adequate" | "low" | "critical";
}

/** Simulated shelter sensor data mapped to Cisco Spaces + Meraki MT sensor format. */
function useSimulatedShelterData(): ShelterData[] {
  const [shelters, setShelters] = useState<ShelterData[]>([
    {
      id: "shelter-1",
      name: "Kengeri Relief Camp",
      nodeId: "kengeri",
      temperature: 28.4,
      humidity: 65,
      airQuality: "good",
      occupancy: 142,
      capacity: 200,
      waterLevel: "adequate",
    },
    {
      id: "shelter-2",
      name: "RV College Shelter",
      nodeId: "rv-gate",
      temperature: 27.1,
      humidity: 58,
      airQuality: "good",
      occupancy: 89,
      capacity: 150,
      waterLevel: "adequate",
    },
    {
      id: "shelter-3",
      name: "Banashankari Community Hall",
      nodeId: "banashankari",
      temperature: 30.2,
      humidity: 72,
      airQuality: "moderate",
      occupancy: 210,
      capacity: 250,
      waterLevel: "low",
    },
    {
      id: "shelter-4",
      name: "Magadi Road Hospital",
      nodeId: "magadi-road",
      temperature: 26.5,
      humidity: 55,
      airQuality: "good",
      occupancy: 78,
      capacity: 120,
      waterLevel: "adequate",
    },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setShelters((prev) =>
        prev.map((s) => ({
          ...s,
          temperature: Math.round((s.temperature + (Math.random() - 0.5) * 1.5) * 10) / 10,
          humidity: Math.max(30, Math.min(90, Math.round(s.humidity + (Math.random() - 0.5) * 5))),
          occupancy: Math.max(0, Math.min(s.capacity, Math.round(s.occupancy + (Math.random() - 0.5) * 8))),
        })),
      );
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return shelters;
}

export function ShelterMonitoringCard() {
  const shelters = useSimulatedShelterData();

  const totalOccupancy = shelters.reduce((s, sh) => s + sh.occupancy, 0);
  const totalCapacity = shelters.reduce((s, sh) => s + sh.capacity, 0);
  const avgTemp = Math.round((shelters.reduce((s, sh) => s + sh.temperature, 0) / shelters.length) * 10) / 10;

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-semibold text-slate-900">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50">
              <Building2 className="h-4 w-4 text-cyan-600" />
            </div>
            Shelter Monitoring
          </div>
          <Badge className="bg-cyan-100 text-cyan-700 hover:bg-cyan-100 text-[10px]">
            Cisco Spaces + MT Sensors
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-2 text-center">
            <Users className="mx-auto h-3.5 w-3.5 text-cyan-600" />
            <div className="mt-0.5 text-lg font-bold text-cyan-800">
              {totalOccupancy}
            </div>
            <div className="text-[10px] text-cyan-600">
              / {totalCapacity} cap.
            </div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-center">
            <Thermometer className="mx-auto h-3.5 w-3.5 text-orange-500" />
            <div className="mt-0.5 text-lg font-bold text-slate-900">
              {avgTemp}°C
            </div>
            <div className="text-[10px] text-slate-500">Avg Temp</div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-center">
            <Building2 className="mx-auto h-3.5 w-3.5 text-violet-500" />
            <div className="mt-0.5 text-lg font-bold text-slate-900">
              {shelters.length}
            </div>
            <div className="text-[10px] text-slate-500">Active Sites</div>
          </div>
        </div>

        {/* Shelter List */}
        <div className="space-y-1.5">
          {shelters.map((shelter) => {
            const occupancyPct = Math.round(
              (shelter.occupancy / shelter.capacity) * 100,
            );
            const occupancyColor =
              occupancyPct >= 90
                ? "bg-red-500"
                : occupancyPct >= 70
                  ? "bg-amber-500"
                  : "bg-emerald-500";

            return (
              <div
                key={shelter.id}
                className="rounded-lg border border-slate-100 bg-slate-50 p-2.5"
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-800">
                    {shelter.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] ${
                      shelter.waterLevel === "critical"
                        ? "border-red-200 text-red-600"
                        : shelter.waterLevel === "low"
                          ? "border-amber-200 text-amber-600"
                          : "border-emerald-200 text-emerald-600"
                    }`}
                  >
                    <Droplets className="mr-0.5 h-2.5 w-2.5" />
                    {shelter.waterLevel}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-0.5">
                    <Thermometer className="h-2.5 w-2.5" />
                    {shelter.temperature}°C
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Droplets className="h-2.5 w-2.5" />
                    {shelter.humidity}%
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Wind className="h-2.5 w-2.5" />
                    {shelter.airQuality}
                  </span>
                  <span className="ml-auto flex items-center gap-0.5">
                    <Users className="h-2.5 w-2.5" />
                    {shelter.occupancy}/{shelter.capacity}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${occupancyColor}`}
                    style={{ width: `${occupancyPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
