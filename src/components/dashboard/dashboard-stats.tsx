"use client";

import { useMemo } from "react";
import { AlertTriangle, ClipboardList, Clock3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useExcepciones } from "@/context/excepciones-context";
import { ESTADOS_EXCEPCION, TIPOS_EXCEPCION } from "@/types/excepcion";

const estadoChartConfig = {
  Pendiente: { label: "Pendiente", color: "var(--chart-3)" },
  Aprobada: { label: "Aprobada", color: "var(--chart-2)" },
  Rechazada: { label: "Rechazada", color: "var(--chart-4)" },
  Cancelada: { label: "Cancelada", color: "var(--chart-5)" },
  Caducada: { label: "Caducada", color: "var(--chart-1)" },
} satisfies ChartConfig;

const tipoChartConfig = {
  total: { label: "Excepciones", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function DashboardStats() {
  const { excepciones, stats, loading } = useExcepciones();

  const estadoData = useMemo(() => {
    return ESTADOS_EXCEPCION.map((estado) => ({
      estado,
      total: excepciones.filter((e) => e.estado === estado).length,
      fill: `var(--color-${estado})`,
    })).filter((d) => d.total > 0);
  }, [excepciones]);

  const tipoData = useMemo(() => {
    return TIPOS_EXCEPCION.map((tipo) => ({
      tipo,
      total: excepciones.filter((e) => e.tipo_excepcion === tipo).length,
    }));
  }, [excepciones]);

  const totalEstados = estadoData.reduce((acc, d) => acc + d.total, 0);

  const kpi = [
    {
      title: "Total activas",
      value: stats.totalActivas,
      description: "Pendientes + Aprobadas",
      icon: ClipboardList,
      accent: "text-primary bg-primary/10",
    },
    {
      title: "Pendientes",
      value: stats.pendientes,
      description: "Requieren decisión OTS",
      icon: Clock3,
      accent: "text-amber-700 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/15",
    },
    {
      title: "Revisión ≤ 14 días",
      value: stats.proximasRevision,
      description: "Atención prioritaria",
      icon: AlertTriangle,
      accent: "text-orange-700 bg-orange-500/10 dark:text-orange-400 dark:bg-orange-500/15",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpi.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="shadow-none">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardDescription className="text-xs font-medium uppercase tracking-wide">
                    {item.title}
                  </CardDescription>
                  <CardTitle className="mt-2 font-sans text-3xl font-semibold tabular-nums tracking-tight">
                    {loading ? "—" : item.value}
                  </CardTitle>
                </div>
                <div
                  className={`flex size-10 items-center justify-center rounded-xl ${item.accent}`}
                >
                  <Icon className="size-5" aria-hidden />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Distribución por estado</CardTitle>
            <CardDescription>
              Volumen actual de excepciones según su estado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading || totalEstados === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Sin datos para el gráfico.
              </p>
            ) : (
              <ChartContainer
                config={estadoChartConfig}
                className="mx-auto aspect-square max-h-[280px]"
              >
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="estado" hideLabel />}
                  />
                  <Pie
                    data={estadoData}
                    dataKey="total"
                    nameKey="estado"
                    innerRadius={58}
                    outerRadius={90}
                    strokeWidth={2}
                  >
                    {estadoData.map((entry) => (
                      <Cell key={entry.estado} fill={entry.fill} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (
                          viewBox &&
                          "cx" in viewBox &&
                          "cy" in viewBox
                        ) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-2xl font-semibold"
                              >
                                {totalEstados}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy ?? 0) + 18}
                                className="fill-muted-foreground text-xs"
                              >
                                total
                              </tspan>
                            </text>
                          );
                        }
                        return null;
                      }}
                    />
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="estado" />}
                    className="-translate-y-1 flex-wrap gap-2"
                  />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Volumen por tipo</CardTitle>
            <CardDescription>
              Firewall, EDR, USB, Uso IA y Proxy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Cargando…
              </p>
            ) : (
              <ChartContainer
                config={tipoChartConfig}
                className="aspect-auto h-[280px] w-full"
              >
                <BarChart
                  data={tipoData}
                  margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="tipo"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval={0}
                    tickFormatter={(v: string) =>
                      v.replace("Regla ", "").replace("Uso ", "")
                    }
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar
                    dataKey="total"
                    fill="var(--color-total)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
