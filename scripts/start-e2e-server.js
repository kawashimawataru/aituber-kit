const { spawn } = require('child_process')
const path = require('path')

const root = path.resolve(__dirname, '..')
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next')
const port = process.env.E2E_PORT || '3100'

const child = spawn(process.execPath, [nextBin, 'dev', '-p', port], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_SHOW_INTRODUCTION: 'false',
    NEXT_PUBLIC_MODEL_TYPE: 'pngtuber',
    NEXT_PUBLIC_SELECTED_PNGTUBER_PATH: '/pngtuber/nike01',
  },
})

const shutdown = (signal) => {
  child.kill(signal)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
