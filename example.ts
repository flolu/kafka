import {Kafka, logLevel} from 'kafkajs'
import {faker} from '@faker-js/faker'

const EXAMPLE_TOPIC = 'example-topic'
const EXAMPLE_CONSUMER = 'example-consumer'
const KAFKA_BROKER_ADDRESS = process.env.KAFKA_BROKER!

const kafka = new Kafka({brokers: [KAFKA_BROKER_ADDRESS], logLevel: logLevel.ERROR})
const producer = kafka.producer()
const consumer = kafka.consumer({groupId: EXAMPLE_CONSUMER})

async function main() {
  await producer.connect()
  await consumer.connect()

  await consumer.subscribe({topic: EXAMPLE_TOPIC})

  await consumer.run({
    eachMessage: async ({message}) => {
      console.log({
        offset: message.offset,
        value: message.value?.toString(),
        key: message.key?.toString(),
      })
    },
  })

  process.on('SIGTERM', async () => {
    await consumer.disconnect()
    await producer.disconnect()
    process.exit(0)
  })

  while (true) {
    await new Promise(async (res) => {
      await producer.send({
        topic: EXAMPLE_TOPIC,
        messages: [{key: faker.internet.userName(), value: faker.internet.emoji()}],
      })

      setTimeout(() => res(null), 3 * Math.random() * 1000)
    })
  }
}

main()
