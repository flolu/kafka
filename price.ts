const {Spot} = require('@binance/connector')
import {Kafka} from 'kafkajs'

const client = new Spot()
const kafka = new Kafka({brokers: ['kafka:9092']})
const producer = kafka.producer()
const BTC_USDT_TICKER = 'btcusdt'
const ETH_USDT_TICKER = 'ethusdt'

async function main() {
  await producer.connect()

  const callbacks = {
    message: async (json: string) => {
      const {stream, data} = JSON.parse(json)
      const currency = stream.split('usdt@ticker')[0]
      const price = Number(data.c)
      const payload = JSON.stringify({price})

      await producer.send({
        topic: 'price',
        messages: [{key: currency, value: Buffer.from(payload, 'utf-8')}],
      })
    },
  }

  const wsRef = client.combinedStreams(
    [`${BTC_USDT_TICKER}@ticker`, `${ETH_USDT_TICKER}@ticker`],
    callbacks
  )

  // setTimeout(() => client.unsubscribe(wsRef), 3000)
}

// TODO handle shutdown

main()
