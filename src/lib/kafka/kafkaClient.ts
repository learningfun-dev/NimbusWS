import { Kafka } from 'kafkajs';
const config = require('config');

const kafka_url = config.get('services.kafka.url');

const kafka = new Kafka({
  clientId: 'websocket-service',
  brokers: [kafka_url], // Replace with your Kafka brokers
});

export default kafka;
