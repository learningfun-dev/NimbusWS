const config = require('config');
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { sendToKafka } from '../lib/kafka/producer';

const serviceRoute = '/events';

interface WebSocketMap {
  [event_id: string]: WebSocket;
}

const socketClients: WebSocketMap = {};

const kafka_event_topic_name = config.get('services.kafka.event_topic');

async function sendToQueue(socket: any, data: object) {
  const event_id = uuidv4();
  socketClients[event_id] = socket;

  await sendToKafka(kafka_event_topic_name, {
    event_id,
    timestamp: new Date().toISOString(),
    data: data,
  });

  return event_id;
}

const websocketHandler: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(serviceRoute, { websocket: true }, (socket: any, req: any) => {
    socket.on('message', async (payload: string) => {
      try {
        const json = JSON.parse(payload.toString());
        switch (json.type) {
          case 'event':
            const event_id = await sendToQueue(socket, json.data);
            socket.send(
              JSON.stringify({
                type: 'event_accepted',
                event_id: event_id,
                status: 'Event accepted',
                created_at: `${new Date().toISOString()}`,
                data: json.data,
              }),
            );
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

export function handleKafkaResult(result: any): void {
  const { event_id, data } = result;
  const socket = socketClients[event_id];

  if (socket) {
    socket.send(
      JSON.stringify({
        type: 'processed_finished',
        payload: result,
        finished_at: `${new Date().toISOString()}`,
      }),
    );
    delete socketClients[event_id];
  }
}
