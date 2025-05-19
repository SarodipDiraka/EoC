import Phaser from 'phaser';
import { EventBus } from '../event-bus';
import { LevelConfig  } from '../types/interfaces';
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
    public levelsCount: number;

    constructor(scene: Phaser.Scene, levels: LevelConfig[]) {
        this.scene = scene;
        this.levels = levels;
        this.levelsCount = levels.length
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
        EventBus.emit(CUSTOM_EVENTS.RESET_ALL_SPAWNERS);
        
        const waveConfig = this.levels[this.currentLevel].waves[this.currentWave];
        
        console.log(`Starting wave ${this.currentWave + 1} of level ${this.currentLevel + 1}`);

        waveConfig.spawners.forEach(spawnerConfig => {
            EventBus.emit(CUSTOM_EVENTS.START_SPAWNER, spawnerConfig);
        });

        this.waveTimer = this.scene.time.delayedCall(waveConfig.duration, () => {
            this.endWave(waveConfig.delayAfter);
        });
    }

    private endWave(delayAfter: number) {
        EventBus.emit(CUSTOM_EVENTS.STOP_ALL_SPAWNERS);

        if (this.currentWave < this.levels[this.currentLevel].waves.length - 1) {
            this.currentWave++;
            this.scene.time.delayedCall(delayAfter, this.startWave, [], this);
        } else {
            this.scene.time.delayedCall(delayAfter, this.startBossFight, [], this);
        }
    }

    private startBossFight() {
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