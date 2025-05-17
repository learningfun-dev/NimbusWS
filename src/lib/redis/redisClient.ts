const Redis = require('ioredis');
const config = require('config');

const redis_url = config.get('services.redis.url');
const redis_port = config.get('services.redis.port');

const redis = new Redis({ host: redis_url, port: redis_port });

redis.on('connect', () => console.log('Connected to Redis'));
redis.on('error', (err: object) => console.error('Redis error:', err));

module.exports = redis;
