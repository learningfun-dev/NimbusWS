const config = require('config');
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { SocketService } from '../../services/eventsService';
import { redisSubscriber } from '../../lib/redis/redisClient';

const kafkaEventTopic = config.get('services.kafka.approach3.event_topic');
const kafkaResultTopic = config.get('services.kafka.approach3.result_topic');
const redisPubsubChannel = config.get('services.redis.pubSubMessageChannel');
const socketClients: { [clientId: string]: WebSocket } = {};

const serviceRoute = '/events';

console.log(`redisPubsubChannel= ${redisPubsubChannel}`);
const socketService = new SocketService({
  kafkaEventTopic,
  kafkaResultTopic,
  redisPubsubChannel,
  socketClients,
});

const websocketHandler: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(serviceRoute, { websocket: true }, async (socket: any, req: any) => {
    const clientId = req.query.clientId;
    console.log(`clientId: ${clientId}`);
    if (clientId === undefined) {
      socket.send(
        JSON.stringify({
          type: 'reject',
          data: "clientId is missing. Use '<url>?clientId=<your-client-id>'",
        }),
      );
      socket.close();
      return;
    }

    await socketService.registerSocket(clientId, socket);

    redisSubscriber.on('message', async (channel: any, message: any) => {
      await socketService.handleRedisPubSubMessage(channel, message);
    });

    // Start Redis PubSub listener
    redisSubscriber.subscribe(redisPubsubChannel, () => {
      fastify.log.info('Subscribed to Redis Pub/Sub');
    });

    socket.on('message', (msg: string) => {
      socketService.handleWebSocketMessage(msg, clientId, socket);
    });
  });
};
export default websocketHandler;
