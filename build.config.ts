import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
    declaration: true,
    rollup: {
        emitCJS: true,
    },
    externals: ['@wooksjs/event-http', '@wooksjs/event-core', 'wooks', 'h3'],
    entries: ['src/index'],
})
