import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { H3, toNodeHandler } from 'h3/node'
import { WooksH3 } from './wooks-h3'
import { useRequest, useRouteParams, HttpError, useResponse, useHeaders } from '@wooksjs/event-http'
import { createServer, Server } from 'http'

function getPort(): number {
    return 10000 + Math.floor(Math.random() * 50000)
}

describe('WooksH3', () => {
    describe('basic routing', () => {
        let app: H3
        let wooks: WooksH3
        let server: Server
        let port: number

        beforeAll(async () => {
            port = getPort()
            app = new H3()
            wooks = new WooksH3(app)

            wooks.get('/hello', () => {
                return 'Hello World'
            })

            wooks.get('/json', () => {
                return { message: 'ok' }
            })

            wooks.post('/echo', async () => {
                const { rawBody } = useRequest()
                const body = await rawBody()
                return body.toString()
            })

            wooks.get('/users/:id', () => {
                const { get } = useRouteParams()
                return { id: get('id') }
            })

            wooks.get('/error', () => {
                throw new HttpError(400, 'bad request')
            })

            wooks.get('/server-error', () => {
                throw new HttpError(500, 'internal server error')
            })

            const handler = toNodeHandler(app)
            await new Promise<void>((resolve) => {
                server = createServer(handler).listen(port, resolve)
            })
        })

        afterAll(async () => {
            await new Promise<void>((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()))
            })
        })

        it('should handle GET request and return text', async () => {
            const res = await fetch(`http://localhost:${port}/hello`)
            expect(res.status).toBe(200)
            const text = await res.text()
            expect(text).toBe('Hello World')
        })

        it('should handle GET request and return JSON', async () => {
            const res = await fetch(`http://localhost:${port}/json`)
            expect(res.status).toBe(200)
            const data = await res.json()
            expect(data).toEqual({ message: 'ok' })
        })

        it('should handle route parameters', async () => {
            const res = await fetch(`http://localhost:${port}/users/42`)
            expect(res.status).toBe(200)
            const data = await res.json()
            expect(data).toEqual({ id: '42' })
        })

        it('should handle POST requests', async () => {
            const res = await fetch(`http://localhost:${port}/echo`, {
                method: 'POST',
                body: 'hello body',
                headers: { 'Content-Type': 'text/plain' },
            })
            expect(res.status).toBe(201)
            const text = await res.text()
            expect(text).toBe('hello body')
        })

        it('should handle HttpError', async () => {
            const res = await fetch(`http://localhost:${port}/error`)
            expect(res.status).toBe(400)
        })

        it('should handle 500 errors', async () => {
            const res = await fetch(`http://localhost:${port}/server-error`)
            expect(res.status).toBe(500)
        })
    })

    describe('h3 fallthrough', () => {
        let app: H3
        let wooks: WooksH3
        let server: Server
        let port: number

        beforeAll(async () => {
            port = getPort()
            app = new H3()
            wooks = new WooksH3(app)

            wooks.get('/wooks-route', () => {
                return 'from wooks'
            })

            // H3 route registered after wooks
            app.on('GET', '/h3-route', () => {
                return 'from h3'
            })

            const handler = toNodeHandler(app)
            await new Promise<void>((resolve) => {
                server = createServer(handler).listen(port, resolve)
            })
        })

        afterAll(async () => {
            await new Promise<void>((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()))
            })
        })

        it('should handle wooks routes', async () => {
            const res = await fetch(`http://localhost:${port}/wooks-route`)
            expect(res.status).toBe(200)
            const text = await res.text()
            expect(text).toBe('from wooks')
        })

        it('should fall through to h3 for unmatched wooks routes', async () => {
            const res = await fetch(`http://localhost:${port}/h3-route`)
            expect(res.status).toBe(200)
            const text = await res.text()
            expect(text).toBe('from h3')
        })

        it('should return 404 for completely unknown routes', async () => {
            const res = await fetch(`http://localhost:${port}/unknown`)
            expect(res.status).toBe(404)
        })
    })

    describe('raise404 option', () => {
        let app: H3
        let wooks: WooksH3
        let server: Server
        let port: number

        beforeAll(async () => {
            port = getPort()
            app = new H3()
            wooks = new WooksH3(app, { raise404: true })

            wooks.get('/known', () => 'found')

            const handler = toNodeHandler(app)
            await new Promise<void>((resolve) => {
                server = createServer(handler).listen(port, resolve)
            })
        })

        afterAll(async () => {
            await new Promise<void>((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()))
            })
        })

        it('should return 404 from wooks when raise404 is true', async () => {
            const res = await fetch(`http://localhost:${port}/not-found`)
            expect(res.status).toBe(404)
        })

        it('should still handle known routes', async () => {
            const res = await fetch(`http://localhost:${port}/known`)
            expect(res.status).toBe(200)
            const text = await res.text()
            expect(text).toBe('found')
        })
    })

    describe('composables', () => {
        let app: H3
        let wooks: WooksH3
        let server: Server
        let port: number

        beforeAll(async () => {
            port = getPort()
            app = new H3()
            wooks = new WooksH3(app)

            wooks.get('/request-info', () => {
                const { method, url } = useRequest()
                return { method, url }
            })

            wooks.get('/headers', () => {
                const headers = useHeaders()
                return { host: headers.host, custom: headers['x-custom'] }
            })

            wooks.get('/response-header', () => {
                const response = useResponse()
                response.setHeader('x-custom-response', 'test-value')
                return 'ok'
            })

            const handler = toNodeHandler(app)
            await new Promise<void>((resolve) => {
                server = createServer(handler).listen(port, resolve)
            })
        })

        afterAll(async () => {
            await new Promise<void>((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()))
            })
        })

        it('should provide request info via useRequest', async () => {
            const res = await fetch(`http://localhost:${port}/request-info`)
            const data = await res.json()
            expect(data.method).toBe('GET')
            expect(data.url).toBe('/request-info')
        })

        it('should provide headers via useHeaders', async () => {
            const res = await fetch(`http://localhost:${port}/headers`, {
                headers: { 'x-custom': 'hello' },
            })
            const data = await res.json()
            expect(data.custom).toBe('hello')
        })

        it('should allow setting response headers via useResponse', async () => {
            const res = await fetch(`http://localhost:${port}/response-header`)
            expect(res.headers.get('x-custom-response')).toBe('test-value')
        })
    })

    describe('HTTP methods', () => {
        let app: H3
        let wooks: WooksH3
        let server: Server
        let port: number

        beforeAll(async () => {
            port = getPort()
            app = new H3()
            wooks = new WooksH3(app)

            wooks.get('/method', () => 'GET')
            wooks.post('/method', () => 'POST')
            wooks.put('/method', () => 'PUT')
            wooks.patch('/method', () => 'PATCH')
            wooks.delete('/method', () => 'DELETE')
            wooks.head('/method-head', () => {
                const response = useResponse()
                response.setHeader('x-method', 'HEAD')
                return ''
            })
            wooks.options('/method', () => 'OPTIONS')

            const handler = toNodeHandler(app)
            await new Promise<void>((resolve) => {
                server = createServer(handler).listen(port, resolve)
            })
        })

        afterAll(async () => {
            await new Promise<void>((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()))
            })
        })

        it('should handle GET', async () => {
            const res = await fetch(`http://localhost:${port}/method`)
            expect(await res.text()).toBe('GET')
        })

        it('should handle POST', async () => {
            const res = await fetch(`http://localhost:${port}/method`, { method: 'POST' })
            expect(await res.text()).toBe('POST')
        })

        it('should handle PUT', async () => {
            const res = await fetch(`http://localhost:${port}/method`, { method: 'PUT' })
            expect(await res.text()).toBe('PUT')
        })

        it('should handle PATCH', async () => {
            const res = await fetch(`http://localhost:${port}/method`, { method: 'PATCH' })
            expect(await res.text()).toBe('PATCH')
        })

        it('should handle DELETE', async () => {
            const res = await fetch(`http://localhost:${port}/method`, { method: 'DELETE' })
            expect(await res.text()).toBe('DELETE')
        })

        it('should handle HEAD', async () => {
            const res = await fetch(`http://localhost:${port}/method-head`, { method: 'HEAD' })
            expect(res.status).toBe(204)
            expect(res.headers.get('x-method')).toBe('HEAD')
        })

        it('should handle OPTIONS', async () => {
            const res = await fetch(`http://localhost:${port}/method`, { method: 'OPTIONS' })
            expect(await res.text()).toBe('OPTIONS')
        })
    })

    describe('async handlers', () => {
        let app: H3
        let wooks: WooksH3
        let server: Server
        let port: number

        beforeAll(async () => {
            port = getPort()
            app = new H3()
            wooks = new WooksH3(app)

            wooks.get('/async', async () => {
                await new Promise((r) => setTimeout(r, 10))
                return { async: true }
            })

            wooks.get('/async-error', async () => {
                await new Promise((r) => setTimeout(r, 10))
                throw new HttpError(422, 'validation error')
            })

            const handler = toNodeHandler(app)
            await new Promise<void>((resolve) => {
                server = createServer(handler).listen(port, resolve)
            })
        })

        afterAll(async () => {
            await new Promise<void>((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()))
            })
        })

        it('should handle async handlers', async () => {
            const res = await fetch(`http://localhost:${port}/async`)
            expect(res.status).toBe(200)
            const data = await res.json()
            expect(data).toEqual({ async: true })
        })

        it('should handle async errors', async () => {
            const res = await fetch(`http://localhost:${port}/async-error`)
            expect(res.status).toBe(422)
        })
    })

    describe('onNotFound handler', () => {
        let app: H3
        let wooks: WooksH3
        let server: Server
        let port: number

        beforeAll(async () => {
            port = getPort()
            app = new H3()
            wooks = new WooksH3(app, {
                onNotFound: () => {
                    const response = useResponse()
                    response.setStatus(404)
                    return { error: 'custom not found' }
                },
            })

            wooks.get('/exists', () => 'found')

            const handler = toNodeHandler(app)
            await new Promise<void>((resolve) => {
                server = createServer(handler).listen(port, resolve)
            })
        })

        afterAll(async () => {
            await new Promise<void>((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()))
            })
        })

        it('should use custom onNotFound handler', async () => {
            const res = await fetch(`http://localhost:${port}/not-there`)
            expect(res.status).toBe(404)
            const data = await res.json()
            expect(data).toEqual({ error: 'custom not found' })
        })

        it('should still handle matched routes', async () => {
            const res = await fetch(`http://localhost:${port}/exists`)
            expect(await res.text()).toBe('found')
        })
    })

    describe('h3 middleware integration', () => {
        let app: H3
        let wooks: WooksH3
        let server: Server
        let port: number

        beforeAll(async () => {
            port = getPort()
            app = new H3()

            wooks = new WooksH3(app)

            wooks.get('/with-h3', () => {
                return 'ok'
            })

            const handler = toNodeHandler(app)
            await new Promise<void>((resolve) => {
                server = createServer(handler).listen(port, resolve)
            })
        })

        afterAll(async () => {
            await new Promise<void>((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()))
            })
        })

        it('should work with h3 middleware', async () => {
            const res = await fetch(`http://localhost:${port}/with-h3`)
            expect(res.status).toBe(200)
            expect(await res.text()).toBe('ok')
        })
    })
})
