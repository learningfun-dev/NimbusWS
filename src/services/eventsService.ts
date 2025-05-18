import { v4 as uuidv4 } from 'uuid';
import { sendToKafka } from '../lib/kafka/producer';
import { KafkaMessage } from 'kafkajs';
import { redisClient } from '../lib/redis/redisClient';
import kafkaClient from '../lib/kafka/kafkaClient';

interface ISocketClients {
  [clientId: string]: WebSocket;
}

interface ISocketServiceDeps {
  kafkaEventTopic: string;
  kafkaResultTopic: string;
  redisPubsubChannel: string;
  socketClients: ISocketClients;
}

export class SocketService {
  private kafkaEventTopic: string;
  private kafkaResultTopic: string;
  private redisPubsubChannel: string;
  private socketClients: ISocketClients;

  constructor({ kafkaEventTopic, kafkaResultTopic, redisPubsubChannel, socketClients }: ISocketServiceDeps) {
    this.kafkaEventTopic = kafkaEventTopic;
    this.kafkaResultTopic = kafkaResultTopic;
    this.redisPubsubChannel = redisPubsubChannel;
    this.socketClients = socketClients;
  }

  public async registerSocket(clientId: string, socket: WebSocket): Promise<void> {
    await redisClient.set(`client:${clientId}:connectedAt`, new Date().toISOString());
    this.socketClients[clientId] = socket;
  }

  public async handleWebSocketMessage(payload: string, clientId: string, socket: WebSocket): Promise<void> {
    try {
      const message = JSON.parse(payload);
      if (message.type === 'event') {
        const eventId = uuidv4();
        const event = {
          type: 'event_accepted',
          event_id: eventId,
          client_id: clientId,
          status: 'Event accepted',
          created_at: new Date().toISOString(),
          data: message.data,
        };
        await sendToKafka(this.kafkaEventTopic, event);
        socket.send(JSON.stringify(event));
      } else {
        socket.send(JSON.stringify({ type: 'reject', data: 'Unknown message type' }));
      }
    } catch (error: any) {
      socket.send(JSON.stringify({ type: 'error', data: error.message }));
    }
  }

  public async handleRedisPubSubMessage(channel: string, message: string): Promise<void> {
    console.log(
      `Redis sub message recived, channel: ${channel} this.redisPubsubChannel = ${this.redisPubsubChannel}, type of: ${typeof this}`,
    );
    console.dir(message, { depth: null });

    if (channel !== this.redisPubsubChannel) return;

    const payload = JSON.parse(message);
    const socket = this.socketClients[payload.client_id];

    if (socket && socket.readyState === 1) {
      socket.send(
        JSON.stringify({
          type: 'processed_finished',
          payload,
          finished_at: `${new Date().toISOString()}`,
        }),
      );

      // Save offset for resume
      if (payload.kafka_offset !== undefined) {
        await redisClient.set(`client:${payload.client_id}:offset`, payload.kafka_offset);
      }
    }
  }

  public async registerKafkaConsumerForClient(clientId: string): Promise<void> {
    const consumer = kafkaClient.consumer({ groupId: `client-${clientId}` });
    await consumer.connect();
    await consumer.subscribe({ topic: this.kafkaResultTopic, fromBeginning: false });

    consumer.on(consumer.events.GROUP_JOIN, async (e: any) => {
      const previousSession = await redisClient.get(`client:${clientId}:connectedAt`);
      if (previousSession) {
        for (const partition of e.payload.memberAssignment[this.kafkaResultTopic]) {
          const savedOffset = await redisClient.get(`client:${clientId}:partition:${partition}:offset`);
          if (savedOffset) {
            await consumer.seek({
              topic: this.kafkaResultTopic,
              partition,
              offset: (Number(savedOffset) + 1).toString(),
            });
          }
        }
      }
    });

    await consumer.run({
      eachMessage: async ({ message, partition }: { message: KafkaMessage; partition: number }) => {
        const payload = JSON.parse(message.value!.toString());
        const socket = this.socketClients[payload.client_id];
        if (socket?.readyState === 1) {
          socket.send(
            JSON.stringify({
              type: 'processed_finished',
              payload,
              finished_at: new Date().toISOString(),
            }),
          );
          await redisClient.set(`client:${payload.client_id}:partition:${partition}:offset`, message.offset);
        }
      },
    });
  }
}
