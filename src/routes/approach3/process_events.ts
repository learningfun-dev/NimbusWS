/*
  This is a dummy WebSocket endpoint designed to simulate the system behavior after an event is processed. 
  Once the event is handled, a new message is sent to the "results" Kafka stream. 
  The results are then delivered back to the WebSocket client from which the original event originated.
*/

const config = require('config');
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { handleWebSocketMessage, startKafkaSharedConsumer } from '../../services/processEventsService';

const serviceRoute = '/process_events';

const kafka_result_topic_name = config.get('services.kafka.approach3.result_topic');
const redisPubsubChannel = config.get('services.redis.pubSubMessageChannel');

const websocketHandler: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(serviceRoute, { websocket: true }, async (socket: any, req: any) => {
    await startKafkaSharedConsumer(kafka_result_topic_name, redisPubsubChannel);
    socket.on('message', async (payload: string) => {
      const response = await handleWebSocketMessage(payload, kafka_result_topic_name);
      socket.send(response);
    });
  });
};

// Export handler and Kafka result router
export default websocketHandler;
