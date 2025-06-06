import { EventBusComponent } from "../components/events/event-bus-component";
import { BaseEnemy } from "../entities/enemies/base-enemy";
import { BossEnemy } from "../entities/enemies/bosses/base-boss";
import { FighterEnemy } from "../entities/enemies/common/fighter-enemy";
import { Player } from "../entities/player";
import { EventBus } from "../event-bus";
import { CUSTOM_EVENTS } from "../types/custom-events";
import { HomingBulletData } from "../types/interfaces";
import { EnemySpawnerManager } from "./enemy-spawner-manager";
import * as CONFIG from '@/game/configs/game-config';
import { ItemManager } from "./item-manager";
import { BaseItem } from "../entities/items/base-item";
import { ScoutEnemy } from "../entities/enemies/common/scout-enemy";

export class CollisionManager {
    private scene: Phaser.Scene;
    private player: Player;
    private spawnerManager: EnemySpawnerManager;
    private eventBus: EventBusComponent;
    private laserDamageTimer: number = 0;
    private readonly LASER_DAMAGE_COOLDOWN: number = CONFIG.PLAYER_WEAPON_CONFIG.laser.fireRate;
    private bossLaserHandlers: Map<BossEnemy, Function> = new Map();
    private bossHomingHandlers: Map<BossEnemy, Function> = new Map();
    private activeBoss: BossEnemy | null = null;
    private colliders: Phaser.Physics.Arcade.Collider[] = []; // массив для хранения коллайдеров
    private isActive = true;
    private currentHomingGroup: Phaser.Physics.Arcade.Group | null = null;

    constructor(scene: Phaser.Scene, player: Player, 
                spawnerManager: EnemySpawnerManager, eventBus: EventBusComponent) {
        this.scene = scene;
        this.player = player;
        this.spawnerManager = spawnerManager;
        this.eventBus = eventBus;

        this.currentHomingGroup = this.player.weapon.getHomingBulletGroup();

        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.eventBus.on(CUSTOM_EVENTS.ENEMY_INIT, this.setupEnemyCollisions, this);
        this.eventBus.on(CUSTOM_EVENTS.BOSS_INIT, this.setupBossCollisions, this);
        this.eventBus.on(CUSTOM_EVENTS.BOSS_DEFEATED, this.cleanupDefeatedBossHandlers, this);
        this.eventBus.on(CUSTOM_EVENTS.WEAPON_POWER_CHANGED, this.handleWeaponPowerChange, this);
        this.eventBus.on(CUSTOM_EVENTS.PLAYER_BOMB_ACTIVATED, this.handleBombBulletClear, this);
        this.eventBus.on(CUSTOM_EVENTS.PLAYER_BOMB_DAMAGE_TICK, this.handleBombDamageTick, this);
    }

    private handleBombBulletClear = (): void => {
        // Удаляем все пули противников
        this.spawnerManager.getAllSpawners().forEach(spawner => {
            spawner.phaserGroup.getChildren().forEach(enemy => {
                const baseEnemy = enemy as BaseEnemy;
                // Безопасная проверка через геттер
                baseEnemy.bulletSpawner?.bulletClear();
            });
        });

        // Удаляем все пули босса
        if (this.activeBoss?.bulletSpawner) {
            this.activeBoss.bulletSpawner.bulletClear();
        }
    };

