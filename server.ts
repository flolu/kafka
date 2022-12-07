import {v4 as uuidv4} from 'uuid'
import {WebSocketServer, WebSocket} from 'ws'
import {Kafka, logLevel} from 'kafkajs'
import {getCurrencyFromAddress, sendSocketMessage} from './utils'
import {KafkaTopics, WebSocketEvents} from './events'

const KAFKA_BROKER = process.env.KAFKA_BROKER!

const kafka = new Kafka({brokers: [KAFKA_BROKER], logLevel: logLevel.ERROR})
const producer = kafka.producer()

/**
 * Unique groupIds, because all server instances should receive
 * all price and balance updates.
 * (Publish-Subscribe-Pattern)
 */
const priceConsumerGroupId = `server-price-${uuidv4()}`
const balanceConsumerGroupId = `server-balance-${uuidv4()}`
const priceConsumer = kafka.consumer({groupId: priceConsumerGroupId})
const balanceConsumer = kafka.consumer({groupId: balanceConsumerGroupId})

const wss = new WebSocketServer({port: 3000})
const clients = new Map<string, WebSocket>() // socketId -> WebSocket
const clientWallets = new Map<string, {address: string; currency: string}>() // socketId -> Wallet
const walletBalances = new Map<string, number>() // address -> balance
const prices: Record<string, number | null> = {btc: null, eth: null} // currency -> price

async function pleaseCrawlBalance(address: string, currency: string) {
  const payload = JSON.stringify({address, currency})
  await producer.send({
    topic: KafkaTopics.TaskToReadBalance,
    messages: [{key: address, value: payload}],
  })
}

function notifyClientsAboutPriceUpdate(currency: string, price: number) {
  clients.forEach((ws, id) => {
    const wallet = clientWallets.get(id)
    if (wallet?.currency === currency) sendSocketMessage(ws, WebSocketEvents.PriceUpdated, {price})
  })
}

function notifyClientsAboutBalanceUpdate(address: string, balance: number) {
  clientWallets.forEach((wallet, clientId) => {
    if (wallet.address === address) {
      const ws = clients.get(clientId)
      if (ws) sendSocketMessage(ws, WebSocketEvents.BalanceUpdated, {balance})
    }
  })
}

async function main() {
  await priceConsumer.connect()
  await balanceConsumer.connect()
  await producer.connect()

  await priceConsumer.subscribe({topic: KafkaTopics.CurrencyPrice, fromBeginning: false})
  await balanceConsumer.subscribe({topic: KafkaTopics.WalletBalance, fromBeginning: false})

  await priceConsumer.run({
    eachMessage: async ({message}) => {
      const {price} = JSON.parse(message.value!.toString())
      const currency = message.key!.toString()
      prices[currency] = price

      notifyClientsAboutPriceUpdate(currency, price)
    },
  })

  await balanceConsumer.run({
    eachMessage: async ({message}) => {
      const {balance} = JSON.parse(message.value!.toString())
      const address = message.key!.toString()
      walletBalances.set(address, balance)

      notifyClientsAboutBalanceUpdate(address, balance)
    },
  })

  wss.on('connection', (ws) => {
    const socketId = uuidv4()
    clients.set(socketId, ws)

    ws.on('close', () => {
      clients.delete(socketId)
      clientWallets.delete(socketId)
    })

    ws.on('message', async (payload: string) => {
      const {type, data} = JSON.parse(payload)
      console.log('[message from client]', {socketId, type, data})

      switch (type) {
        case WebSocketEvents.SetupWallet: {
          const address = data
          const currency = getCurrencyFromAddress(address)
          clientWallets.set(socketId, {address, currency})

          const price = prices[currency]
          if (price) notifyClientsAboutPriceUpdate(currency, price)

          const balance = walletBalances.get(address)
          if (balance) notifyClientsAboutBalanceUpdate(address, balance)
          else await pleaseCrawlBalance(address, currency)

          break
        }

        case WebSocketEvents.ReadBalance: {
          const wallet = clientWallets.get(socketId)
          if (wallet) await pleaseCrawlBalance(wallet.address, wallet.currency)
          break
        }
      }
    })
  })

  process.on('SIGTERM', () => {
    wss.close(async () => {
      await priceConsumer.disconnect()
      await balanceConsumer.disconnect()
      await kafka.admin().deleteGroups([priceConsumerGroupId, balanceConsumerGroupId])
      await producer.disconnect()

      process.exit(0)
    })
  })

  console.log('Started successfully')
}

main()
