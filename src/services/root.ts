module.exports = async function (fastify: any, opts: any) {
  fastify.get('/', async function (request: any, reply: any) {
    return { message: 'Root url for NimbusWS!', timeStamp: fastify.timestamp() };
  });
};