    private handleBombDamageTick = (): void => {
        this.handleBombBulletClear();
        // Наносим урон всем врагам на экране
        const camera = this.scene.cameras.main;
        // Наносим урон обычным врагам
        this.spawnerManager.getAllSpawners().forEach(spawner => {
            spawner.phaserGroup.getChildren().forEach(enemy => {
                const sprite = enemy as Phaser.Physics.Arcade.Sprite;
                if (sprite.active && camera.worldView.contains(sprite.x, sprite.y)) {
                    const baseEnemy = enemy as BaseEnemy;
                    baseEnemy.colliderComponent.collideWithEnemyProjectile(
                        CONFIG.PLAYER_BOMB_CONFIG.damage
                    );
                }
            });
        });

        // Урон боссу
        if (this.activeBoss?.active) {
            const bossSprite = this.activeBoss as unknown as Phaser.Physics.Arcade.Sprite;
            if (camera.worldView.contains(bossSprite.x, bossSprite.y)) {
                this.activeBoss.colliderComponent.collideWithEnemyProjectile(
                    CONFIG.PLAYER_BOMB_CONFIG.damage
                );
                this.eventBus.emit(CUSTOM_EVENTS.BOSS_HEALTH_CHANGE);
            }
        }
    };

    private handleWeaponPowerChange = (data: { 
        oldLevel: number, 
        newLevel: number, 
        homingGroup: Phaser.Physics.Arcade.Group 
    }) => {
        this.currentHomingGroup = this.player.weapon.getHomingBulletGroup();
    };

    public setupBaseCollisions(): void {
        if (!this.scene || !this.scene.physics.world) {
            return;
        }
        const enemyGroups = this.spawnerManager.getAllSpawners()
            .map(spawner => spawner.phaserGroup);

        this.colliders.push(
            // Player vs Enemies
            this.scene.physics.add.overlap(
                this.player,
                enemyGroups,
                this.handlePlayerEnemyCollision
            ),

            // Player bullets vs Enemies
            this.scene.physics.add.overlap(
                enemyGroups,
                this.player.weaponGroup,
                this.handlePlayerBulletHit
            ),

            // Homing bullets vs Enemies
            this.scene.physics.add.overlap(
                enemyGroups,
                this.currentHomingGroup,
                this.handleHomingBulletHit
            )
        );

        // Добавляем проверку лазера в update
        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.updateLaserCollisions, this);

