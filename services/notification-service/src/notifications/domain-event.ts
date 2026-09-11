export interface DomainEvent {
  eventId: string
  eventType: string
  data: Record<string, unknown>
}

export class InvalidDomainEventError extends Error {}

export function validateDomainEvent(value: unknown): asserts value is DomainEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidDomainEventError('Invalid event envelope')
  }
  const event = value as Partial<DomainEvent>
  if (typeof event.eventId !== 'string' || !event.eventId.trim() ||
      typeof event.eventType !== 'string' || !event.eventType.trim() ||
      !event.data || typeof event.data !== 'object' || Array.isArray(event.data)) {
    throw new InvalidDomainEventError('Invalid event envelope')
  }
  const recipient = event.data.recipientId ?? event.data.receiverId
  if (recipient != null && (typeof recipient !== 'string' || !recipient.trim())) {
    throw new InvalidDomainEventError('Invalid event recipient')
  }
}
