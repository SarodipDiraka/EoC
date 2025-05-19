import Phaser from 'phaser';
import { CUSTOM_EVENTS } from '@/game/types/custom-events';
import { ColliderComponent } from '@/game/components/collider/collider-component';
import { EventBusComponent } from '@/game/components/events/event-bus-component';
import { HealthComponent } from '@/game/components/health/health-component';
import { BulletSpawnerComponent } from '@/game/components/weapon/bullet-spawner-component';
import { EnemyDropConfig } from '@/game/types/interfaces';

export abstract class BaseEnemy extends Phaser.GameObjects.Container {
    protected _isInitialized: boolean = false;
    protected _healthComponent!: HealthComponent;
    protected _colliderComponent!: ColliderComponent;
    protected _eventBusComponent!: EventBusComponent;
    protected _bulletSpawner: BulletSpawnerComponent | null = null;
    protected _dropConfig: EnemyDropConfig | null = null;

    constructor(
        scene: Phaser.Scene, 
        x: number, 
        y: number,
    ) {
        super(scene, x, y, []);
        
        this.initPhysics();
        this.initSprites();
        scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
        this.setDepth(5);
    }

    protected initPhysics(): void {
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);
        
        if (this.body instanceof Phaser.Physics.Arcade.Body) {
            this.body.setSize(24, 24).setOffset(-12, -12);
        }
    }

    init(eventBus: EventBusComponent, ...args: any[]): void {
        if (!this.body) throw new Error('Physics body missing');
        
        this._eventBusComponent = eventBus;
        this._healthComponent = new HealthComponent(this.getInitialHealth());
        this._colliderComponent = new ColliderComponent(this._healthComponent, eventBus);
        
        this._isInitialized = true;
    }

    reset(): void {
        if (!this.body) return;
        if (this.body && this.body instanceof Phaser.Physics.Arcade.Body) {
            this.body.enable = true;
            this.body.checkCollision.none = false;
            this.body.setVelocity(0);
        }
        
        this.setActive(true).setVisible(true);
        this._healthComponent.reset();
    }

    update(time: number, delta: number): void {
        if (!this._isInitialized || !this.active || !this.body) return;

        if (this._healthComponent.isDead) {
            this.handleDeath();
            return;
        }

        this.customUpdate(time, delta);
    }

    destroy(fromScene?: boolean): void {
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
        super.destroy(fromScene);
    }

    // Абстрактные методы для реализации в дочерних классах
    protected abstract getInitialHealth(): number;
    protected abstract customUpdate(time: number, delta: number): void;
    protected abstract initSprites(): void

    // Общие геттеры
    get healthComponent(): HealthComponent { return this._healthComponent; }
    get colliderComponent(): ColliderComponent { return this._colliderComponent; }
        // Добавляем геттер с проверкой
    get bulletSpawner(): BulletSpawnerComponent | null {
        return this._bulletSpawner
            ? this._bulletSpawner 
            : null;
    }

    get dropConfig(): EnemyDropConfig | null {
        return this._dropConfig;
    }

    protected handleDeath(): void {
        this.setActive(false).setVisible(false);
        if (this.body && this.body instanceof Phaser.Physics.Arcade.Body) {
            this.body.enable = false;
            this.body.checkCollision.none = true;
            this.body.stop();
        }
        this._eventBusComponent.emit(CUSTOM_EVENTS.ENEMY_DESTROYED, this);
    }
}