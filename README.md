<div align="center">
  <!-- <a href="https://github.com/flolu/auth">
    <img width="100px" height="auto" src="./.github/thumbnail.png" />
  </a> -->
  <br>
  <h1>Node.js Kafka Example</h1>
  <p>Realtime Bitcoin Wallet Tracker Example App with Node.js and Kafka</p>
</div>

# Features

- Interact with Kafka through Node.js
- Produce/consume events to/from topics
- Use Kafka as a queue and as a publish/subscribe system
- Kafka with Zookeeper, without Zookeeper and with Redpanda
- Read latest events or from the beginning
- Make use of Kafka's partitioning ability

# Tech Stack

- [Node.js](https://nodejs.org)
- [TypeScript](https://www.typescriptlang.org)
- [Docker](https://www.docker.com)
- [Kafka](https://kafka.apache.org)
- [Redpanda](https://github.com/redpanda-data/redpanda)
- [WebSockets](https://github.com/websockets/ws)

# Usage

**Recommended OS**: Linux

**Requirements**: Node.js, Docker, Docker Compose

**Setup**

- `npm install`

# Codebase

- [`cli.ts`](cli.ts) CLI application to read wallet data in realtime
- [`server.ts`](server.ts) WebSocket server that communicates with CLI and with Kafka
- [`crawler.ts`](crawler.ts) Service, that crawls wallet balance on demand
- [`price.ts`](price.ts) Service, that writes realtime price events to Kafka
- [`docker-compose.yml`](docker-compose.yml) backend development environment
