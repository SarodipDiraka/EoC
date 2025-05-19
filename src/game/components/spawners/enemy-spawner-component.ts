import Phaser from 'phaser';
import { EventBusComponent } from '../events/event-bus-component';
import { SpawnManager } from '@/game/managers/spawn-manager';
import { SpawnerConfig, EnemyClass, EnemyInterface } from '@/game/types/interfaces';
import { CUSTOM_EVENTS } from '@/game/types/custom-events';

export class EnemySpawnerComponent {
    private scene: Phaser.Scene;
    private enemyClass: EnemyClass;
    private group: Phaser.Physics.Arcade.Group;
    private eventBus: EventBusComponent;
    
    private spawnTimer?: Phaser.Time.TimerEvent;
    private activeConfig?: SpawnerConfig;
    private spawnCounter = 0;
    private isActive = false;
    private cleanupTimer?: Phaser.Time.TimerEvent;

    constructor(
        scene: Phaser.Scene,
        enemyClass: EnemyClass,
        eventBusComponent: EventBusComponent,
    ) {
        this.enemyClass = enemyClass;
        this.scene = scene;
        this.eventBus = eventBusComponent;

        this.group = this.scene.physics.add.group({
            classType: enemyClass,
            runChildUpdate: true,
            createCallback: (enemy: Phaser.GameObjects.GameObject) => {
                (enemy as EnemyInterface).init(eventBusComponent);
            }
        }) as Phaser.Physics.Arcade.Group;

        this.setupEventListeners();

        this.cleanupTimer = this.scene.time.addEvent({
            delay: 1000,
            callback: this.cleanupOffscreenEnemies,
            callbackScope: this,
            loop: true
        });
    }

    private setupEventListeners(): void {
        this.eventBus.on(CUSTOM_EVENTS.START_SPAWNER, this.handleStartSpawner, this);
        this.eventBus.on(CUSTOM_EVENTS.STOP_ALL_SPAWNERS, this.stopSpawning, this);
        this.eventBus.on(CUSTOM_EVENTS.GAME_OVER, this.handlePause, this);
        this.eventBus.on(CUSTOM_EVENTS.PAUSE_GAME, this.handlePause, this);
        this.eventBus.on(CUSTOM_EVENTS.RESUME_GAME, this.handleResume, this);
        this.eventBus.on(CUSTOM_EVENTS.RESET_ALL_SPAWNERS, this.resetSpawner, this);
    }

    private handleStartSpawner(config: SpawnerConfig): void {
        if (config.enemyType !== this.enemyClass.enemyType) {
            return;
        }

        this.activeConfig = config;
        this.spawnCounter = 0;
        this.startSpawning();
    }

    private startSpawning(): void {
        this.stopSpawning();
        this.isActive = true;

        this.spawnTimer = this.scene.time.addEvent({
            delay: this.activeConfig?.interval ?? 2000,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        this.spawnEnemy();
    }

    private spawnEnemy(): void {
        if (!this.isActive || !this.activeConfig) return;

        const groupSize = this.activeConfig.groupSize;
        const remaining = this.activeConfig.count ? this.activeConfig.count - this.spawnCounter : Infinity;

        if (remaining <= 0) {
            this.stopSpawning();
            return;
        }

        const currentGroupSize = Math.min(groupSize, remaining);
        const positions = SpawnManager.getSpawnPositions(
            this.activeConfig.patternType,
            this.activeConfig.patternParams.params,
            currentGroupSize
        );

        for (const pos of positions) {
            let enemy = this.group.get(pos.x, pos.y) as EnemyInterface;
            if (!enemy) {
                enemy = new this.enemyClass(this.scene, pos.x, pos.y) as EnemyInterface;
                this.group.add(enemy);
                enemy.init(this.eventBus);
            } else {
                enemy.reset();
            }
            this.spawnCounter++;
        }

        if (this.activeConfig.count && this.spawnCounter >= this.activeConfig.count) {
            this.stopSpawning();
        }
    }

    private resetSpawner(): void {
        this.stopSpawning();
        this.spawnCounter = 0;
        this.activeConfig = undefined;
    }

    private cleanupOffscreenEnemies(): void {
        const worldBounds = this.scene.physics.world.bounds;
        const margin = 100;
        
        this.group.getChildren().forEach((enemy: Phaser.GameObjects.GameObject) => {
            const sprite = enemy as Phaser.Physics.Arcade.Sprite;
            
            if (sprite.y > worldBounds.height + margin || 
                sprite.y < -margin ||
                sprite.x < -margin || 
                sprite.x > worldBounds.width + margin) {
                
                sprite.destroy();
            }
        });
    }

    private stopSpawning(): void {
        if (this.spawnTimer) {
            this.spawnTimer.destroy();
            this.spawnTimer = undefined;
        }
        this.isActive = false;
    }

    private handlePause(): void {
        if (this.spawnTimer) {
            this.spawnTimer.paused = true;
        }
    }

    private handleResume(): void {
        if (this.spawnTimer) {
            this.spawnTimer.paused = false;
        }
    }

    public cleanup(): void {
        this.stopSpawning();

        this.eventBus.off(CUSTOM_EVENTS.START_SPAWNER, this.handleStartSpawner, this);
        this.eventBus.off(CUSTOM_EVENTS.STOP_ALL_SPAWNERS, this.stopSpawning, this);
        this.eventBus.off(CUSTOM_EVENTS.GAME_OVER, this.stopSpawning, this);
        this.eventBus.off(CUSTOM_EVENTS.PAUSE_GAME, this.handlePause, this);
        this.eventBus.off(CUSTOM_EVENTS.RESUME_GAME, this.handleResume, this);
        this.cleanupTimer?.destroy();
    }

    get phaserGroup(): Phaser.Physics.Arcade.Group {
        return this.group;
    }
}