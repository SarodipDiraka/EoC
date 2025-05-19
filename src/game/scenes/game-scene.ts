import Phaser from 'phaser';
import { Player } from '../entities/player';
import { EventBus } from '../event-bus';
import { EnemyDestroyedComponent } from '../components/spawners/enemy-destroyed-component';
import { Score } from '../entities/ui/score';
import { Lives } from '../entities/ui/lives';
import { LevelManager } from '../managers/level-manager';
import { LevelConfig } from '../types/interfaces';
import { levels } from '../configs/game-config';
import { CUSTOM_EVENTS } from '../types/custom-events';
import { FighterEnemy } from '../entities/enemies/common/fighter-enemy';
import { ScoutEnemy } from '../entities/enemies/common/scout-enemy';
import { CollisionManager } from '../managers/collision-manager';
import { EnemySpawnerManager } from '../managers/enemy-spawner-manager';
import { Bombs } from '../entities/ui/bombs';
import { Weapons } from '../entities/ui/weapon';
import { FPSDisplay } from '../entities/ui/fps-display';
import { ItemManager } from '../managers/item-manager';
import { CircularFighterEnemy } from '../entities/enemies/common/circular-fighter-enemy';
import { AudioManager } from '../managers/audio-manager';

export class GameScene extends Phaser.Scene {
    private player!: Player;
    private isPaused: boolean = false;
    private pauseKey!: Phaser.Input.Keyboard.Key;
    private backgrounds: Phaser.GameObjects.TileSprite[] = [];
    private livesSystem!: Lives;
    private scoreSystem!: Score;
    private continueCount: number = 0;
    private levelManager!: LevelManager;
    private currentLevel: number;

    private spawnerManager!: EnemySpawnerManager;
    private collisionManager!: CollisionManager;
    private audioManager!: AudioManager;

    private bombCounter!: Bombs;
    private weaponDisplay!: Weapons;
    private fpsDisplay!: FPSDisplay;
    private itemManager!: ItemManager;

    
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        this.cleanup();
        this.isPaused = false;
        this.time.paused = false;
        this.physics.world.resume();

        this.initGameSystems();
        this.initUI();
        this.createBackgrounds();

        this.input.keyboard?.removeKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.pauseKey.reset();

        const levels: LevelConfig[] = this.createLevels();
        this.levelManager = new LevelManager(this, levels);
        
        this.setupEventListeners();

        this.time.delayedCall(1000, () => {
            EventBus.emit(CUSTOM_EVENTS.PLAYER_READY);
        });

        this.currentLevel = 0;

