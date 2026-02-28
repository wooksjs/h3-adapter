import { createHttpContext, HttpError, TWooksHttpOptions, WooksHttp } from '@wooksjs/event-http'
import { current } from '@wooksjs/event-core'
import type { H3, H3Event, Middleware } from 'h3'
import type { IncomingMessage, ServerResponse } from 'http'
import type { TWooksHandler } from 'wooks'

export interface TWooksH3Options extends TWooksHttpOptions {
    /**
     * When true, respond with 404 for unmatched Wooks routes
     * instead of passing to the next H3 handler.
     * @default false
     */
    raise404?: boolean
}

/**
 * Neutralize the ServerResponse so that subsequent writes (from h3/srvx)
 * become harmless no-ops. This prevents "write after end" errors when
 * Wooks has already sent the response.
 */
function neutralizeRes(res: ServerResponse): void {
    res.write = (() => true) as typeof res.write
    res.writeHead = (() => res) as typeof res.writeHead
    res.end = (() => res) as typeof res.end
}

/**
 * H3 adapter for Wooks.
 *
 * Uses Wooks routing and composables on top of an H3 application.
 * Registers itself as H3 middleware — requests matching Wooks routes
 * are handled by Wooks; unmatched requests fall through to H3.
 *
 * @example
 * ```ts
 * import { H3 } from 'h3'
 * import { WooksH3 } from '@wooksjs/h3-adapter'
 * import { useRouteParams } from '@wooksjs/event-http'
 *
 * const app = new H3()
 * const wooks = new WooksH3(app)
 *
 * wooks.get('/hello/:name', () => {
 *     const { get } = useRouteParams()
 *     return { hello: get('name') }
 * })
 * ```
 */
export class WooksH3 extends WooksHttp {
    protected h3App: H3
    protected h3Opts: TWooksH3Options

    constructor(h3App: H3, opts?: TWooksH3Options) {
        super(opts)
        this.h3App = h3App
        this.h3Opts = opts ?? {}
        this.h3App.use(this.getH3Middleware())
    }

    /**
     * Returns H3 middleware that routes requests through Wooks.
     * Matched routes are handled by Wooks; unmatched requests call `next()`.
     */
    getH3Middleware(): Middleware {
        const ctxOptions = this.eventContextOptions
        const requestLimits = this.h3Opts.requestLimits
        const defaultHeaders = this.h3Opts.defaultHeaders
        const notFoundHandler = this.h3Opts.onNotFound
        const raise404 = this.h3Opts.raise404

        return (event: H3Event, next: () => unknown) => {
            const nodeCtx = event.node
            if (!nodeCtx) {
                return next()
            }

            const req: IncomingMessage = nodeCtx.req
            const res: ServerResponse = nodeCtx.res
            const response = new this.ResponseClass(res, req, ctxOptions.logger, defaultHeaders)
            const method = req.method || ''
            const url = req.url || ''

            return createHttpContext(ctxOptions, { req, response, requestLimits }, () => {
                const ctx = current()
                const handlers = this.wooks.lookupHandlers(method, url, ctx)

                if (handlers || notFoundHandler) {
                    const result = this.processHandlers(
                        handlers || [notFoundHandler as TWooksHandler],
                        ctx,
                        response,
                    )

                    if (
                        result !== null &&
                        result !== undefined &&
                        typeof (result as Promise<unknown>).then === 'function'
                    ) {
                        return (result as Promise<unknown>)
                            .then(() => {
                                neutralizeRes(res)
                                return ''
                            })
                            .catch((error: unknown) => {
                                this.logger.error('Internal error, please report', error as Error)
                                this.respond(error, response, ctx)
                                neutralizeRes(res)
                                return ''
                            })
                    }

                    neutralizeRes(res)
                    return ''
                }

                if (raise404) {
                    const error = new HttpError(404)
                    const respondResult = this.respond(error, response, ctx)
                    if (
                        respondResult &&
                        typeof (respondResult as Promise<void>).then === 'function'
                    ) {
                        return (respondResult as Promise<void>).then(() => {
                            neutralizeRes(res)
                            return ''
                        })
                    }
                    neutralizeRes(res)
                    return ''
                }

                return next()
            })
        }
    }
}
