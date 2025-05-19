import Phaser from 'phaser';
import { EventBusComponent } from '../components/events/event-bus-component';
import { ITEMS_CONFIG, ItemConfig } from '../configs/items-config';
import { BossPhase, ItemType } from '../types/interfaces';
import { BaseItem } from '../entities/items/base-item';
import { ScoreItem } from '../entities/items/score-item';
import { PowerItem } from '../entities/items/power-item';
import { HealthItem } from '../entities/items/health-item';
import { BombItem } from '../entities/items/bomb-item';
import { CUSTOM_EVENTS } from '../types/custom-events';
import { Player } from '../entities/player';
import { BossEnemy } from '../entities/enemies/bosses/base-boss';

export class ItemManager {
    private scene: Phaser.Scene;
    private eventBus: EventBusComponent;
    private itemsGroup: Phaser.Physics.Arcade.Group;
    private player: Player;
    private enemyKillCount: number = 0;
    private lastDropCount: number = 0;

    constructor(scene: Phaser.Scene, eventBus: EventBusComponent, player: Player) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.player = player;
        
        this.itemsGroup = this.scene.physics.add.group({
            classType: Phaser.GameObjects.Sprite,
            maxSize: 20,
            runChildUpdate: true // Важно: для автоматического вызова update у предметов
        });
        
        this.setupEventListeners();
        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    }

    private setupEventListeners(): void {
        this.eventBus.on('ENEMY_DESTROYED', this.handleEnemyDestroyed, this);
        this.eventBus.on('BOSS_PHASE_CHANGE', this.handleBossPhaseChange, this);
        this.eventBus.on(CUSTOM_EVENTS.BOSS_DEFEATED, this.handleBossPhaseChange, this);
    }

    private update(): void {
        if (!this.itemsGroup) return;
        
        this.itemsGroup.getChildren().forEach((item: Phaser.GameObjects.GameObject) => {
            const sprite = item as Phaser.Physics.Arcade.Sprite;
            
            if (!sprite.active) return;
            
            if (sprite.y > this.scene.scale.height + 50) {
                sprite.destroy();
                return;
            }
            
            if (this.player.canPickup(sprite)) {
                const baseItem = sprite as unknown as BaseItem;
                baseItem.onCollect(this.player);
                sprite.destroy();
            }
        });
    }

    // Метод для очистки всех предметов
    public clearAllItems(): void {
        if (!this.itemsGroup || this.itemsGroup.scene?.scene.isPaused()) return;
        const children = this.itemsGroup.getChildren().slice();
        children.forEach(child => {
            if (child instanceof Phaser.GameObjects.GameObject) {
                child.destroy(true);
            }
        });
        this.itemsGroup.clear(true, true);
    }

    private handleEnemyDestroyed = (enemy: any): void => {
        this.enemyKillCount++;
        
        // Проверяем, есть ли у врага специфичный дроп
        if (enemy.dropConfig) {
            this.tryDropSpecificItems(enemy);
            return;
        }

        // Проверяем глобальный дроп
        this.tryDropGlobalItems(enemy.x, enemy.y);
    };

    private tryDropSpecificItems(enemy: any): void {
        enemy.dropConfig.items.forEach((item: any) => {
            if (Phaser.Math.FloatBetween(0, 1) <= item.chance) {
                this.dropItem(item.type, enemy.x, enemy.y);
            }
        });
    }

    private tryDropGlobalItems(x: number, y: number): void {
        // Проверяем гарантированный дроп
        for (const [type, config] of Object.entries(ITEMS_CONFIG) as [ItemType, ItemConfig][]) {
            if (this.enemyKillCount - this.lastDropCount >= config.guaranteedDropEvery) {
                this.dropItem(type, x, y);
                this.lastDropCount = this.enemyKillCount;
                return;
            }
        }

        // Проверяем случайный дроп
        for (const [type, config] of Object.entries(ITEMS_CONFIG) as [ItemType, ItemConfig][]) {
            if (this.enemyKillCount - this.lastDropCount >= config.minDropInterval && 
                Phaser.Math.FloatBetween(0, 1) <= config.dropChance) {
                this.dropItem(type, x, y);
                this.lastDropCount = this.enemyKillCount;
                break;
            }
        }
    }

    private handleBossPhaseChange = (boss: BossEnemy): void => {
        // Получаем предыдущую фазу
        const previousPhaseIndex = boss.currentPhaseIndex - 1;
        const phases = boss['_phases'];
        const previousPhaseData = phases[previousPhaseIndex];
        
        // Очищаем предыдущие предметы
        this.clearAllItems();
        
        // Если фаза имеет свой дроп
        if (previousPhaseData.dropItems) {
            this.dropBossPhaseItems(boss, previousPhaseData);
        } else {
            // Стандартный дроп (если не указано иное)
            this.dropDefaultBossItems(boss);
        }
    };

    private dropBossPhaseItems(boss: BossEnemy, phase: BossPhase): void {
        const centerX = boss.x;
        const centerY = boss.y - 100;
        
        // Угловой сдвиг для каждого типа предметов
        let typeAngleOffset = 0;
        
        phase.dropItems?.forEach(config => {
            for (let i = 0; i < config.count; i++) {
                const angle = (i / config.count) * Math.PI * 2 + typeAngleOffset;
                const x = centerX + Math.cos(angle) * config.spread;
                const y = centerY + Math.sin(angle) * config.spread;
                this.dropItem(config.type, x, y);
            }
            
            // Сдвигаем угол для следующего типа предметов
            typeAngleOffset += Math.PI / (phase.dropItems?.length || 1);
        });
    }

    private dropDefaultBossItems(boss: BossEnemy): void {
        const centerX = boss.x;
        const centerY = boss.y - 100;
        const spread = 60;
        
        // Разные углы для разных типов предметов
        const dropConfigs = [
            { type: 'SCORE' as ItemType, count: 5, angleOffset: 0 },
            { type: 'POWER' as ItemType, count: 5, angleOffset: Math.PI/5 }
        ];
        
        dropConfigs.forEach(config => {
            for (let i = 0; i < config.count; i++) {
                const angle = (i / config.count) * Math.PI * 2 + config.angleOffset;
                const x = centerX + Math.cos(angle) * spread;
                const y = centerY + Math.sin(angle) * spread;
                this.dropItem(config.type, x, y);
            }
        });
    }

    private dropItem(type: ItemType, x: number, y: number): void {
        let item: BaseItem;
        
        switch (type) {
            case 'SCORE':
                item = new ScoreItem(this.scene, x, y);
                break;
            case 'POWER':
                item = new PowerItem(this.scene, x, y);
                break;
            case 'HEALTH':
                item = new HealthItem(this.scene, x, y);
                break;
            case 'BOMB':
                item = new BombItem(this.scene, x, y);
                break;
            default:
                return;
        }
        
        item.init(this.eventBus);
        this.itemsGroup.add(item);
    }

    public cleanup(): void {
        this.clearAllItems();
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
        this.eventBus.off(CUSTOM_EVENTS.ENEMY_DESTROYED, this.handleEnemyDestroyed, this);
        this.eventBus.off(CUSTOM_EVENTS.BOSS_PHASE_CHANGE, this.handleBossPhaseChange, this);
        this.eventBus.off(CUSTOM_EVENTS.BOSS_DEFEATED, this.handleBossPhaseChange, this);
        
        if (this.itemsGroup) {
            this.itemsGroup.destroy();
            this.itemsGroup = null!;
        }
    }
}