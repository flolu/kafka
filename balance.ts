import axios from 'axios'

const API_URL = 'https://api.blockcypher.com/v1'

async function main() {
  const address = 'bc1qhs3gptkxem5y7yaq2yg0un2m8hae6wt87gkx4n'
  const url = `${API_URL}/btc/main/addrs/${address}/balance`

  const {data} = await axios.get(url)
  console.log(data.balance)
}

main()
