'use strict';
const config = require('config');
import autoLoad from '@fastify/autoload';
import FastifyWebSocket from '@fastify/websocket';
import { join } from 'node:path';
import fastify from 'fastify';

import { createTopic } from './lib/kafka/admin';
import { connectProducer } from './lib/kafka/producer';
import { connectConsumer } from './lib/kafka/consumer';
import { handleKafkaResult } from './services/events'; // still imported to hook Kafka consumer

const server_port = config.get('port');
const kafka_event_topic_name = config.get('services.kafka.event_topic');
const kafka_result_topic_name = config.get('services.kafka.result_topic');

const start = async () => {
  const app = fastify({ logger: true });

  app.register(FastifyWebSocket, {
    options: {
      maxPayload: 1048576, // we set the maximum allowed messages size to 1 MiB (1024 bytes * 1024 bytes)
    },
  });

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  app.register(autoLoad, {
    dir: join(__dirname, 'plugins'),
    autoHooks: true, // apply hooks to routes in this level
  });

  // This loads all plugins defined in services
  // define your routes in one of these
  app.register(autoLoad, {
    dir: join(__dirname, 'services'),
  });

  // Create kafka topic if not exists
  await createTopic([kafka_event_topic_name, kafka_result_topic_name]);
  // create kafka producter and consumer
  await connectProducer();
  await connectConsumer(kafka_result_topic_name, handleKafkaResult);

  app.listen({ host: '0.0.0.0', port: server_port }, (err: any, address: any) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    app.log.info(`Server listening at: ${address}`);
  });
};

start();
