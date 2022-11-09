import { createWooksCtx, createWooksResponder } from '@wooksjs/composables'
import { EventHandler, H3Event } from 'h3'
    
const { respond } = createWooksResponder()

export function eventHandler <T = any> (fn: () => unknown): EventHandler<T> {
    const wooksHandler = async (event: H3Event) => {
        const { req, res, context } = event
        const { restoreCtx, clearCtx } = createWooksCtx({ req, res, params: context.params as Record<string, string> || {} })
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
