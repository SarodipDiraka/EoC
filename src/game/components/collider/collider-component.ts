import { HealthComponent } from '../health/health-component';  
import { EventBusComponent } from '../events/event-bus-component';
import { CUSTOM_EVENTS } from '@/game/types/custom-events';

export class ColliderComponent {  
  private healthComponent: HealthComponent;  
  private eventBusComponent: EventBusComponent;  

  constructor(healthComponent: HealthComponent, eventBusComponent: EventBusComponent) {  
    this.healthComponent = healthComponent;  
    this.eventBusComponent = eventBusComponent;  
  }  

  collideWithEnemyShip(): void {  
    if (this.healthComponent.isDead) {  
      return;  
    }  
    this.healthComponent.die();  
  }  

  collideWithEnemyProjectile(damage = 1): void {  
    if (this.healthComponent.isDead) return;  
    this.healthComponent.hit(damage);  
    this.eventBusComponent.emit(CUSTOM_EVENTS.SHIP_HIT);  
  }    
}  
