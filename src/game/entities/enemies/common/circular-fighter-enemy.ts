import Phaser from 'phaser';
import { HorizontalMovementComponent } from '@/game/components/movement/horizontal-movement-component';
import { VerticalMovementComponent } from '@/game/components/movement/vertical-movement-component';
import { BulletSpawnerComponent } from '@/game/components/weapon/bullet-spawner-component';
import { EventBusComponent } from '@/game/components/events/event-bus-component';
import * as CONFIG from '@/game/configs/game-config';
import { BaseEnemy } from '@/game/entities/enemies/base-enemy';
import { CUSTOM_EVENTS } from '@/game/types/custom-events';
import { CircularFighterInputComponent } from '@/game/components/input/ai/common/circular-fighter-input-component';

export class CircularFighterEnemy extends BaseEnemy {
    static enemyType = 'circular_fighter';
    
    private _inputComponent!: CircularFighterInputComponent;
    private _horizontalMovement!: HorizontalMovementComponent;
    private _verticalMovement!: VerticalMovementComponent;
    private _shipSprite!: Phaser.GameObjects.Sprite;
    private _engineSprite!: Phaser.GameObjects.Sprite;
    
    private _waveCenterX: number = 0;
    private _waveCenterY: number = 0;
    private _stopDistance: number = CONFIG.CIRCULAR_FIGHTER_STOP_DISTANCE;
    private _shootInterval: number = CONFIG.CIRCULAR_FIGHTER_SHOOT_INTERVAL;
    private _shootCounter: number = 0;
    private _maxShoots: number = CONFIG.CIRCULAR_FIGHTER_SHOOT_CYCLES;
    private _currentTargetAngle: number = 0;
    private _isMovingOut: boolean = false;
    private _shootingEvent?: Phaser.Time.TimerEvent;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        this.initSprites();
    }

    init(eventBus: EventBusComponent): void {
        super.init(eventBus);
        
        this._inputComponent = new CircularFighterInputComponent();

        this._horizontalMovement = new HorizontalMovementComponent(
            this,
            this._inputComponent,
            CONFIG.CIRCULAR_FIGHTER_MOVEMENT_VELOCITY
        );

        this._verticalMovement = new VerticalMovementComponent(
            this,
            this._inputComponent,
            CONFIG.CIRCULAR_FIGHTER_MOVEMENT_VELOCITY
        );
        
        this._bulletSpawner = new BulletSpawnerComponent(
            this.scene,
            this,
            'red_rice',
            100
        );

        this._dropConfig = {
            items: [
                { type: 'POWER', chance: 0.4 },
                { type: 'SCORE', chance: 0.4 }
            ]
        };

        this.setWaveParams();

        eventBus.emit(CUSTOM_EVENTS.ENEMY_INIT, this);
    }

    setWaveParams(): void {
        this._waveCenterX = 240;
        this._waveCenterY = 340;
        this._isMovingOut = false;
        this._shootCounter = 0;
        this._shootingEvent?.destroy();
    }

    protected initSprites(): void {
        this._shipSprite = this.scene.add.sprite(0, 0, 'fighter', 0);
        this._engineSprite = this.scene.add.sprite(0, 0, 'fighter_engine')
            .setFlipY(true)
            .play('fighter_engine');
        
        this.add([this._engineSprite, this._shipSprite]);
    }

    protected getInitialHealth(): number {
        return CONFIG.ENEMY_FIGHTER_HEALTH;
    }

    protected customUpdate(time: number, delta: number): void {
        this.updateMovement(time);
        this._inputComponent.update(time, delta);
        this._horizontalMovement.update();
        this._verticalMovement.update();
        
        if (this._isMovingOut) {
            this.checkBounds();
        }
    }

    private updateMovement(time: number): void {
        if (this._isMovingOut) return;

        const distanceToCenter = Phaser.Math.Distance.Between(
            this.x, this.y, 
            this._waveCenterX, this._waveCenterY
        );

        // Движение к центру
        if (distanceToCenter > this._stopDistance) {
            const angle = Phaser.Math.Angle.Between(
                this.x, this.y,
                this._waveCenterX, this._waveCenterY
            );
            this._inputComponent.setMovementAngle(angle);
        } 
        // Достигли центра - начинаем стрельбу
        else if (this._shootCounter === 0) {
            this._inputComponent.resetMovement(); // Останавливаем движение
            this.startShootingBehavior(time);
        }
    }

    private startShootingBehavior(time: number): void {
        this.updateShootingTarget(time);
        
        this._shootingEvent = this.scene.time.addEvent({
            delay: CONFIG.CIRCULAR_FIGHTER_BULLET_INTERVAL,
            callback: () => {
                if (!this.active || this._isMovingOut) return;
                this.fireAtAngle(this._currentTargetAngle);
            },
            callbackScope: this,
            loop: true
        });
    }

    private updateShootingTarget(time: number): void {
        const player = this.getPlayer();
        if (player) {
            this._currentTargetAngle = Phaser.Math.Angle.Between(
                this.x, this.y,
                player.x, player.y
            );
        }
        
        this._inputComponent.setShootTarget(this._currentTargetAngle, true);
        this._shootCounter++;
        
        if (this._shootCounter >= this._maxShoots) {
            this.startMovingOut();
        } else {
            this.scene.time.delayedCall(this._shootInterval, () => {
                this.updateShootingTarget(time);
            });
        }
    }

    private startMovingOut(): void {
        this._isMovingOut = true;
        this._shootingEvent?.destroy();
        
        const angle = Phaser.Math.Angle.Between(
            this._waveCenterX, this._waveCenterY,
            this.x, this.y
        );
        this._inputComponent.setMovementAngle(angle);
        this._inputComponent.setShootTarget(0, false);
    }

    private fireAtAngle(angle: number): void {
        if (!this._bulletSpawner) return;
        
        // Основная пуля (прямо в цель)
        const mainDirection = new Phaser.Math.Vector2(
            Math.cos(angle),
            Math.sin(angle)
        );
        
        // Левая пуля
        const leftDirection = new Phaser.Math.Vector2(
            Math.cos(angle - Phaser.Math.DegToRad(20)),
            Math.sin(angle - Phaser.Math.DegToRad(20))
        );
        
        // Правая пуля
        const rightDirection = new Phaser.Math.Vector2(
            Math.cos(angle + Phaser.Math.DegToRad(20)),
            Math.sin(angle + Phaser.Math.DegToRad(20))
        );
        
        // Спавним все три пули
        this._bulletSpawner.spawn({
            directions: [mainDirection, leftDirection, rightDirection],
            speed: CONFIG.CIRCULAR_FIGHTER_BULLET_SPEED,
            lifespan: CONFIG.CIRCULAR_FIGHTER_BULLET_LIFESPAN,
            size: { width: 6, height: 10 },
            flipY: true,
            scale: 1.1,
            spawnPosition: { 
                x: this.x, 
                y: this.y + 10
            }
        });
        
        this._eventBusComponent.emit(CUSTOM_EVENTS.SHIP_SHOOT);
    }

    private getPlayer(): Phaser.GameObjects.Sprite | null {
        try {
            return this.scene.registry.get('player') as Phaser.GameObjects.Sprite;
        } catch {
            return null;
        }
    }

    private checkBounds(): void {
        const { width, height } = this.scene.scale;
        const margin = 100;
        
        if (this.x < -margin || this.x > width + margin || 
            this.y < -margin || this.y > height + margin) {
            this.destroy();
        }
    }

    destroy(fromScene?: boolean): void {
        this._shootingEvent?.destroy();
        if (this._bulletSpawner) {
            this._bulletSpawner.cleanup();
        }
        this._engineSprite.destroy(fromScene);
        super.destroy(fromScene);
    }

    get shipAssetKey(): string { return 'fighter'; }
    get shipDestroyedAnimationKey(): string { return 'fighter_destroy'; }
}