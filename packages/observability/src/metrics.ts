export type ApiRequestMetric = Readonly<{
  name: "api.request";
  correlationId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
}>;

export type MetricsSink = (metric: ApiRequestMetric) => void;

export function createInMemoryMetricsSink(): {
  metrics: ApiRequestMetric[];
  sink: MetricsSink;
} {
  const metrics: ApiRequestMetric[] = [];
  return { metrics, sink: (metric) => metrics.push(metric) };
}
