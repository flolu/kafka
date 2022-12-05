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
  await taskConsumer.run({
    eachMessage: async ({message}) => {
      const {address} = JSON.parse(message.value!.toString())

      const url = `${API_URL}/btc/main/addrs/${address}/balance`

      const {data} = await axios.get(url)
      const satoshi = data.balance

      const payload = JSON.stringify({balance: satoshi / 100000000})
      await producer.send({
        topic: 'btc_balance',
        messages: [{key: address, value: Buffer.from(payload, 'utf-8')}],
      })
    },
  })
}

main()
