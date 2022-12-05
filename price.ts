const {Spot} = require('@binance/connector')

const client = new Spot()
const BTC_USDT_TICKER = 'BTCUSDT'

const callbacks = {
  message: (data: string) => {
    const priceUSDT = JSON.parse(data).c
    console.log(priceUSDT)
  },
}

const wsRef = client.tickerWS(BTC_USDT_TICKER, callbacks)

setTimeout(() => client.unsubscribe(wsRef), 3000)
