import {v4 as uuidv4} from 'uuid'
import {WebSocketServer, WebSocket} from 'ws'
import {Kafka} from 'kafkajs'

const wss = new WebSocketServer({port: 3000})
const kafka = new Kafka({brokers: ['kafka:9092']})
const priceConsumer = kafka.consumer({groupId: uuidv4()})
const balanceConsumer = kafka.consumer({groupId: uuidv4()})
const producer = kafka.producer()

const clients = new Map<string, WebSocket>()
const clientWallets = new Map<string, {address: string; currency: string}>()
const walletBalances = new Map<string, number>()
const prices: Record<string, number | null> = {btc: null, eth: null}

async function pleaseCrawlBalance(address: string, currency: string) {
  const payload = JSON.stringify({address, currency})
  await producer.send({
    topic: 'task_crawl_balance',
    messages: [{key: address, value: Buffer.from(payload, 'utf-8')}],
  })
}

async function main() {
  await priceConsumer.connect()
  await balanceConsumer.connect()
  await producer.connect()

  console.log('connected')

  await priceConsumer.subscribe({topic: 'price', fromBeginning: false})
  await balanceConsumer.subscribe({topic: 'wallet_balance', fromBeginning: false})

  await priceConsumer.run({
    eachMessage: async ({message}) => {
      const payload = JSON.parse(message.value!.toString())
      const currency = message.key!.toString()
      prices[currency] = payload.price

      clients.forEach((ws, id) => {
        const wallet = clientWallets.get(id)

        if (wallet && wallet.currency === currency) {
          const balance = walletBalances.get(wallet.address) || null
          ws.send(JSON.stringify({type: 'balance', data: {balance, price: prices[currency], currency}}))
        }
      })
    },
  })

  await balanceConsumer.run({
    eachMessage: async ({message}) => {
      const {balance} = JSON.parse(message.value!.toString())
      const address = message.key!.toString()

      walletBalances.set(address, balance)
      clientWallets.forEach((wallet, clientId) => {
        if (wallet.address === address) {
          const ws = clients.get(clientId)
          if (ws) {
            ws.send(
              JSON.stringify({
                type: 'balance',
                data: {balance, price: prices[wallet.currency], currency: wallet.currency},
              })
            )
          }
        }
      })
    },
  })

  wss.on('connection', (ws) => {
    const socketId = uuidv4()
    clients.set(socketId, ws)

    console.log({socketId})

    ws.on('close', () => {
      clients.delete(socketId)
      // TODO delete wallet if not used by anyone else
    })

    ws.on('message', async (payload: string) => {
      const {type, data} = JSON.parse(payload)
      console.log('ws message', {type, data})

      switch (type) {
        case 'start_wallet': {
          const address = data
          const currency = address.startsWith('0x') ? 'eth' : 'btc'
          clientWallets.set(socketId, {address, currency})
          await pleaseCrawlBalance(address, currency)
          break
        }

        case 'read_balance': {
          const wallet = clientWallets.get(socketId)
          if (wallet) await pleaseCrawlBalance(wallet.address, wallet.currency)
          break
        }
      }
    })
  })
}

main()
