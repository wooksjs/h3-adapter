# @wooksjs/h3-adapter

<p align="center">
<img src="./docs/icon.png" height="156px"><br>
<a  href="https://github.com/wooksjs/h3-adapter/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</a>
</p>

Use [Wooks](https://wooks.moost.org/) composables with [H3](https://h3.unjs.io/) — register Wooks-style route handlers on top of an existing H3 app. Unmatched requests automatically fall through to H3 handlers.

## Install

```bash
npm install @wooksjs/h3-adapter @wooksjs/event-http wooks h3
```

## Quick Start

```ts
import { H3, toNodeHandler } from 'h3/node'
import { WooksH3 } from '@wooksjs/h3-adapter'
import { useRouteParams } from '@wooksjs/event-http'
import { createServer } from 'http'

const app = new H3()
const wooks = new WooksH3(app)

wooks.get('/hello/:name', () => {
    const { get } = useRouteParams()
    return { hello: get('name') }
})

const handler = toNodeHandler(app)
createServer(handler).listen(3000, () => {
    console.log('Server running on http://localhost:3000')
})
```

## Features

- Full access to Wooks composables (`useRequest`, `useRouteParams`, `useHeaders`, `useResponse`, `useCookies`, `useAuthorization`, etc.)
- All HTTP methods: `get`, `post`, `put`, `patch`, `delete`, `head`, `options`
- Mixed routing — use Wooks routes and H3 routes side by side
- Async handler support
- Custom error handling with `HttpError`
- Configurable 404 behavior

## Composables

Access request data and control responses using Wooks composables — no handler arguments needed:

```ts
import {
    useRequest,
    useRouteParams,
    useHeaders,
    useResponse,
    useCookies,
    useAuthorization,
    useUrlParams,
    HttpError,
} from '@wooksjs/event-http'
```

## Usage Examples

### Route Parameters

```ts
wooks.get('/users/:id', () => {
    const { get } = useRouteParams()
    return { userId: get('id') }
})
```

### Reading Request Body

```ts
wooks.post('/data', async () => {
    const { rawBody } = useRequest()
    const body = await rawBody()
    return { received: body.toString() }
})
```

### Setting Response Headers

```ts
wooks.get('/custom-headers', () => {
    const response = useResponse()
    response.setHeader('x-powered-by', 'wooks')
    response.setStatus(200)
    return { ok: true }
})
```

### Error Handling

```ts
wooks.get('/protected', () => {
    throw new HttpError(403, 'Forbidden')
})
```

### Mixed Routing (Wooks + H3)

```ts
const app = new H3()
const wooks = new WooksH3(app)

// Wooks route — uses composables
wooks.get('/wooks-route', () => {
    const { get } = useRouteParams()
    return 'handled by wooks'
})

// H3 route — uses h3 event API
app.on('GET', '/h3-route', (event) => {
    return 'handled by h3'
})
```

Requests matching Wooks routes are handled by Wooks. Unmatched requests fall through to H3.

## Options

```ts
const wooks = new WooksH3(app, {
    // Return 404 for unmatched routes instead of falling through to H3
    raise404: true,

    // Custom handler for unmatched routes
    onNotFound: () => {
        const response = useResponse()
        response.setStatus(404)
        return { error: 'not found' }
    },

    // Default response headers
    defaultHeaders: {
        'x-powered-by': 'wooks',
    },

    // Request body size limits
    requestLimits: {
        maxCompressed: 1_048_576,
        maxInflated: 10_485_760,
    },
})
```

## Development

```bash
npm install        # Install dependencies
npm test           # Run tests (vitest)
npm run build      # Build (unbuild)
npm run lint       # Lint (oxlint)
npm run fmt        # Format (oxfmt)
```

## License

MIT
