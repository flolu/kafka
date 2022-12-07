import axios from 'axios'
import {Kafka} from 'kafkajs'

const API_URL = 'https://api.blockcypher.com/v1'
const kafka = new Kafka({brokers: ['kafka:9092']})
const producer = kafka.producer()
const taskConsumer = kafka.consumer({groupId: 'balance-crawler', retry: {retries: 0}})

const BLOCKCYPHER_TOKEN = process.env.BLOCKCYPHER_TOKEN

async function main() {
  await producer.connect()
  await taskConsumer.connect()

  await taskConsumer.subscribe({topic: 'task_crawl_balance', fromBeginning: false})
  await taskConsumer.run({
    eachMessage: async ({message}) => {
      const {address, currency} = JSON.parse(message.value!.toString())

      let url = `${API_URL}/${currency}/main/addrs/${address}/balance`
      if (BLOCKCYPHER_TOKEN) url += `?token=${BLOCKCYPHER_TOKEN}`

      const {data} = await axios.get(url)

      const balance = currency === 'btc' ? data.balance / 100000000 : data.balance / 1000000000000000000

      const payload = JSON.stringify({balance})
      await producer.send({
        topic: 'wallet_balance',
        messages: [{key: address, value: payload}],
      })
    },
  })
}

main()
