import type {
  RequestTrace,
  Span,
  SpanEvent,
  SpanAttributes,
  NormalizedRequest,
  NormalizedResponse,
  TraceExport,
} from './types';

let traceCounter = 0;

function randomHex(bytes: number): string {
  const arr = new Array<number>(bytes);
  for (let i = 0; i < bytes; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateTraceId(): string {
  return randomHex(16);
}

export function generateSpanId(): string {
  return randomHex(8);
}

export function createTrace(request: NormalizedRequest, options?: { traceId?: string; tags?: string[]; tenant?: string; application?: string }): RequestTrace {
  const traceId = options?.traceId || generateTraceId();
  const requestId = `req_${Date.now()}_${++traceCounter}`;

  const trace: RequestTrace = {
    traceId,
    requestId,
    startTime: Date.now(),
    request,
    spans: [],
    attributes: {
      http_method: 'POST',
      http_route: '/v1/chat/completions',
      user_agent: request.metadata?.user_agent as string | undefined,
    },
    tags: options?.tags || [],
    tenant: options?.tenant,
    application: options?.application,
    status: 'started',
  };

  return trace;
}

export function addSpan(trace: RequestTrace, span: Span): void {
  trace.spans.push(span);
}

export function startSpan(trace: RequestTrace, name: string, parentSpanId?: string, attributes: SpanAttributes = {}): Span {
  const span: Span = {
    spanId: generateSpanId(),
    traceId: trace.traceId,
    parentSpanId,
    name,
    startTime: Date.now(),
    endTime: 0,
    attributes,
    events: [],
    status: 'ok',
  };
  addSpan(trace, span);
  return span;
}

export function endSpan(span: Span, status: 'ok' | 'error' = 'ok', errorMessage?: string): void {
  span.endTime = Date.now();
  span.status = status;
  if (errorMessage) span.errorMessage = errorMessage;
}

export function addSpanEvent(span: Span, event: SpanEvent): void {
  span.events.push(event);
}

export function finalizeTrace(trace: RequestTrace, response?: NormalizedResponse, error?: string): RequestTrace {
  trace.endTime = Date.now();
  if (response) trace.response = response;
  if (error) {
    trace.error = error;
    trace.status = 'failed';
  } else {
    trace.status = 'completed';
  }

  if (response?.provider) trace.provider = response.provider;
  if (response?.model) trace.model = response.model;

  return trace;
}

export function exportTrace(trace: RequestTrace, format: 'json' | 'otlp' = 'json'): string {
  if (format === 'json') {
    return JSON.stringify(trace, null, 2);
  }

  const resourceSpans = {
    resourceSpans: [
      {
        resource: { attributes: [{ key: 'service.name', value: { stringValue: 'bifrost' } }] },
        scopeSpans: [
          {
            scope: { name: 'bifrost' },
            spans: trace.spans.map(s => ({
              traceId: s.traceId,
              spanId: s.spanId,
              parentSpanId: s.parentSpanId || null,
              name: s.name,
              startTimeUnixNano: String(s.startTime * 1_000_000),
              endTimeUnixNano: String(s.endTime * 1_000_000),
              attributes: Object.entries(s.attributes).map(([key, value]) => ({
                key,
                value: { stringValue: String(value) },
              })),
              events: s.events.map(e => ({
                timeUnixNano: String(e.timestamp * 1_000_000),
                name: e.name,
                attributes: e.attributes
                  ? Object.entries(e.attributes).map(([key, value]) => ({
                      key,
                      value: { stringValue: String(value) },
                    }))
                  : [],
              })),
              status: { code: s.status === 'ok' ? 0 : 1, message: s.errorMessage || '' },
            })),
          },
        ],
      },
    ],
  };

  return JSON.stringify(resourceSpans);
}

export function exportTraces(traces: RequestTrace[], format: 'json' | 'otlp' = 'json'): TraceExport {
  return {
    format,
    traces,
  };
}
