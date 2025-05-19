import Phaser from 'phaser';
import { EventBusComponent } from '../events/event-bus-component';
import { CUSTOM_EVENTS } from '@/game/types/custom-events';

interface EnemyDestroyedParams {
    x: number;
    y: number;
    shipAssetKey: string;
    shipDestroyedAnimationKey: string;
}

export class EnemyDestroyedComponent {
    private scene: Phaser.Scene;
    private group: Phaser.GameObjects.Group;
    private eventBusComponent: EventBusComponent;

    constructor(scene: Phaser.Scene, eventBusComponent: EventBusComponent) {
        this.scene = scene;
        this.eventBusComponent = eventBusComponent;

        this.group = this.scene.add.group({
            name: `${this.constructor.name}-${Phaser.Math.RND.uuid()}`,
            classType: Phaser.GameObjects.Sprite
        });

        this.eventBusComponent.on(
            CUSTOM_EVENTS.ENEMY_DESTROYED, 
            (enemy: EnemyDestroyedParams) => {
                const gameObject = this.group.get(
                    enemy.x, 
                    enemy.y, 
                    enemy.shipAssetKey
                ) as Phaser.GameObjects.Sprite;
                
                if (gameObject) {
                    gameObject.play(enemy.shipDestroyedAnimationKey);
                }
            }
        );
    }
}
