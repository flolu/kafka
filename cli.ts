import WebSocket from 'ws'
import {WebSocketEvents} from './events'
import {
  getCurrencyFromAddress,
  loadWalletBalanceLoop,
  printBalance,
  sendSocketMessage,
  setupKeyListener,
} from './utils'

const ws = new WebSocket('ws://localhost:3000')
const address = process.argv[2]
const currency = getCurrencyFromAddress(address)
let balance: number | undefined
let price: number | undefined

async function shutdown() {
  Array.apply(null, Array(4)).forEach(() => process.stdout.write('\n'))
  await ws.close()
  process.exit(0)
}

ws.on('open', () => {
  sendSocketMessage(ws, WebSocketEvents.SetupWallet, address)

  setupKeyListener({
    onEnter: () => sendSocketMessage(ws, WebSocketEvents.ReadBalance),
    onClose: () => shutdown(),
  })

  loadWalletBalanceLoop(ws, 60)
})

ws.on('message', (json: string) => {
  const {data, type} = JSON.parse(json)

  switch (type) {
    case WebSocketEvents.BalanceUpdated: {
      balance = data.balance
      printBalance(currency, price, balance)
      break
    }

    case WebSocketEvents.PriceUpdated: {
      price = data.price
      printBalance(currency, price, balance)
      break
    }
  }
})

ws.on('close', () => shutdown())
