import kafka from './kafkaClient';

export async function connectConsumer(
  groupId: string,
  topic: string,
  resultTopic: string,
  messageHandler: (resultTopic: string, message: any) => void,
): Promise<void> {
  const consumer = kafka.consumer({ groupId: groupId });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        console.log('message recived from topic: ', topic);
        const result = message.value!.toString();
        await messageHandler(resultTopic, result);
      } catch (err) {
        console.error('Kafka consumer error:', err);
      }
    },
  });
}
