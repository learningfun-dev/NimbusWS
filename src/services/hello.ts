import { v4 as uuidv4 } from 'uuid';

module.exports = async function (fastify: any, opts: any) {
  fastify.get('/hello', async function (request: any, reply: any) {
    const client_id = uuidv4();
    return { message: 'Hello NimbusWS!', timeStamp: fastify.timestamp(), client_id: `client_${client_id}` };
  });
};
