import {v4 as uuidv4} from 'uuid'
import {WebSocketServer, WebSocket} from 'ws'
import {Kafka} from 'kafkajs'

const wss = new WebSocketServer({port: 8080})
const kafka = new Kafka({brokers: ['kafka:9092']})
const priceConsumer = kafka.consumer({groupId: uuidv4()})
const balanceConsumer = kafka.consumer({groupId: uuidv4()})
const producer = kafka.producer()

const clients = new Map<string, WebSocket>()
const clientWallets = new Map<string, string>()
const walletBalances = new Map<string, number>()
let price = -1

async function pleaseCrawlBalance(address: string) {
  const payload = JSON.stringify({address})
  await producer.send({
    topic: 'task_crawl_balance',
    messages: [{key: address, value: Buffer.from(payload, 'utf-8')}],
  })
}

async function main() {
  await priceConsumer.connect()
  await balanceConsumer.connect()
  await producer.connect()

  await priceConsumer.subscribe({topic: 'price', fromBeginning: false})
  await balanceConsumer.subscribe({topic: 'btc_balance', fromBeginning: false})

  await priceConsumer.run({
    eachMessage: async ({message}) => {
      const payload = JSON.parse(message.value!.toString())
      clients.forEach((ws, id) => {
        const wallet = clientWallets.get(id)

        if (wallet) {
          const balance = walletBalances.get(wallet) || -1
          price = payload.usdt

          ws.send(JSON.stringify({type: 'balance', data: {balance, price}}))
        }
      })
    },
  })

  await balanceConsumer.run({
    eachMessage: async ({message}) => {
      const {balance} = JSON.parse(message.value!.toString())
      const address = message.key!.toString()

      walletBalances.set(address, balance)
      clientWallets.forEach((clientId, walletAddress) => {
        if (walletAddress === address) {
          const ws = clients.get(clientId)
          if (ws) {
            ws.send(JSON.stringify({type: 'balance', data: {balance, price}}))
          }
        }
      })
    },
  })

  wss.on('connection', (ws) => {
    const socketId = uuidv4()
    clients.set(socketId, ws)

    ws.on('close', () => {
      clients.delete(socketId)
    })

    ws.on('message', async (payload: string) => {
      const {type, data} = JSON.parse(payload)

      switch (type) {
        case 'start_wallet': {
          clientWallets.set(socketId, data)
          await pleaseCrawlBalance(data)
          break
        }

        case 'read_balance': {
          const address = clientWallets.get(socketId)
          if (address) await pleaseCrawlBalance(address)
          break
        }
      }
    })
  })
}

main()
