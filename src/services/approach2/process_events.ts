/*
  This is a dummy WebSocket endpoint designed to simulate the system behavior after an event is processed. 
  Once the event is handled, a new message is sent to the "results" Kafka stream. 
  The results are then delivered back to the WebSocket client from which the original event originated.
*/

const config = require('config');
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { sendToKafka } from '../../lib/kafka/producer';

const serviceRoute = '/process_events';

const kafka_result_topic_name = config.get('services.kafka.approach2.result_topic');

const websocketHandler: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(serviceRoute, { websocket: true }, (socket: any, req: any) => {
    socket.on('message', async (payload: string) => {
      try {
        const json = JSON.parse(payload.toString());
        switch (json.type) {
          case 'event_accepted':
            const dummy_result = {
              type: 'event_processed_successfully',
              event_id: json.event_id,
              client_id: json.client_id,
              payload: json,
              status: 'Event Processed Successfully',
              completed_at: `${new Date().toISOString()}`,
            };
            await sendToKafka(kafka_result_topic_name, dummy_result);
            socket.send(JSON.stringify(dummy_result));
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
