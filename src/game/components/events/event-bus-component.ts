import { CustomEvents } from '@/game/types/custom-events';
import Phaser from 'phaser';

export class EventBusComponent extends Phaser.Events.EventEmitter {
  constructor() {
    super();
  }

  emit(event: CustomEvents, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  on(event: CustomEvents, fn: Function, context?: unknown): this {
    return super.on(event, fn, context);
  }
}