import { Registry, Histogram, Summary } from 'prom-client';
import { HttpHandler } from '../HttpHandler';
import type { HttpHandlerInput } from '../HttpHandler';

export interface MetricHandlerArgs {
  metricEndpoint?: string;
  wrappedHandler: HttpHandler;
  histogram: {
    name: string;
    help: string;
    labelNames: string[];
  };
  summary: {
    name: string;
    help: string;
    labelNames: string[];
    maxAgeSeconds: number;
    ageBuckets: number;
  };
}

export class MetricHandler extends HttpHandler {
  private readonly wrappedHandler: HttpHandler;
  private readonly metricEndpoint: string;
  private readonly histogram: Histogram<any>;
  private readonly summary: Summary<any>;
  private readonly registry: Registry;

  public constructor(args: MetricHandlerArgs) {
    super();
    this.wrappedHandler = args.wrappedHandler;
    this.metricEndpoint = args.metricEndpoint ?? '/metrics';
    this.histogram = new Histogram(args.histogram);
    this.summary = new Summary(args.summary);
    this.registry = new Registry();
    this.registry.registerMetric(this.histogram);
    this.registry.registerMetric(this.summary);
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    const { request, response } = input;
    if (request.url === this.metricEndpoint) {
      response.setHeader('Content-Type', this.registry.contentType);
      const metrics = await this.registry.metrics();
      response.end(metrics);
    } else {
      const endHistogram = this.histogram.startTimer();
      const endSummary = this.summary.startTimer();

      await this.wrappedHandler.handle(input);

      const url = request.url!;
      const arr = url.split('/');
      const path = url.startsWith('http') ? arr[3] : arr[1];
      endHistogram({ route: path, code: response.statusCode, method: request.method });
      endSummary({ route: path, method: request.method });
    }
  }
}
