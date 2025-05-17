'use strict';

const fp = require('fastify-plugin');
/* 
Example plugin
*/
module.exports = fp(async (fastify: any, opts: any) => {
  fastify.decorate('timestamp', function () {
    return Date.now();
  });
});
