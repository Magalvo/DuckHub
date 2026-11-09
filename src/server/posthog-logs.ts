import { posthogLoggerProvider } from '../../instrumentation';

// Do not attach the exporter to global or existing application loggers. This
// logger exports only the purpose-written operational lines in this module.
const logger = posthogLoggerProvider?.getLogger('duckhub-posthog-logs');

export function logPosthogInfo(message: string, attributes: Record<string, string>): void {
  logger?.emit({
    body: message,
    severityText: 'INFO',
    attributes,
  });
}
