import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { env } from '../config/env';
import { MessagePublisher } from './publisher';

export class SnsPublisher implements MessagePublisher {
  private client: SNSClient;
  constructor(private topicArn: string) {
    this.client = new SNSClient({
      region: env.events.region,
      endpoint: env.events.awsEndpoint,
    });
  }

  async publish(type: string, payload: unknown): Promise<void> {
    await this.client.send(new PublishCommand({
      TopicArn: this.topicArn,
      Message: JSON.stringify(payload),
      MessageAttributes: { type: { DataType: 'String', StringValue: type } },
    }));
  }
}

export function buildPublisher(): MessagePublisher {
  if (env.events.enabled && env.events.snsTopicArn) {
    return new SnsPublisher(env.events.snsTopicArn);
  }
  // disabled or unconfigured → noop
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { NoopPublisher } = require('./publisher');
  return new NoopPublisher();
}
