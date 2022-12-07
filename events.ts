export enum WebSocketEvents {
  // From client to server
  SetupWallet = 'setup_wallet',
  ReadBalance = 'read_balance',

  // From server to client
  BalanceUpdated = 'balance_updated',
  PriceUpdated = 'price_updated',
}

export enum KafkaTopics {
  TaskToReadBalance = 'task_to_read_balance',
  WalletBalance = 'wallet_balance',
  CurrencyPrice = 'currency_price',
}
