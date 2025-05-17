const { Partitioners } = require('kafkajs');

import kafka from './kafkaClient';

const producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });

export async function connectProducer(): Promise<void> {
  await producer.connect();
}

export async function sendToKafka(topic: string, message: object): Promise<void> {
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
}

export { producer };