        // Регистрируем обновление homing-пуль
        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.updateHomingBullets, this);
    }

    private setupEnemyCollisions = (enemy: BaseEnemy): void => {
        if ((enemy instanceof ScoutEnemy)) return;

        this.colliders.push(
            this.scene.physics.add.overlap(
                this.player,
                enemy.bulletSpawner.getGroup(),
                (playerObj, bulletObj) => {
                    if (!playerObj.active || !bulletObj.active) return;
                    
                    enemy.bulletSpawner.destroyBullet(bulletObj);
                    const player = playerObj as Player;
                    
                    if (!player.isInvulnerable) {
                        player.collider.collideWithEnemyProjectile();
                    }
                }
            )
        );
    };

    private setupBossCollisions = (boss: BossEnemy): void => {
        this.cleanupDefeatedBossHandlers(boss);

        this.activeBoss = boss;
        // Body collision
        this.colliders.push(
            this.scene.physics.add.overlap(
                this.player,
                boss,
                (playerObj, bossObj) => {
                    const player = playerObj as Player;
                    const boss = bossObj as BossEnemy;
                    
                    if (!boss.healthComponent.isDead && !player.isInvulnerable) {
                        player.collider.collideWithEnemyShip();
                    }
                }
            ),

            // Boss bullets
            this.scene.physics.add.overlap(
                this.player,
                boss.bulletSpawner.getGroup(),
                (playerObj, bulletObj) => {
                    bulletObj.destroy();
                    const player = playerObj as Player;
                    
                    if (!player.isInvulnerable) {
                        player.collider.collideWithEnemyProjectile();
                    }
                }
            ),

            // Player bullets vs Boss
            this.scene.physics.add.overlap(
                boss,
                this.player.weaponGroup,
                (bossObj, bulletObj) => {
                    const boss = bossObj as BossEnemy;
                    const bullet = bulletObj as Phaser.Physics.Arcade.Sprite;

                    this.player.weapon.destroyBullet(bullet);

                    if (!boss.isInvulnerable()) {
                        const damage = bullet.getData('damage') || 1;
                        boss.colliderComponent.collideWithEnemyProjectile(damage);
                        this.eventBus.emit(CUSTOM_EVENTS.ENEMY_HIT);
                        this.eventBus.emit(CUSTOM_EVENTS.BOSS_HEALTH_CHANGE);
                    }
                }
            )
        );

        // Лазер vs Босс
        const laserHandler = () => {
            if (!this.player?.weapon?.isLaserActive?.() || boss.isInvulnerable() || boss.healthComponent.isDead) return;
            
            const weapon = this.player.weapon;
            const laserRect = weapon.laserHitArea;
            const bossRect = boss.getBounds();
            
            if (this.checkLaserBossCollision(laserRect, bossRect)) {
                boss.colliderComponent.collideWithEnemyProjectile(weapon.laserDamagePerTick);
                this.eventBus.emit(CUSTOM_EVENTS.ENEMY_HIT);
                this.eventBus.emit(CUSTOM_EVENTS.BOSS_HEALTH_CHANGE);
            }
        };

        this.scene.events.on(Phaser.Scenes.Events.UPDATE, laserHandler);
        this.bossLaserHandlers.set(boss, laserHandler);

        // 4. Коллизия homing-пуль игрока с боссом
        this.colliders.push(
            this.scene.physics.add.overlap(
                boss,
                this.currentHomingGroup,
                (bossObj, bulletObj) => {
                    const boss = bossObj as BossEnemy;
                    const bullet = bulletObj as Phaser.Physics.Arcade.Sprite;

                    if (!boss.isInvulnerable()) {
                        const damage = bullet.getData('damage') || 2; // Урон homing-пуль
                        boss.colliderComponent.collideWithEnemyProjectile(damage);
                        this.eventBus.emit(CUSTOM_EVENTS.ENEMY_HIT);
                        this.eventBus.emit(CUSTOM_EVENTS.BOSS_HEALTH_CHANGE);
                    }
                    
                    bullet.disableBody(true, true); // Возвращаем пулю в пул
                }
            )
        );

        // 5. Обновление homing-пуль
        const homingHandler = () => {
            this.updateHomingBullets();
        };

        this.scene.events.on(Phaser.Scenes.Events.UPDATE, homingHandler);
        this.bossHomingHandlers.set(boss, homingHandler);

    };

    private checkLaserBossCollision(laserRect: Phaser.Geom.Rectangle, bossRect: Phaser.Geom.Rectangle): boolean {
        // Более точная проверка коллизии
        return laserRect.right > bossRect.left && 
               laserRect.left < bossRect.right &&
               laserRect.bottom > bossRect.top;
    }

    private cleanupDefeatedBossHandlers = (boss: BossEnemy): void => {
        this.activeBoss = null;
        this.cleanupBossLaserHandler(boss);
        this.cleanupBossHomingHandler(boss);
    };

    private cleanupBossLaserHandler(boss: BossEnemy): void {
        const handler = this.bossLaserHandlers.get(boss);
        if (handler) {
            this.scene.events.off(Phaser.Scenes.Events.UPDATE, handler);
            this.bossLaserHandlers.delete(boss);
        }
    }

    private cleanupBossHomingHandler(boss: BossEnemy): void {
        const handler = this.bossHomingHandlers.get(boss);
        if (handler) {
            this.scene.events.off(Phaser.Scenes.Events.UPDATE, handler);
            this.bossHomingHandlers.delete(boss);
        }
    }

    private handlePlayerEnemyCollision = (playerObj: unknown, enemyObj: unknown) => {
        const player = playerObj as Player;
        const enemy = enemyObj as BaseEnemy;

        if (!player.active || !enemy.active || player.isInvulnerable) return;

        player.collider.collideWithEnemyShip();
        enemy.colliderComponent.collideWithEnemyShip();
    };

    private handlePlayerBulletHit = (enemyObj: unknown, bulletObj: unknown) => {
        const enemy = enemyObj as BaseEnemy;
        const bullet = bulletObj as Phaser.Physics.Arcade.Sprite;

        if (!enemy.active || !bullet.active) return;

        const damage = bullet.getData('damage') || 1;
        this.player.weapon.destroyBullet(bullet);
        enemy.colliderComponent.collideWithEnemyProjectile(damage);
        EventBus.emit(CUSTOM_EVENTS.ENEMY_HIT);
    };

    private updateLaserCollisions = (time: number, delta: number): void => {
        if (!this.player.weapon.isLaserActive()) return;
        
        this.laserDamageTimer += delta;
        if (this.laserDamageTimer >= this.LASER_DAMAGE_COOLDOWN) {
            this.handleLaserCollisions();
            this.laserDamageTimer = 0;
        }
    };

    private handleLaserCollisions = (): void => {
        const weapon = this.player.weapon;
        if (!weapon.isLaserActive()) return;

        const laserHitArea = weapon.laserHitArea;
        const damage = weapon.laserDamagePerTick;
        
        // Проверка с обычными врагами
        const enemyGroups = this.spawnerManager.getAllSpawners()
            .map(spawner => spawner.phaserGroup);

        enemyGroups.forEach(group => {
            group.getChildren().forEach(enemy => {
                const sprite = enemy as Phaser.Physics.Arcade.Sprite;
                if (!sprite.active) return;
                
                if (laserHitArea.contains(sprite.x, sprite.y)) {
                    const enemyObj = sprite as unknown as BaseEnemy;
                    enemyObj.colliderComponent.collideWithEnemyProjectile(damage);
                    this.eventBus.emit(CUSTOM_EVENTS.ENEMY_HIT);
                }
            });
        });
    };

    private updateHomingBullets(): void {
        if (!this.isActive || !this.scene?.scene?.isActive()) return;
        const homingBullets = this.currentHomingGroup;
        if (!homingBullets || !homingBullets.getChildren) {
            return;
        }

        if (!homingBullets.scene?.scene?.isActive()) {
            this.currentHomingGroup = this.player.weapon.getHomingBulletGroup();
            return;
        }

        homingBullets.getChildren().forEach(bullet => {
            const sprite = bullet as Phaser.Physics.Arcade.Sprite;
            if (!sprite.active || !sprite.body) return;
            
            const homingData = sprite.getData('homingData') as HomingBulletData;
            homingData.delay -= this.scene.game.loop.delta;
            
            if (homingData.delay <= 0) {
                if (!homingData.target || !homingData.target.active) {
                    homingData.target = this.findNearestTarget(sprite);
                }
                
                if (homingData.target?.active) {
                    this.updateHomingBehavior(
                        sprite,
                        homingData.target,
                        homingData.turnRate,
                        homingData.speed
                    );
                }
                else{
                    const angleToTop = Phaser.Math.Angle.Between(
                        sprite.x, sprite.y,
                        sprite.x, -100
                    );
                    
                    const currentMoveAngle = Math.atan2(
                        (sprite.body as Phaser.Physics.Arcade.Body).velocity.y,
                        (sprite.body as Phaser.Physics.Arcade.Body).velocity.x
                    );
                    
                    const newMoveAngle = Phaser.Math.Angle.RotateTo(
                        currentMoveAngle, 
                        angleToTop, 
                        homingData.turnRate
                    );
                    
                    sprite.body?.velocity.set(
                        Math.cos(newMoveAngle) * homingData.speed,
                        Math.sin(newMoveAngle) * homingData.speed
                    );
                    
                    sprite.setRotation(newMoveAngle + Math.PI/2);
                }
            }
        });
    }

    private findNearestTarget(bullet: Phaser.Physics.Arcade.Sprite): Phaser.Physics.Arcade.Sprite | null {
        let nearestTarget: Phaser.Physics.Arcade.Sprite | null = null;
        let minDistance = Infinity;
        
        // 1. Проверяем активного босса (явное приведение типа)
        if (this.activeBoss?.active) {
            const bossSprite = this.activeBoss as unknown as Phaser.Physics.Arcade.Sprite;
            const distance = Phaser.Math.Distance.Between(
                bullet.x, bullet.y,
                bossSprite.x, bossSprite.y
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearestTarget = bossSprite;
            }
        }
        
        // 2. Проверяем обычных врагов
        this.spawnerManager.getAllSpawners().forEach(spawner => {
            spawner.phaserGroup.getChildren().forEach(enemy => {
                const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
                if (!enemySprite.active) return;
                
                const distance = Phaser.Math.Distance.Between(
                    bullet.x, bullet.y,
                    enemySprite.x, enemySprite.y
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestTarget = enemySprite;
                }
            });
        });
        
        return nearestTarget;
    }

    private handleHomingBulletHit = (enemyObj: unknown, bulletObj: unknown): void => {
        if (!this.scene?.scene?.isActive()) return;
        const homingGroup = this.currentHomingGroup;
        if (!homingGroup) {
            return;
        }

        const enemy = enemyObj as BaseEnemy;
        const bullet = bulletObj as Phaser.Physics.Arcade.Sprite;

        if (!enemy.active || !bullet.active) return;

        const damage = bullet.getData('damage') || 1;
        bullet.disableBody(true, true);
        enemy.colliderComponent.collideWithEnemyProjectile(damage);
        this.eventBus.emit(CUSTOM_EVENTS.ENEMY_HIT);
    };

    private updateHomingBehavior(
        bullet: Phaser.Physics.Arcade.Sprite,
        target: Phaser.Physics.Arcade.Sprite,
        turnRate: number,
        speed: number
    ): void {
        const angleToTarget = Phaser.Math.Angle.Between(
            bullet.x, bullet.y,
            target.x, target.y
        );
        
        // Текущий угол движения пули (не спрайта!)
        const currentMoveAngle = Math.atan2(
            (bullet.body as Phaser.Physics.Arcade.Body).velocity.y,
            (bullet.body as Phaser.Physics.Arcade.Body).velocity.x
        );
        
        // Плавный поворот к цели
        const newMoveAngle = Phaser.Math.Angle.RotateTo(
            currentMoveAngle, 
            angleToTarget, 
            turnRate
        );
        
        // Обновляем velocity
        (bullet.body as Phaser.Physics.Arcade.Body).velocity.set(
            Math.cos(newMoveAngle) * speed,
            Math.sin(newMoveAngle) * speed
        );
        
        // Поворачиваем спрайт в направлении движения
        bullet.setRotation(newMoveAngle + Math.PI/2); // +90° для правильной ориентации
    }

    cleanup(): void {
        this.isActive = false;
        
        // Удаление коллайдеров
        this.colliders.forEach(collider => {
            collider.destroy();
        });
        this.colliders = [];

        // Очищаем все обработчики лазера
        this.bossLaserHandlers.forEach((handler, boss) => {
            this.cleanupBossLaserHandler(boss);
        });
        
        // Очищаем все обработчики homing-пуль
        this.bossHomingHandlers.forEach((handler, boss) => {
            this.cleanupBossHomingHandler(boss);
        });
        
        this.bossLaserHandlers.clear();
        this.bossHomingHandlers.clear();

        // Очистка основного обработчика
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateLaserCollisions, this);
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateHomingBullets, this);

        // Отписываемся от событий
        this.eventBus.off(CUSTOM_EVENTS.ENEMY_INIT, this.setupEnemyCollisions, this);
        this.eventBus.off(CUSTOM_EVENTS.BOSS_INIT, this.setupBossCollisions, this);
        this.eventBus.off(CUSTOM_EVENTS.BOSS_DEFEATED, this.cleanupDefeatedBossHandlers, this);
        this.eventBus.off(CUSTOM_EVENTS.WEAPON_POWER_CHANGED, this.handleWeaponPowerChange, this);

        this.activeBoss = null;
    }

}