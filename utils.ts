import WebSocket from 'ws'
import readline from 'readline'

export function setupKeyListener(handlers: {onEnter: () => void; onClose: () => void}) {
  readline.emitKeypressEvents(process.stdin)

  process.stdin.setRawMode(true)
  process.stdin.on('keypress', (_str, key) => {
    if (key.ctrl && key.name === 'c') handlers.onClose()
    else if (key.name === 'return') handlers.onEnter()
  })
}

export function sendSocketMessage<T>(ws: WebSocket, type: string, data?: T) {
  if (ws.readyState === ws.CLOSED) return
  const message = JSON.stringify({type, data: data || null})
  ws.send(message)
}

export function loadWalletBalanceLoop(ws: WebSocket) {
  setTimeout(() => {
    if (ws.readyState !== ws.CLOSED) {
      sendSocketMessage(ws, 'read_balance')
      loadWalletBalanceLoop(ws)
    }
  }, 10 * 1000)
}

export function formatUSD(amount: number) {
  const format = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'})
  return format.format(amount)
}
