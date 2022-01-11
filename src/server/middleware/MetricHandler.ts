import { Registry, Histogram, Summary } from 'prom-client';
import { HttpHandler } from '../HttpHandler';
import type { HttpHandlerInput } from '../HttpHandler';

const httpRequestDurationHistogram = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: [ 'method', 'route', 'code' ],
  buckets: [ 0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10 ],
});
const httpRequestDurationSummary = new Summary({
  name: 'http_request_duration_summary_seconds',
  help: 'Quantiles of HTTP requests in seconds',
  maxAgeSeconds: 60,
  ageBuckets: 5,
  labelNames: [ 'method', 'route' ],
});
const register = new Registry();
register.registerMetric(httpRequestDurationHistogram);
register.registerMetric(httpRequestDurationSummary);

export class MetricHandler extends HttpHandler {
  private readonly handler: HttpHandler;

  public constructor(handler: HttpHandler) {
    super();
    this.handler = handler;
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    const { request, response } = input;
    if (request.url === '/metrics') {
      response.setHeader('Content-Type', register.contentType);
      const metrics = await register.metrics();
      response.end(metrics);
    } else {
      const endHistogram = httpRequestDurationHistogram.startTimer();
      const endSummary = httpRequestDurationSummary.startTimer();

      await this.handler.handle(input);

      const url = request.url!;
      const arr = url.split('/');
      const path = url.startsWith('http') ? arr[3] : arr[1];
      endHistogram({ route: path, code: response.statusCode, method: request.method });
      endSummary({ route: path, method: request.method });
    }
  }
}
