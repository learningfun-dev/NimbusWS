const config = require('config');
import { sendToKafka } from '../lib/kafka/producer';
import kafkaClient from '../lib/kafka/kafkaClient';
import { redisPublisher } from '../lib/redis/redisClient';

interface EventAcceptedPayload {
  type: string;
  event_id: string;
  client_id: string;
  [key: string]: any;
}

export async function handleWebSocketMessage(message: string, resultTopic: string): Promise<string> {
  try {
    const json: EventAcceptedPayload = JSON.parse(message);

    if (json.type === 'event_accepted') {
      const dummy_result = {
        type: 'event_processed_successfully',
        event_id: json.event_id,
        client_id: json.client_id,
        payload: json,
        status: 'Event Processed Successfully',
        completed_at: new Date().toISOString(),
      };

      await sendToKafka(resultTopic, dummy_result);
      return JSON.stringify(dummy_result);
    } else {
      return JSON.stringify({ type: 'reject', data: 'wrong type' });
    }
  } catch (error: any) {
    return JSON.stringify({ type: 'error', data: error.message });
  }
}

export async function startKafkaSharedConsumer(kafkaResultTopic: string, redisPubsubChannel: string): Promise<void> {
  const consumer = kafkaClient.consumer({ groupId: 'shared-ws-consumer-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: kafkaResultTopic, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const value = message.value?.toString();
      if (!value) return;

      const parsed = JSON.parse(value);
      parsed.partition = partition;
      parsed.topic = topic;
      parsed.kafka_offset = message.offset;

      await redisPublisher.publish(redisPubsubChannel, JSON.stringify(parsed));
    },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function handleProcessEvent(resultTopic: string, message: string): Promise<void> {
  try {
    const json: EventAcceptedPayload = JSON.parse(message);

    //Complex logic to process the events
    await sleep(3000); // Sleep for 3 sec

    // Send the results after that
    const dummy_result = {
      type: 'event_processed_successfully',
      event_id: json.event_id,
      client_id: json.client_id,
      payload: json,
      status: 'Event Processed Successfully',
      completed_at: new Date().toISOString(),
      processed_result_sent_to: resultTopic,
    };

    await sendToKafka(resultTopic, dummy_result);
  } catch (error: any) {
    console.log(`Error sending events to kafka topic ${resultTopic} :`, error);
  }
}
