const {Spot} = require('@binance/connector')
import {Kafka, logLevel} from 'kafkajs'
import {KafkaTopics} from './events'

const BTC_USDT_TICKER = 'btcusdt'
const ETH_USDT_TICKER = 'ethusdt'
const KAFKA_BROKER = process.env.KAFKA_BROKER!

const client = new Spot()
const kafka = new Kafka({brokers: [KAFKA_BROKER], logLevel: logLevel.ERROR})
const producer = kafka.producer()

async function main() {
  await producer.connect()

  const callbacks = {
    message: async (json: string) => {
      const {stream, data} = JSON.parse(json)
      const currency = stream.split('usdt@ticker')[0]
      const price = Number(data.c)

      const payload = JSON.stringify({price})
      await producer.send({
        topic: KafkaTopics.CurrencyPrice,
        messages: [{key: currency, value: payload}],
      })
    },
  }

  const wsRef = client.combinedStreams([`${BTC_USDT_TICKER}@ticker`, `${ETH_USDT_TICKER}@ticker`], callbacks)

  process.on('SIGTERM', async () => {
    client.unsubscribe(wsRef)
    await producer.disconnect()

    process.exit(0)
  })

  console.log('Started successfully')
}

main()
