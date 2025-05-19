const Redis = require('ioredis');
const config = require('config');

const redis_url = config.get('services.redis.url');
const redis_port = config.get('services.redis.port');

const redisClient = new Redis({ host: redis_url, port: redis_port }); // Regular commands
const redisSubscriber = new Redis({ host: redis_url, port: redis_port }); // Subscriber connection
const redisPublisher = new Redis({ host: redis_url, port: redis_port }); // Subscriber connection

redisClient.on('connect', () => console.log('Connected to Redis (command client)'));
redisSubscriber.on('connect', () => console.log('Connected to Redis (subscriber client)'));
redisPublisher.on('connect', () => console.log('Connected to Redis (publisher client)'));

export { redisClient, redisSubscriber, redisPublisher };
