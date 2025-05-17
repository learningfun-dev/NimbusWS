import kafka from './kafkaClient';
const consumer = kafka.consumer({ groupId: 'results_group' });

export async function connectConsumer(topic: string, messageHandler: (message: any) => void): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const result = JSON.parse(message.value!.toString());
        await messageHandler(result);
      } catch (err) {
        console.error('Kafka consumer error:', err);
      }
    },
  });
}
