import { createHttpContext, createWooksResponder } from '@wooksjs/event-http'
import { EventHandler, H3Event } from 'h3'
    
const { respond } = createWooksResponder()

export function eventHandler <T = any> (fn: () => unknown): EventHandler<T> {
    const wooksHandler = async (event: H3Event) => {
        const { req, res, context } = event
        const { restoreCtx, clearCtx, store } = createHttpContext({ req, res })
        store('routeParams').value = context.params as Record<string, string> || {}
        try {
            const result = await fn()
            restoreCtx()
            await respond(result)
        } catch (e) {
            restoreCtx()
            await respond(e)
        }
        clearCtx()
    }
    wooksHandler.__is_handler__ = true
    return wooksHandler as unknown as EventHandler<T>
}
