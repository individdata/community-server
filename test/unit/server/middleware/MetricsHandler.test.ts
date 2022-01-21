import { createResponse } from 'node-mocks-http';
import type { HttpHandler } from '../../../../src/server/HttpHandler';
import { MetricHandler } from '../../../../src/server/middleware/MetricHandler';

describe('a MetricHandler', (): void => {
  const source: jest.Mocked<HttpHandler> = {
    canHandle: jest.fn(),
    handle: jest.fn(),
  } as any;
  const metricHandlersArgs = {
    wrappedHandler: source,
    histogram: {
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: [ 'method', 'route', 'code' ],
    },
    summary: {
      name: 'http_request_duration_summary_seconds',
      help: 'Quantiles of HTTP requests in seconds',
      labelNames: [ 'method', 'route' ],
      maxAgeSeconds: 60,
      ageBuckets: 5,
    },
  };
  const handler = new MetricHandler(metricHandlersArgs);

  it('get request metrics endpoint and test response content.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/metrics' };
    const response = createResponse();
    await handler.handle({ request, response } as any);
    const body = response._getData();
    expect(response.statusCode).toBe(200);
    expect((handler as any).metricEndpoint).toBe('/metrics');
    expect(body).not.toContain('http_request_duration_seconds_count');
    expect(body).not.toContain('http_request_duration_summary_seconds_count');
  });

  it('get request / endpoint and test response content.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/' };
    const response = createResponse();
    await handler.handle({ request, response } as any);
    expect((handler as any).metricEndpoint).toBe('/metrics');
    expect(response.statusCode).toBe(200);
    expect(response._getData()).toBe('');
  });

  it('check metrics endpoint response content.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/metrics' };
    const response = createResponse();
    await handler.handle({ request, response } as any);
    const body = response._getData();
    expect(response.statusCode).toBe(200);
    expect((handler as any).metricEndpoint).toBe('/metrics');
    expect(body).toContain('http_request_duration_seconds_count{route="",code="200",method="GET"} 1');
    expect(body).toContain('http_request_duration_summary_seconds_count{route="",method="GET"} 1');
  });

  it('post request / endpoint and test response content.', async(): Promise<void> => {
    const request = { method: 'POST', url: '/' };
    const response = createResponse();
    await handler.handle({ request, response } as any);
    expect((handler as any).metricEndpoint).toBe('/metrics');
    expect(response.statusCode).toBe(200);
    expect(response._getData()).toBe('');
  });

  it('second time check metrics endpoint response content.', async(): Promise<void> => {
    const request = { method: 'GET', url: '/metrics' };
    const response = createResponse();
    await handler.handle({ request, response } as any);
    const body = response._getData();
    expect(response.statusCode).toBe(200);
    expect((handler as any).metricEndpoint).toBe('/metrics');
    expect(body).toContain('http_request_duration_seconds_count{route="",code="200",method="GET"} 1');
    expect(body).toContain('http_request_duration_summary_seconds_count{route="",method="GET"} 1');
    expect(body).toContain('http_request_duration_seconds_count{route="",code="200",method="POST"} 1');
    expect(body).toContain('http_request_duration_summary_seconds_count{route="",method="POST"} 1');
  });

  it('test path variable.', async(): Promise<void> => {
    const request = { method: 'GET', url: 'http://local/test' };
    const response = createResponse();
    await handler.handle({ request, response } as any);
    expect(response.statusCode).toBe(200);
  });

  it('test metricEndpoint value.', async(): Promise<void> => {
    const metricHandlersArgsNew = {
      metricEndpoint: '/testing',
      wrappedHandler: source,
      histogram: {
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: [ 'method', 'route', 'code' ],
      },
      summary: {
        name: 'http_request_duration_summary_seconds',
        help: 'Quantiles of HTTP requests in seconds',
        labelNames: [ 'method', 'route' ],
        maxAgeSeconds: 60,
        ageBuckets: 5,
      },
    };
    const handlerNew = new MetricHandler(metricHandlersArgsNew);
    expect((handlerNew as any).metricEndpoint).toBe('/testing');
  });
});
