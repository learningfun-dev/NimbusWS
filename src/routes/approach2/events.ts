const config = require('config');
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { SocketService } from '../../services/eventsService';

const kafkaEventTopic = config.get('services.kafka.approach2.event_topic');
const kafkaResultTopic = config.get('services.kafka.approach2.result_topic');
const socketClients: { [clientId: string]: WebSocket } = {};

const serviceRoute = '/events';

const socketService = new SocketService({
  kafkaEventTopic,
  kafkaResultTopic,
  redisPubsubChannel: '',
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
    await socketService.registerKafkaConsumerForClient(clientId);

    socket.on('message', (msg: string) => {
      socketService.handleWebSocketMessage(msg, clientId, socket);
    });
  });
};
export default websocketHandler;
