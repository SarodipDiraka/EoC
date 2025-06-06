import Phaser from 'phaser';
import { EventBus } from '../event-bus';
import { LevelConfig, SpawnerConfig, WaveConfig  } from '../types/interfaces';
import { CUSTOM_EVENTS } from '../types/custom-events';
import { BossEnemy } from '../entities/enemies/bosses/base-boss';
import { FirstBoss } from '../entities/enemies/bosses/first-boss-enemy';
import { Player } from '../entities/player';
import { BossUI } from '../entities/ui/boss-ui';

export class LevelManager {
    private scene: Phaser.Scene;
    private currentLevel = 0;
    private currentWave = 0;
    private levels: LevelConfig[];
    private waveTimer?: Phaser.Time.TimerEvent;
    private currentBoss?: BossEnemy | null;
    private playerRef?: Player;
    private bossUI?: BossUI;
    private enemiesAlive = 0;
    private waveConfig?: WaveConfig;
    public levelsCount: number;
    private hasLimitedSpawners: boolean = false;

    constructor(scene: Phaser.Scene, levels: LevelConfig[]) {
        this.scene = scene;
        this.levels = levels;
        this.levelsCount = levels.length;
        this.setupEventListeners();
        scene.events.once(Phaser.Scenes.Events.CREATE, () => {
            this.playerRef = scene.registry.get('player');
        });
        this.bossUI = new BossUI(this.scene);
    }

    startLevel(levelIndex: number) {
        this.currentLevel = levelIndex;
        this.currentWave = 0;
        this.startWave();
    }

    private startWave() {
        this.waveConfig = this.levels[this.currentLevel].waves[this.currentWave];
        const initialDelay = this.waveConfig.initialDelay || 0;
        
        if (initialDelay > 0) {
            this.scene.time.delayedCall(initialDelay, () => {
                this.startWaveImmediately();
            });
        } else {
            this.startWaveImmediately();
        }
    }

    private startWaveImmediately() {
        EventBus.emit(CUSTOM_EVENTS.RESET_ALL_SPAWNERS);
        this.waveConfig = this.levels[this.currentLevel].waves[this.currentWave];
        
        this.enemiesAlive = 0;
        
        // Проверяем, есть ли спавнеры с ограниченным количеством врагов
        this.hasLimitedSpawners = this.waveConfig.spawners.some(
            (spawner: SpawnerConfig) => spawner.count !== undefined
        );
        
        console.log(`Starting wave ${this.currentWave + 1} of level ${this.currentLevel + 1}`);

        // Подписываемся на события создания и уничтожения врагов
        EventBus.on(CUSTOM_EVENTS.ENEMY_INIT, this.onEnemySpawned, this);
        EventBus.on(CUSTOM_EVENTS.ENEMY_DESTROYED, this.onEnemyDestroyed, this);

        this.waveConfig.spawners.forEach((spawnerConfig: SpawnerConfig) => {
            EventBus.emit(CUSTOM_EVENTS.START_SPAWNER, spawnerConfig);
        });

        this.waveTimer = this.scene.time.delayedCall(this.waveConfig.duration, () => {
            this.endWave(this.waveConfig!.delayAfter);
        });
    }

    private onEnemySpawned() {
        this.enemiesAlive++;
    }

    private onEnemyDestroyed() {
        this.enemiesAlive--;
        
        // Для волн с ограниченным количеством врагов проверяем завершение
        if (this.hasLimitedSpawners && this.enemiesAlive <= 0) {
            this.earlyWaveCompletion();
        }
    }

    private earlyWaveCompletion() {
        // Отменяем текущий таймер волны, если он есть
        if (this.waveTimer) {
            this.waveTimer.destroy();
        }
        // Завершаем волну досрочно
        this.endWave(this.waveConfig!.delayAfter);
    }

    private endWave(delayAfter: number) {
        // Отписываемся от событий врагов
        EventBus.off(CUSTOM_EVENTS.ENEMY_INIT, this.onEnemySpawned, this);
        EventBus.off(CUSTOM_EVENTS.ENEMY_DESTROYED, this.onEnemyDestroyed, this);

        EventBus.emit(CUSTOM_EVENTS.STOP_ALL_SPAWNERS);

        if (this.currentWave < this.levels[this.currentLevel].waves.length - 1) {
            this.currentWave++;
            this.scene.time.delayedCall(delayAfter, this.startWave, [], this);
        } else {
            this.scene.time.delayedCall(delayAfter, this.startBossFight, [], this);
        }
    }

    private startBossFight() {
        EventBus.emit(CUSTOM_EVENTS.RESET_ALL_SPAWNERS);
        const bossConfig = this.levels[this.currentLevel].boss;
        if (!bossConfig) {
            this.levelComplete();
            return;
        }

        this.currentBoss = this.createBoss(bossConfig.enemyType);
        if (!this.currentBoss) return;

        this.currentBoss.init(EventBus, () => this.playerRef);

        if (this.bossUI) {
            this.bossUI.setBoss(this.currentBoss);
        }

        EventBus.emit(CUSTOM_EVENTS.BOSS_INIT, this.currentBoss);
    }

    private createBoss(type: string): BossEnemy | null {
        switch(type) {
            case 'firstBoss': 
                return new FirstBoss(
                    this.scene,
                    this.scene.scale.width / 2,
                    -100
                );
            default: 
                console.error(`Unknown boss type: ${type}`);
                return null;
        }
    }

    private levelComplete() {
        EventBus.emit(CUSTOM_EVENTS.LEVEL_COMPLETE, {
            level: this.currentLevel
        });
    }

    private setupEventListeners() {
        EventBus.on(CUSTOM_EVENTS.BOSS_DEFEATED, () => {
            if (this.bossUI) {
                this.bossUI.destroy();
                this.bossUI = new BossUI(this.scene);
            }
            this.levelComplete();
        });
    }

    cleanup() {
        if (this.waveTimer) {
            this.waveTimer.destroy();
        }
        EventBus.off(CUSTOM_EVENTS.BOSS_DEFEATED);
        if (this.bossUI) {
            this.bossUI.destroy();
        }
    }
}