import readline from 'readline'
import WebSocket from 'ws'

function setupKeyListener(handler: (key: string) => void) {
  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)

  process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
      process.stdout.write('\n')
      process.exit()
    } else {
      handler(str)
    }
  })
}

async function main() {
  const ws = new WebSocket('ws://localhost:3000')
  const address = process.argv[2]

  ws.on('open', () => {
    ws.send(JSON.stringify({type: 'start_wallet', data: address}))
    ws.send(JSON.stringify({type: 'read_balance', data: null}))

    setupKeyListener(() => {
      ws.send(JSON.stringify({type: 'read_balance', data: null}))
    })

    process.stdout.write('Loading...')
  })

  ws.on('message', (payload: string) => {
    const {data, type} = JSON.parse(payload)

    switch (type) {
      case 'balance': {
        const {balance, price, currency} = data

        if (balance < 0 || price < 0) break

        process.stdout.clearLine(0)
        process.stdout.cursorTo(0)

        const balanceUSD = (balance * price).toFixed(2)
        const currencyTicker = currency.toUpperCase()
        const priceUSD = Number(price).toFixed(2)

        process.stdout.write(`$${balanceUSD} (${balance} ${currencyTicker} @ $${priceUSD})`)

        break
      }
    }
  })
}

main()
