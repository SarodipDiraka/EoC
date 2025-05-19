import { Events } from 'phaser';
import { CUSTOM_EVENTS } from '@/game/types/custom-events';

class CustomEventBus extends Events.EventEmitter {
    constructor() {
        super();
        Object.assign(this, CUSTOM_EVENTS);
    }
    
}

export const EventBus = new CustomEventBus();