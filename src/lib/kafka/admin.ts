import { ITopicConfig } from 'kafkajs';
import kafka from './kafkaClient';

const admin = kafka.admin();

const topics_to_create: ITopicConfig[] = [];

export async function createTopic(check_topics: string[]): Promise<void> {
  const existing_topics = await admin.listTopics();

  console.log('existing_topics: ');
  console.dir(existing_topics, { depth: null });

  for (const topic of check_topics) {
    if (!existing_topics.includes(topic)) {
      topics_to_create.push({ topic: topic });
    }
  }

  if (topics_to_create.length > 0) {
    await admin.createTopics({ topics: topics_to_create });
    console.log('Kafka topic created sucessfully');
    const after_topics = await admin.listTopics();
    console.dir(after_topics, { depth: null });
  } else {
    console.log('Kafka topic already exists');
  }
}
