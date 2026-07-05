import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import * as Sentry from '@sentry/node';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/**
 * Global exception filter — standardizes the shape of every error response
 * and prevents accidental leakage of internal detail (stack traces, raw
 * driver error messages, SQL) to API clients.
 *
 * Why this exists: without a catch-all filter, NestJS's default handler
 * serializes whatever an exception happens to carry. For `HttpException`s
 * (the ones services already throw deliberately — NotFoundException,
 * ForbiddenException, etc.) that's fine and is preserved as-is. For
 * anything else — an unhandled TypeORM `QueryFailedError`, a programming
 * error, a third-party library throwing a plain Error — the default
 * behavior can expose internal messages/stack traces in production. This
 * filter guarantees every response has the same envelope
 * (`statusCode`, `message`, `error`, `path`, `timestamp`) and that
 * unexpected errors are logged server-side but returned to the client as a
 * generic 500 with no internal detail (fail securely).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.resolveErrorDetails(exception);

    const body: ErrorResponseBody = {
      statusCode,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const detail = exception instanceof Error ? (exception.stack ?? exception.message) : JSON.stringify(exception);
      this.logger.error(`Unhandled exception on ${request.method} ${request.url}`, detail);
      // Only genuinely unexpected (5xx) failures are reported — a 404 or a
      // validation 400 is expected application behavior, not an incident,
      // and reporting every one of them to Sentry would drown out the
      // signal a real error-tracking integration is supposed to provide.
      // A no-op when SENTRY_DSN isn't configured (see instrument.ts).
      Sentry.captureException(exception);
    }

    response.status(statusCode).json(body);
  }

  private resolveErrorDetails(exception: unknown): {
    statusCode: number;
    message: string | string[];
    error: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        return { statusCode: status, message: responseBody, error: exception.name };
      }

      const { message, error } = responseBody as { message?: string | string[]; error?: string };
      return {
        statusCode: status,
        message: message ?? exception.message,
        error: error ?? exception.name,
      };
    }

    // TypeORM surfaces database-level failures (constraint violations,
    // connection loss) as QueryFailedError rather than an HttpException.
    // Map the common, safe-to-disclose case (unique violation, code 23505)
    // to 409 Conflict; everything else is an internal error whose raw
    // driver message must not reach the client.
    if (exception instanceof QueryFailedError) {
      const driverError = (exception as QueryFailedError & { code?: string }).code;
      if (driverError === '23505') {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'A record with these values already exists.',
          error: 'Conflict',
        };
      }

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'A database error occurred while processing the request.',
        error: 'Internal Server Error',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred.',
      error: 'Internal Server Error',
    };
  }
}
