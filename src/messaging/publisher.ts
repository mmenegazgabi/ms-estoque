export interface DomainEvent {
  type: string;
  payload: unknown;
}

export interface MessagePublisher {
  publish(type: string, payload: unknown): Promise<void>;
}

export class NoopPublisher implements MessagePublisher {
  public published: DomainEvent[] = [];
  async publish(type: string, payload: unknown): Promise<void> {
    this.published.push({ type, payload });
  }
}
