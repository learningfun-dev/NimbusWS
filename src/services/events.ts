const config = require('config');
const redis = require('../lib/redis/redisClient');

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { sendToKafka } from '../lib/kafka/producer';
import kafka from '../lib/kafka/kafkaClient';

const serviceRoute = '/events';

interface WebSocketMap {
  [client_id: string]: WebSocket;
}

const socketClients: WebSocketMap = {};

const kafka_event_topic_name = config.get('services.kafka.event_topic');
const kafka_result_topic_name = config.get('services.kafka.result_topic');

async function sendToQueue(data: any, clientId: string) {
  const event_id = uuidv4();

  const eventToSend = {
    type: 'event_accepted',
    event_id: event_id,
    client_id: clientId,
    status: 'Event accepted',
    created_at: `${new Date().toISOString()}`,
    data: data,
  };

  await sendToKafka(kafka_event_topic_name, eventToSend);

  return eventToSend;
}

async function sendToSocketClient(message: any, partition: number) {
  const payload = JSON.parse(message.value!.toString());
  const socket = socketClients[payload.client_id];

  if (socket && socket.readyState === 1) {
    socket.send(
      JSON.stringify({
        type: 'processed_finished',
        payload: payload,
        finished_at: `${new Date().toISOString()}`,
      }),
    );
    console.log(`sendToSocketClient partition ${partition}, offset ${message.offset}`);
    await redis.set(`client:${payload.client_id}:partition:${partition}:offset`, message.offset);
  }
}

async function consumeKafkaMessagesForClient(clientId: string) {
  const consumer = kafka.consumer({ groupId: `client-${clientId}` });
  await consumer.connect();
  await consumer.subscribe({ topic: kafka_result_topic_name, fromBeginning: false });

  // Wait for partition assignment
  consumer.on(consumer.events.GROUP_JOIN, async (e) => {
    var previousSession = await redis.get(`client:${clientId}:connectedAt`);
    var savedOffset;
    if (previousSession) {
      // Seek for each assigned partition
      for (const assignment of e.payload.memberAssignment[kafka_result_topic_name]) {
        savedOffset = (await redis.get(`client:${clientId}:partition:${assignment}:offset`)) || 0;
        savedOffset = (Number(savedOffset) + 1).toString();
        console.log(`Seeking to offset ${savedOffset} on partition ${assignment}`);
        await consumer.seek({
          topic: kafka_result_topic_name,
          partition: assignment,
          offset: savedOffset,
        });
      }
    }
  });

  await consumer.run({
    eachMessage: async ({ message, partition }) => sendToSocketClient(message, partition),
  });
}

const websocketHandler: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(serviceRoute, { websocket: true }, async (socket: any, req: any) => {
    const clientId = req.query.clientId;
    console.log(`clientId: ${clientId}`);
    if (clientId === undefined) {
      console.error('I am error');
      socket.send(
        JSON.stringify({
          type: 'reject',
          data: "clientId not present in the request parameter use '<url>?clientId=<your-client-id>'",
        }),
      );
      socket.close();
    }

    fastify.log.info(`Client connected: ${clientId}`);

    socketClients[clientId] = socket;

    await redis.set(`client:${clientId}:connectedAt`, `${new Date().toISOString()}`);
    const lastOffset = (await redis.get(`client:${clientId}:offset`)) || 0;

    // Start Kafka consumer with this offset
    await consumeKafkaMessagesForClient(clientId);

    socket.on('message', async (payload: string) => {
      try {
        const json = JSON.parse(payload.toString());
        switch (json.type) {
          case 'event':
            const acceptedEvent = await sendToQueue(json.data, clientId);
            socket.send(JSON.stringify(acceptedEvent));
            break;
          default:
            // unknown message type
            socket.send(JSON.stringify({ type: 'reject', data: 'wrong type' }));
            break;
        }
      } catch (error: any) {
        // handle the error
        socket.send(JSON.stringify({ type: 'error', data: error.message }));
      }
    });
  });
};

// Export handler and Kafka result router
export default websocketHandler;