        EventBus.emit('current-scene-ready', this);
        EventBus.emit(CUSTOM_EVENTS.WEAPON_CHANGED, { weaponType: 1 });
        EventBus.emit(CUSTOM_EVENTS.POWER_CHANGED, 0);
    }

    private createLevels(): LevelConfig[] {
        return levels;
    }

    private createBackgrounds(): void {
        this.audioManager.playMusic('bg');
        // Удаляем старые фоны, если они есть
        this.backgrounds.forEach(bg => bg.destroy());
        this.backgrounds = [];

        // Создаем несколько слоев фона с разной скоростью для параллакс-эффекта
        const bgConfigs = [
            { key: 'bg1', speed: 0.5, alpha: 0.7, scale: 1.25 },
            { key: 'bg2', speed: 1.0, alpha: 0.7, scale: 1.25 },
            { key: 'bg3', speed: 1.5, alpha: 0.7, scale: 1.25 }
        ];

        bgConfigs.forEach((bg, index) => {
            // Создаем TileSprite вместо обычного Sprite
            const background = this.add.tileSprite(
                0, // x
                0, // y
                this.scale.width, // ширина
                this.scale.height, // высота
                bg.key // ключ текстуры
            );

            background
                .setOrigin(0, 0)
                .setAlpha(bg.alpha)
                .setScale(bg.scale)
                .setDepth(-10 + index);

            this.backgrounds.push(background);
        });
    }

    private setupEventListeners(): void {
        EventBus.on(CUSTOM_EVENTS.LEVEL_COMPLETE, this.handleLevelComplete, this);
        EventBus.on(CUSTOM_EVENTS.PLAYER_READY, this.startLevel, this);
        EventBus.on(CUSTOM_EVENTS.GAME_OVER, this.handleGameOver, this);
        EventBus.on(CUSTOM_EVENTS.RESTART_GAME, this.restartGame, this);
        EventBus.on(CUSTOM_EVENTS.CONTINUE_GAME, this.continueGame, this);
        EventBus.on(CUSTOM_EVENTS.CLEANUP_GAME, this.cleanup, this)
    }

    private initGameSystems(): void {
        this.player = new Player(this, EventBus);
        this.registry.set('player', this.player);
        
        this.spawnerManager = new EnemySpawnerManager(this, EventBus);
        this.initializeSpawners();
        
        new EnemyDestroyedComponent(this, EventBus);
        this.itemManager = new ItemManager(this, EventBus, this.player);
        this.audioManager = new AudioManager(this, EventBus);
    }

    private startLevel = () => {
        console.log(`[GameScene] Starting level ${this.currentLevel + 1}`);
        this.levelManager.startLevel(this.currentLevel);
    };

    private handleLevelComplete = (data: { level: number }) => {
        if (data.level + 1 < this.levelManager.levelsCount) {

            this.time.delayedCall(3000, () => {
                // Переход на следующий уровень
                this.scene.launch('LevelComplete', {
                    level: data.level,
                    lives: this.livesSystem.livesCount
                });
            });
            
            this.time.delayedCall(9000, () => {
                this.prepareNextLevel(data.level + 1);
            });
        } else {
            // Финальная победа
            EventBus.emit(CUSTOM_EVENTS.GAME_COMPLETE);
            this.scene.launch('Victory', { 
                score: this.registry.get('score'),
                lives: this.livesSystem.livesCount 
            });
        }
    };

    private prepareNextLevel(nextLevel: number) {
        // Очистка текущего уровня
        this.cleanupLevel();
        
        this.initializeSpawners();

        // Запуск нового уровня
        this.currentLevel = nextLevel;
        this.startLevel();
    }

    private cleanupLevel() {
        // Уничтожение всех врагов и пуль
        this.spawnerManager.getAllSpawners().forEach(spawner => spawner.cleanup());
        this.itemManager?.clearAllItems();
    }

    private initializeSpawners() {
        this.cleanupLevel();
        this.spawnerManager.cleanup();

        if (this.collisionManager) {
            this.collisionManager.cleanup();
        }
        
        const enemyTypes = [
            { type: 'scout', class: ScoutEnemy },
            { type: 'fighter', class: FighterEnemy },
            { type: 'circular_fighter', class: CircularFighterEnemy }
        ];
        
        enemyTypes.forEach(({ type, class: enemyClass }) => {
            this.spawnerManager.registerSpawner(type, enemyClass);
        });
        
        this.collisionManager = new CollisionManager(this, this.player, this.spawnerManager, EventBus);
        this.collisionManager.setupBaseCollisions();
    }

    private handleGameOver = () => {
        this.time.delayedCall(500, () => {
            this.physics.world.pause();
            this.time.paused = true;
            this.scene.launch('GameOver', { score: this.registry.get('score') });
            this.scene.pause();
        });
    };

    private initUI(): void {
        this.scoreSystem = new Score(this, EventBus);
        this.livesSystem = new Lives(this, EventBus);
        this.bombCounter = new Bombs(this, EventBus);
        this.weaponDisplay = new Weapons(this, EventBus);
        this.fpsDisplay = new FPSDisplay(this, 470, 630);
    }

    update() {
        if (!this.scene.isActive() || this.isGameplayBlocked()) {
            return;
        }

        // Обновляем положение фона (прокрутка)
        this.backgrounds.forEach((bg, index) => {
            // Прокручиваем фон с разной скоростью для параллакс-эффекта
            const speed = [0.5, 1.0, 1.5][index] || 1.0;
            bg.tilePositionY -= speed;
        });

        if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
            this.togglePause();
        }

        this.fpsDisplay.update();
        
        this.registry.set('player', this.player);
    }

    private isGameplayBlocked(): boolean {
        return this.scene.isActive('LevelComplete') || 
            this.scene.isActive('Victory') || 
            this.scene.isActive('PauseMenu');
    }

    private togglePause(): void {
        if (this.isGameplayBlocked()) return;
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.pauseGame();
        } else {
            this.resumeGame();
        }
    }

    private pauseGame(): void {
        // Приостанавливаем физику и таймеры
        this.physics.world.pause();
        this.time.paused = true;
        
        // Запускаем сцену паузы
        this.scene.launch('PauseMenu', { 
            onResume: () => this.resumeGame(),
            onRestart: () => this.restartGame(),
            onMainMenu: () => this.returnToMainMenu()
        });
        
        // Приостанавливаем текущую сцену
        this.scene.pause();
    }

    private resumeGame(): void {
        // Возобновляем физику и таймеры
        this.physics.world.resume();
        this.time.paused = false;
        
        // Закрываем меню паузы
        if (this.scene.isActive('PauseMenu')) {
            this.scene.stop('PauseMenu');
        }
        
        // Возобновляем текущую сцену
        this.scene.resume();
        this.isPaused = false;
    }

    private restartGame(): void {
        this.scene.stop('PauseMenu');
        this.scene.stop('GameOver');
        this.cleanup();
        this.scene.restart();
    }

    private returnToMainMenu(): void {
        this.cleanup();
        this.scene.stop('PauseMenu');
        this.scene.stop('GameScene');
        this.scene.start('MainMenu');
    }

    public continueGame() {
        // Сбрасываем жизни
        if (this.livesSystem) {
            this.livesSystem.resetLives();
        }
        
        // Обнуляем счет + добавляем количество продолжений
        if(this.continueCount < 9)
        {
            this.continueCount++;
        }
        if (this.scoreSystem) {
            this.scoreSystem.resetScore(this.continueCount);
        }

        EventBus.emit(CUSTOM_EVENTS.PLAYER_SPAWN);
        EventBus.emit(CUSTOM_EVENTS.RESUME_GAME);
        
        this.cameras.main.fadeIn(300);

        this.physics.world.resume();
        this.time.paused = false;
        
        if (this.scene.isActive('GameOver')) {
            this.scene.stop('GameOver');
        }
        
        this.scene.resume();
        this.isPaused = false;
    }

    private cleanup() {
        this.sound.stopAll();
        this.audioManager?.destroy();

        this.itemManager?.clearAllItems();
        this.itemManager?.cleanup();
        
        this.levelManager?.cleanup();

        this.collisionManager?.cleanup();
    
        this.spawnerManager?.cleanup();
        
        if (this.player) {
            this.player?.weapon?.cleanup();
            this.player.cleanup();
        }

        this.bombCounter?.destroy();
        this.weaponDisplay?.destroy();

        this.physics.world.shutdown();

        if (this.scoreSystem) {
            this.scoreSystem.destroy();
            this.scoreSystem = new Score(this, EventBus);
        }

        if (this.livesSystem) {
            this.livesSystem.destroy();
            this.livesSystem = new Lives(this, EventBus);
        }

        this.backgrounds.forEach(bg => bg.destroy());
        this.backgrounds = [];

        EventBus.off(CUSTOM_EVENTS.LEVEL_COMPLETE, this.handleLevelComplete, this);
        EventBus.off(CUSTOM_EVENTS.PLAYER_READY, this.startLevel, this);
        EventBus.off(CUSTOM_EVENTS.GAME_OVER, this.handleGameOver, this);
        EventBus.off(CUSTOM_EVENTS.RESTART_GAME, this.restartGame, this);
        EventBus.off(CUSTOM_EVENTS.CONTINUE_GAME, this.continueGame, this);
    }
}