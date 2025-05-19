'use strict';
const config = require('config');
import autoLoad from '@fastify/autoload';
import FastifyWebSocket from '@fastify/websocket';
import { join } from 'node:path';
import fastify from 'fastify';

import { createTopic } from './lib/kafka/admin';
import { connectProducer } from './lib/kafka/producer';

const server_port = config.get('port');
const kafka_event_topic_name = config.get('services.kafka.approach2.event_topic');
const kafka_result_topic_name = config.get('services.kafka.approach2.result_topic');

const start = async () => {
  const app = fastify({ logger: true });

  app.register(FastifyWebSocket, {
    // errorHandler: function (error, socket /* WebSocket */, req /* FastifyRequest */, reply /* FastifyReply */) {
    //   // Do stuff
    //   // destroy/close connection
    //   app.log.error('closing connection due to error.', error);
    //   socket.terminate();
    // },
    preClose: (done) => {
      // Note: can also use async style, without done-callback
      const server = app.websocketServer;

      for (const socket of server.clients) {
        socket.close(1001, 'WS server is going offline in custom manner, sending a code + message');
      }

      server.close(done);
    },
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
    dir: join(__dirname, 'routes'),
    routeParams: true,
  });

  // Create kafka topic if not exists
  await createTopic([kafka_event_topic_name, kafka_result_topic_name]);
  // create kafka producter
  await connectProducer();

  app.listen({ host: '0.0.0.0', port: server_port }, (err: any, address: any) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    app.log.info(`Server listening at: ${address}`);
  });
};

start();
