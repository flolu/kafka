import {v4 as uuidv4} from 'uuid'
import {WebSocketServer, WebSocket} from 'ws'
import {Kafka} from 'kafkajs'

const wss = new WebSocketServer({port: 8080})
const kafka = new Kafka({brokers: ['kafka:9092']})
const priceConsumer = kafka.consumer({groupId: uuidv4()})

const clients = new Map<string, WebSocket>()
const clientWallets = new Map<string, string>()
const walletBalances = new Map<string, number>()

async function main() {
  await priceConsumer.connect()
  await priceConsumer.subscribe({topic: 'price', fromBeginning: false})
  await priceConsumer.run({
    eachMessage: async ({message}) => {
      const payload = JSON.parse(message.value!.toString())
      clients.forEach((ws, id) => {
        const wallet = clientWallets.get(id)

        if (wallet) {
          const balance = walletBalances.get(wallet) || -1
          const price = payload.usdt

          ws.send(JSON.stringify({type: 'balance', data: {balance, price}}))
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

    ws.on('message', (payload: string) => {
      const {type, data} = JSON.parse(payload)

      switch (type) {
        case 'start_wallet': {
          clientWallets.set(socketId, data)
          break
        }
        case 'read_balance': {
          // ws.send(JSON.stringify({type: 'balance', data: {balance: Math.random(), price: Math.random()}}))
          break
        }
      }
    })
  })
}

main()
