# H3 Adapter (Wooks Composables)

**!!! This is work-in-progress library, breaking changes are expected !!!**

<p align="center">
<img src="./docs/icon.png" height="156px"><br>
<a  href="https://github.com/wooksjs/h3-adapter/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</a>
</p>

🔥 Get power of [@wooksjs/event-http](https://www.npmjs.com/package/@wooksjs/event-http) in your h3 project!

## Install

`npm install @wooksjs/h3-adapter @wooksjs/event-http`

## Usage

```ts
import { WooksError, useRequest} from '@wooksjs/event-http'
import { useRouteParams} from '@wooksjs/event-core'
import { useBody } from '@wooksjs/http-body'
import { useProxy } from '@wooksjs/http-proxy'
import { createServer } from 'http'
import { createApp, toNodeListener, createRouter  } from 'h3'
import { eventHandler } from '@wooksjs/h3-adapter'

const router = createRouter()

router.get('/test/:param', eventHandler(() => {
    const { get } = useRouteParams()
    return { message: 'it works', param: get('param'), url: useRequest().url }
}))

router.post('/post', eventHandler(async () => {
    const { parseBody, rawBody } = useBody()
    const raw = await rawBody()
    return { parsed: await parseBody(), raw  }
}))

router.get('/error', eventHandler(() => {
    throw new WooksError(400, 'test error')
}))

router.get('/proxy', eventHandler(() => {
    const proxy = useProxy()
    return proxy('http://localhost:3000/test/proxy')
}))

const app = createApp()
app.use(router)

createServer(toNodeListener(app))
    .listen(process.env.PORT || 3000, () => console.log('listening 3000'))
```
