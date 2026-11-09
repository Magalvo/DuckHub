import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
const ingestionHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim().replace(/\/$/, '');

if ((!projectToken || !ingestionHost) && process.env.NODE_ENV !== 'production') {
  const missingVariable = projectToken ? 'NEXT_PUBLIC_POSTHOG_HOST' : 'NEXT_PUBLIC_POSTHOG_KEY';
  console.warn(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  );
}

export const posthogLoggerProvider =
  projectToken && ingestionHost
    ? new LoggerProvider({
        resource: resourceFromAttributes({ 'service.name': 'duckhub' }),
        processors: [
          new BatchLogRecordProcessor({
            exporter: new OTLPLogExporter({
              url: `${ingestionHost}/i/v1/logs`,
              headers: {
                Authorization: `Bearer ${projectToken}`,
                'Content-Type': 'application/json',
              },
            }),
          }),
        ],
      })
    : undefined;

export function register(): void {
  // The provider is initialized when Next.js loads this module.
}
