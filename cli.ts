import readline from 'readline'
import WebSocket from 'ws'

function setupKeyListener(handler: (key: string) => void) {
  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)

  process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
      process.exit()
    } else {
      handler(str)
    }
  })
}

async function main() {
  const ws = new WebSocket('ws://localhost:8080')

  ws.on('open', () => {
    ws.send('ping')

    setupKeyListener(() => {
      ws.send('ping')
    })
  })

  ws.on('message', data => {
    process.stdout.clearLine(0)
    process.stdout.cursorTo(0)
    process.stdout.write(data.toString())
  })
}

main()
