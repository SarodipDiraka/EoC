import { EventBusComponent } from '@/game/components/events/event-bus-component';
import Phaser from 'phaser';

export abstract class BaseItem extends Phaser.Physics.Arcade.Sprite {
    protected eventBus: EventBusComponent;
    protected velocityY: number = 200; // Скорость падения
    protected graphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, '');
        // Создаем графическое представление
        this.graphics = this.createGraphics();
        this.graphics.setPosition(x, y);
        
        // Добавляем физическое тело
        scene.physics.add.existing(this);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(this.getColliderWidth(), this.getColliderHeight());
        body.setOffset(-this.getColliderWidth()/2, -this.getColliderHeight()/2);
        body.setVelocity(0, this.velocityY);
        body.setAllowGravity(false);
        body.setCollideWorldBounds(false);
        
        this.setDepth(4); // Уровень отрисовки выше врагов, но ниже пуль
    }

    init(eventBus: EventBusComponent): void {
        this.eventBus = eventBus;
        this.scene.add.existing(this.graphics);
    }

    update(): void {
        this.graphics.setPosition(this.x, this.y);
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body.velocity.y !== this.velocityY) {
            body.setVelocityY(this.velocityY);
        }
    }

    abstract onCollect(player: any): void; // Метод будет реализован в дочерних классах
    protected abstract createGraphics(): Phaser.GameObjects.Graphics;
    protected abstract getColliderWidth(): number;
    protected abstract getColliderHeight(): number;

    destroy(fromScene?: boolean) {
        this.graphics.destroy();
        super.destroy(fromScene);
    }
}