import axios from 'axios'
import {Kafka} from 'kafkajs'

const API_URL = 'https://api.blockcypher.com/v1'
const kafka = new Kafka({brokers: ['kafka:9092']})
const producer = kafka.producer()
const taskConsumer = kafka.consumer({groupId: 'balance_crawler'})

async function main() {
  await producer.connect()
  await taskConsumer.connect()

  await taskConsumer.subscribe({topic: 'task_crawl_balance', fromBeginning: false})
  // TODO don't retry on error
  await taskConsumer.run({
    eachMessage: async ({message}) => {
      const {address, currency} = JSON.parse(message.value!.toString())

      const url = `${API_URL}/${currency}/main/addrs/${address}/balance`

      const {data} = await axios.get(url)
      const balance = currency === 'btc' ? data.balance / 100000000 : data.balance / 1000000000000000000

      const payload = JSON.stringify({balance})
      await producer.send({
        topic: 'wallet_balance',
        messages: [{key: address, value: Buffer.from(payload, 'utf-8')}],
      })
    },
  })
}

main()
