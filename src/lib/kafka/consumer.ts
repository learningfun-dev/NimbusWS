import kafka from './kafkaClient';

export async function connectConsumer(
  clientId: string,
  topic: string,
  messageHandler: (message: any) => void,
): Promise<void> {
  const consumer = kafka.consumer({ groupId: `client-${clientId}` });
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
