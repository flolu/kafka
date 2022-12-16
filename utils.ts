import WebSocket from 'ws'
import readline from 'readline'
import {WebSocketEvents} from './events'

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

export function loadWalletBalanceLoop(ws: WebSocket, seconds: number) {
  setTimeout(() => {
    if (ws.readyState !== ws.CLOSED) {
      sendSocketMessage(ws, WebSocketEvents.ReadBalance)
      loadWalletBalanceLoop(ws, seconds)
    }
  }, seconds * 1000)
}

export function formatUSD(amount: number) {
  const format = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'})
  return format.format(amount)
}

export function printBalance(currency: string, price?: number, balance?: number) {
  process.stdout.write(`Wallet:  ${currency.toUpperCase()}\n`)
  process.stdout.write(`Price:   ${price ? formatUSD(Number(price)) : '...'}\n`)
  process.stdout.write(`Balance: ${balance || '...'}\n`)
  process.stdout.write(`Value:   ${balance !== undefined && price ? formatUSD(balance * price) : '...'}\n`)

  process.stdout.moveCursor(0, -4)
}

export function getCurrencyFromAddress(address: string) {
  return address.startsWith('0x') ? 'eth' : 'btc'
}
