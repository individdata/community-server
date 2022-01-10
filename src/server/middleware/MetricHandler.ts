import { Registry, Histogram } from 'prom-client';
import { HttpHandler } from '../HttpHandler';
import type { HttpHandlerInput } from '../HttpHandler';

const httpRequestDurationMilliseconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in microseconds',
  labelNames: [ 'method', 'route', 'code' ],
  buckets: [ 0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10 ],
});
const register = new Registry();
register.registerMetric(httpRequestDurationMilliseconds);

export class MetricHandler extends HttpHandler {
  public constructor() {
    super();
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    response.setHeader('Content-Type', register.contentType);
    const end = httpRequestDurationMilliseconds.startTimer();
    if (request.url === '/metrics') {
      const metrics = await register.metrics();
      response.end(metrics);
    }
    end({ route: '/metrics', code: request.statusCode, method: request.method });
  }
}
