require('dotenv').config();
const config = require('config');
import { createTopic } from './lib/kafka/admin';
import { connectConsumer } from './lib/kafka/consumer';
import { connectProducer } from './lib/kafka/producer';

import { handleProcessEvent } from './services/processEventsService';
import { startKafkaSharedConsumer } from './services/processEventsService';

const redisPubsubChannel = config.get('services.redis.pubSubMessageChannel');

const kafka_approach2_event_topic_name = config.get('services.kafka.approach2.event_topic');
const kafka_approach2_result_topic_name = config.get('services.kafka.approach2.result_topic');

const kafka_approach3_event_topic_name = config.get('services.kafka.approach3.event_topic');
const kafka_approach3_result_topic_name = config.get('services.kafka.approach3.result_topic');

const start = async () => {
  const header_message = `
  ------------------------------------------------------------------------------------------------------------

    Starting external services which act as kafka consumers and should be present outside the Nimbus server
  
  ------------------------------------------------------------------------------------------------------------
  `;
  console.log(header_message);

  // Create kafka topic if not exists
  await createTopic([
    kafka_approach2_event_topic_name,
    kafka_approach2_result_topic_name,
    kafka_approach3_event_topic_name,
    kafka_approach3_result_topic_name,
  ]);

  // start kafka common producer to send the data to the kafka toppic passed as a parameter to function sendToKafka
  const kafka_producer = connectProducer();

  // start kafka consumer to process events topic for appoach 2
  const kafka_consumer_for_approach2_event_topic = connectConsumer(
    'approach2_event_processor',
    kafka_approach2_event_topic_name,
    kafka_approach2_result_topic_name,
    handleProcessEvent,
  );

  // start kafka consumer to process events topic for appoach 3
  const kafka_consumer_for_approach3_event_topic = connectConsumer(
    'approach3_event_processor',
    kafka_approach3_event_topic_name,
    kafka_approach3_result_topic_name,
    handleProcessEvent,
  );

  // start kafka consumer for approach 3 results topic, which publish the results to redis channel
  const kafka_consumer_for_approach3_results_topic = startKafkaSharedConsumer(
    kafka_approach3_result_topic_name,
    redisPubsubChannel,
  );

  await Promise.all([
    kafka_producer,
    kafka_consumer_for_approach2_event_topic,
    kafka_consumer_for_approach3_event_topic,
    kafka_consumer_for_approach3_results_topic,
  ]);
};
start();
