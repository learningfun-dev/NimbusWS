module.exports = async function (fastify: any, opts: any) {
  fastify.get('/', async function (request: any, reply: any) {
    return { message: 'Approach3 root url', timeStamp: fastify.timestamp() };
  });
};
