import WebSocket from 'ws'

import {formatUSD, loadWalletBalanceLoop, sendSocketMessage, setupKeyListener} from './utils'

const ws = new WebSocket('ws://localhost:3000')
const address = process.argv[2]
const OUTPUT_LINES_COUNT = 4

ws.on('open', () => {
  sendSocketMessage(ws, 'start_wallet', address)
  sendSocketMessage(ws, 'read_balance')

  setupKeyListener({
    onEnter: () => {
      sendSocketMessage(ws, 'read_balance')
    },
    onClose: async () => {
      Array.apply(null, Array(OUTPUT_LINES_COUNT)).forEach(() => process.stdout.write('\n'))
      await ws.close()
      process.exit(0)
    },
  })

  loadWalletBalanceLoop(ws)
})

ws.on('message', (json: string) => {
  const {data, type} = JSON.parse(json)

  switch (type) {
    case 'balance': {
      const {balance, price, currency} = data

      process.stdout.write(`Wallet:  ${currency.toUpperCase()}\n`)
      process.stdout.write(`Price:   ${price < 0 ? '...' : formatUSD(Number(price))}\n`)
      process.stdout.write(`Balance: ${balance < 0 || !balance ? '...' : balance}\n`)
      process.stdout.write(`Value:   ${balance < 0 || !balance ? '...' : formatUSD(balance * price)}\n`)
      process.stdout.moveCursor(0, -OUTPUT_LINES_COUNT)

      break
    }
  }
})
