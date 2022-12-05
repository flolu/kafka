const {Spot} = require('@binance/connector')
import {Kafka} from 'kafkajs'

const client = new Spot()
const kafka = new Kafka({brokers: ['kafka:9092']})
const producer = kafka.producer()
const BTC_USDT_TICKER = 'BTCUSDT'

async function main() {
  await producer.connect()
  console.log('Producer connected')

  const callbacks = {
    message: async (data: string) => {
      const priceUSDT = JSON.parse(data).c
      const payload = JSON.stringify({usdt: priceUSDT})
      await producer.send({
        topic: 'price',
        messages: [{key: 'btc', value: Buffer.from(payload, 'utf-8')}],
      })
    },
  }

  const wsRef = client.tickerWS(BTC_USDT_TICKER, callbacks)

  // setTimeout(() => client.unsubscribe(wsRef), 3000)
}

// TODO handle shutdown

main()
