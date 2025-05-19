import Phaser from 'phaser';
import { EventBusComponent } from '../events/event-bus-component';
import { InputComponent } from '../input/input-component';
import { CUSTOM_EVENTS } from '@/game/types/custom-events';
import * as CONFIG from '@/game/configs/game-config';
import { BulletConfig, HomingPrimaryConfig, WeaponPattern } from '@/game/types/interfaces';

export class WeaponComponent {
    private gameObject: Phaser.Physics.Arcade.Sprite;
    private inputComponent: InputComponent;
    private bulletGroup: Phaser.Physics.Arcade.Group;
    private fireTimer = 0;
    private eventBusComponent: EventBusComponent;
    
    private weaponType: 1 | 2 | 3 = 1;
    private bulletConfig: BulletConfig;
    private currentPower = 0;
    private maxPower = 300;
    private cleanupTimer?: Phaser.Time.TimerEvent;
    private isDestroyed = false;

    private laserBeam: Phaser.GameObjects.Graphics | null = null;
    private laserActive: boolean = false;
    private laserWidth: number = 0;
    public laserHitArea: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();
    public laserDamagePerTick: number = 0;
    private laserGlow: Phaser.GameObjects.Graphics | null = null;

    private homingBulletGroup: Phaser.Physics.Arcade.Group;

    private isActive = true;
    private homingPrimaryConfig: HomingPrimaryConfig;

    constructor(
        gameObject: Phaser.Physics.Arcade.Sprite,
        inputComponent: InputComponent,
        eventBusComponent: EventBusComponent,
    ) {
        this.gameObject = gameObject;
        this.inputComponent = inputComponent;
        this.eventBusComponent = eventBusComponent;
        this.bulletConfig = { ...CONFIG.PLAYER_WEAPON_CONFIG.base };
        this.homingPrimaryConfig = { ...CONFIG.PLAYER_WEAPON_CONFIG.homing.primary };

        if (this.bulletGroup) {
            this.destroyGroup(this.bulletGroup);
        }

        if (this.homingBulletGroup) {
            this.destroyGroup(this.homingBulletGroup);
        }

        this.bulletGroup = this.gameObject.scene.physics.add.group({
            name: `player-bullets-${Phaser.Math.RND.uuid()}`,
            classType: Phaser.Physics.Arcade.Sprite,
            maxSize: 200,
            runChildUpdate: false
        });

        this.bulletGroup.createMultiple({
            key: this.bulletConfig.texture,
            quantity: 200,
            active: false,
            visible: false
        });

        this.gameObject.scene.physics.world.on(
            Phaser.Physics.Arcade.Events.WORLD_STEP,
            this.worldStep,
            this
        );

        this.gameObject.once(
            Phaser.GameObjects.Events.DESTROY,
            this.cleanup,
            this
        );

        this.cleanupTimer = this.gameObject.scene.time.addEvent({
            delay: 100,
            callback: this.cleanupOffscreenBullets,
            callbackScope: this,
            loop: true
        });

        // Инициализация лазера
        this.laserBeam = this.gameObject.scene.add.graphics();
        this.laserGlow = this.gameObject.scene.add.graphics();
        this.laserBeam.setDepth(1);
        this.laserGlow.setDepth(0);
        this.laserBeam.setVisible(false);
        this.laserGlow.setVisible(false);


        if (this.homingBulletGroup) {
            this.destroyGroup(this.homingBulletGroup);
        }
        // Группа для наводящихся пуль
        this.homingBulletGroup = this.gameObject.scene.physics.add.group({
            name: `homing-bullets-${Phaser.Math.RND.uuid()}`,
            classType: Phaser.Physics.Arcade.Sprite,
            maxSize: 80,
            runChildUpdate: false
        });

        // Предварительное создание пуль с правильной текстурой
        const homingTexture = CONFIG.PLAYER_WEAPON_CONFIG.homing.homing.texture;
        this.homingBulletGroup.createMultiple({
            key: homingTexture,
            quantity: 80,
            active: false,
            visible: false
        });

        this.eventBusComponent.on(CUSTOM_EVENTS.ADD_POWER, (amount: number) => {
            this.addPower(amount);
        });
    }

    update(delta: number): void {
        this.fireTimer -= delta;
        
        // Обновление лазера
        if (this.weaponType === 2 && this.inputComponent.primaryActionIsDown) {
            this.updateLaser();
        } else if (this.laserActive || !this.inputComponent.primaryActionIsDown) {
            this.deactivateLaser();
        } 

        if (this.fireTimer <= 0 && this.inputComponent.primaryActionIsDown) {
            this.fire();
            this.fireTimer = this.getFireRate();
        }

    }

    private activateLaser(): void {
        if (!this.laserBeam || !this.gameObject.active) return;
        
        const level = this.getPowerLevel();
        this.laserDamagePerTick = CONFIG.PLAYER_WEAPON_CONFIG.laser.damageLevels[level];
        this.laserWidth = CONFIG.PLAYER_WEAPON_CONFIG.laser.widthLevels[level];
        
        this.laserActive = true;
        this.laserBeam.setVisible(true);
        this.eventBusComponent.emit(CUSTOM_EVENTS.SHIP_SHOOT);
    }

    public deactivateLaser(): void {
        if (!this.laserBeam) return;
        
        this.laserActive = false;
        this.laserBeam.clear(); // Очищаем графику
        this.laserGlow?.clear();
        this.laserBeam.setVisible(false);
    }

    private updateLaser(): void {
        if (!this.laserActive || !this.laserBeam || !this.gameObject.active) return;
        
        // Обновляем параметры лазера
        const level = this.getPowerLevel();
        this.laserDamagePerTick = CONFIG.PLAYER_WEAPON_CONFIG.laser.damageLevels[level];
        this.laserWidth = CONFIG.PLAYER_WEAPON_CONFIG.laser.widthLevels[level];
        
        this.drawLaser();
    }

    private drawLaser(): void {
        if (!this.laserBeam || !this.laserGlow) return;
        
        const config = CONFIG.PLAYER_WEAPON_CONFIG.laser;
        const x = this.gameObject.x;
        const y = this.gameObject.y - 20;
        const height = this.gameObject.scene.cameras.main.height;
        const halfWidth = this.laserWidth / 2;
        const time = this.gameObject.scene.time.now;
        
        // Очищаем и перерисовываем с новыми параметрами
        this.laserBeam.clear();
        this.laserGlow.clear();
        
        // 1. Создаем мерцающее свечение (3 слоя)
        const glowAlpha = 0.3 + 0.1 * Math.sin(time * 0.005);
        this.laserGlow.fillStyle(config.colors.glow, glowAlpha);
        
        // Большое свечение
        this.laserGlow.fillRect(
            x - halfWidth * 1.8, 
            y, 
            this.laserWidth * 1.8, 
            -height
        );
        
        // Среднее свечение
        this.laserGlow.fillStyle(config.colors.glow, glowAlpha * 0.7);
        this.laserGlow.fillRect(
            x - halfWidth * 1.4, 
            y, 
            this.laserWidth * 1.4, 
            -height
        );
        
        // Малое свечение
        this.laserGlow.fillStyle(config.colors.glow, glowAlpha * 0.4);
        this.laserGlow.fillRect(
            x - halfWidth, 
            y, 
            this.laserWidth, 
            -height
        );
        
        // 2. Внешняя часть лазера (имитация градиента)
        // Количество слоев для имитации градиента
        const layers = 10; 
        const centerColor = Phaser.Display.Color.ValueToColor(0x00ffff);
        const edgeColor = Phaser.Display.Color.ValueToColor(0x0066ff);

        for (let i = 0; i < layers; i++) {
            const ratio = i / (layers - 1);
            const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                edgeColor,
                centerColor,
                layers,
                i
            );
            
            const width = this.laserWidth * (1 - ratio * 0.6); // Сужаем к центру
            const alpha = 0.3 + 0.7 * (1 - ratio); // Прозрачнее к краям
            
            this.laserBeam.fillStyle(
                Phaser.Display.Color.GetColor(color.r, color.g, color.b),
                alpha
            );
            
            this.laserBeam.fillRect(
                x - width/2,
                y,
                width,
                -height
            );
        }
        
        // 3. Яркое ядро лазера с анимацией
        const coreWidth = this.laserWidth * 0.4;
        const coreAlpha = 0.9 + 0.1 * Math.sin(time * 0.01);
        
        // Вертикальные полосы для эффекта энергии
        const segmentHeight = 20;
        const segments = Math.ceil(height / segmentHeight);
        
        for (let i = 0; i < segments; i++) {
            const segmentY = y - i * segmentHeight;
            const segmentAlpha = coreAlpha * (0.8 + 0.2 * Math.sin(time * 0.02 + i * 0.5));
            
            this.laserBeam.fillStyle(config.colors.inner, segmentAlpha);
            this.laserBeam.fillRect(
                x - coreWidth/2, 
                segmentY, 
                coreWidth, 
                -segmentHeight
            );
        }
        
        // 4. Эффект "искр" по краям
        const sparkAlpha = 0.6 * (0.5 + 0.5 * Math.sin(time * 0.03));
        this.laserBeam.fillStyle(0xffffff, sparkAlpha);
        
        // Левый край
        this.laserBeam.fillRect(
            x - halfWidth - 2, 
            y, 
            4, 
            -height * (0.7 + 0.3 * Math.sin(time * 0.02))
        );
        
        // Правый край
        this.laserBeam.fillRect(
            x + halfWidth - 2, 
            y, 
            4, 
            -height * (0.7 + 0.3 * Math.sin(time * 0.025))
        );
        
        // Обновляем область поражения
        this.laserHitArea.setTo(
            x - halfWidth,
            0,
            this.laserWidth,
            y
        );
    }

    public isLaserActive(): boolean {
        return this.laserActive;
    }

    private fire(): void {
        switch (this.weaponType) {
            case 1: // Широкий тип стрельбы
                this.fireWideWeapon();
                break;
            case 2: // Лазер
                if (!this.laserActive) this.activateLaser();
                break;
            case 3: // Homing
                this.fireHomingWeapon();
                break;
        }
    }

    private fireWideWeapon(): void {
        const pattern = this.getCurrentPattern();
        const baseX = this.gameObject.x;
        const baseY = this.gameObject.y + pattern.yOffset;

        const angles = this.calculateSpreadAngles(pattern.bulletCount, pattern.spread);

        for (let i = 0; i < pattern.bulletCount; i++) {
            const bullet = this.bulletGroup.getFirstDead(false);
            if (!bullet) continue;

            const angle = angles[i];
            const rad = Phaser.Math.DegToRad(angle);
            
            this.setupBullet(bullet, baseX, baseY, rad);
        }
        
        this.eventBusComponent.emit(CUSTOM_EVENTS.SHIP_SHOOT);
    }

    // Равномерное распределение углов
    private calculateSpreadAngles(count: number, spread: number): number[] {
        if (count === 1) return [0];
        const angles = [];
        const step = (spread * 2) / (count - 1);
        for (let i = 0; i < count; i++) {
            angles.push(-spread + i * step);
        }
        return angles;
    }

    private fireHomingWeapon(): void {
        const level = this.getPowerLevel();
        const primaryConfig = CONFIG.PLAYER_WEAPON_CONFIG.homing.primary;
        const homingConfig = CONFIG.PLAYER_WEAPON_CONFIG.homing.homing;
        
        // Обычные пули
        this.firePrimaryHomingBullets(level, primaryConfig);
        
        // Наводящиеся пули
        this.fireHomingBullets(level, homingConfig);
    }

    private firePrimaryHomingBullets(level: number, config: any): void {
        const bulletCount = config.bulletCount[level];
        const spread = config.spread[level];
        const angles = this.calculateSpreadAngles(bulletCount, spread);
        
        for (let i = 0; i < bulletCount; i++) {
            const bullet = this.bulletGroup.getFirstDead(false);
            if (!bullet) continue;
            
            this.setupBullet(
                bullet,
                this.gameObject.x,
                this.gameObject.y + config.yOffset,
                Phaser.Math.DegToRad(angles[i]),
                false,
                true
            );
        }
    }

    private fireHomingBullets(level: number, config: any): void {
        const bulletCount = config.bulletCount[level];
        const angleStep = (Math.PI * 2) / bulletCount;
        const spreadRadius = 30;
        
        for (let i = 0; i < bulletCount; i++) {
            const bullet = this.homingBulletGroup.getFirstDead(false);
            if (!bullet) continue;

            const angle = angleStep * i;
            const offsetX = Math.cos(angle) * spreadRadius * Phaser.Math.FloatBetween(0.8, 1.2);
            const offsetY = Math.sin(angle) * (spreadRadius/2) * Phaser.Math.FloatBetween(0.8, 1.2);
            
            this.setupBullet(
                bullet,
                this.gameObject.x + offsetX,
                this.gameObject.y + offsetY + 15,
                Math.PI + Phaser.Math.FloatBetween(-0.2, 0.2),
                true
            );
            
            bullet.setTexture(config.texture);
            bullet.setData('homingData', {
                delay: config.delayBeforeHoming,
                turnRate: config.turnRate * Phaser.Math.FloatBetween(0.95, 1.05),
                target: null,
                speed: config.speed * Phaser.Math.FloatBetween(0.95, 1.05)
            });
        }
    }

    getHomingBulletGroup(caller?: string): Phaser.Physics.Arcade.Group | null {
        
        if (!this.isActive || !this.homingBulletGroup || !this.gameObject.scene || 
            this.homingBulletGroup.scene?.scene !== this.gameObject.scene.scene) {
            return null;
        }
        return this.homingBulletGroup;
    }

    private setupBullet(
        bullet: Phaser.Physics.Arcade.Sprite,
        x: number,
        y: number,
        angle: number,
        isHoming: boolean = false,
        isHomingPrimary: boolean = false
    ): void {
        if (!this.gameObject.scene) {
            return;
        }
        bullet.enableBody(true, x, y, true, true);
        bullet.setData('lifespan', this.bulletConfig.lifespan);
        bullet.setData('damage', isHoming 
            ? CONFIG.PLAYER_WEAPON_CONFIG.homing.homing.damage
            : (isHomingPrimary ? this.homingPrimaryConfig.damage : this.bulletConfig.damage)
        );
        bullet.setScale(this.bulletConfig.scale);
        bullet.body?.setSize(this.bulletConfig.size.width, this.bulletConfig.size.height);
        bullet.setRotation(angle);

        const velocityX = Math.sin(angle) * this.bulletConfig.speed;
        const velocityY = Math.cos(angle) * -this.bulletConfig.speed;
        
        (bullet.body as Phaser.Physics.Arcade.Body).setVelocity(velocityX, velocityY);
    }

    private getFireRate(): number {
        switch (this.weaponType) {
            case 1: return this.getCurrentPattern().fireRate;
            case 2: return 0;
            case 3: return CONFIG.PLAYER_WEAPON_CONFIG.homing.primary.fireRate;
            default: return 300;
        }
    }


    private worldStep(delta: number): void {
        this.updateBulletsLifespan(this.bulletGroup, delta);
        this.updateBulletsLifespan(this.homingBulletGroup, delta);
    }

    private updateBulletsLifespan(group: Phaser.Physics.Arcade.Group, delta: number): void {
        group.getChildren().forEach((bullet) => {
            const sprite = bullet as Phaser.Physics.Arcade.Sprite;
            if (!sprite.active) return;

            const lifespan = (sprite.getData('lifespan') as number) - delta;
            sprite.setData('lifespan', lifespan);

            if (lifespan <= 0) {
                sprite.disableBody(true, true);
            }
        });
    }

    destroyBullet(bullet: Phaser.Physics.Arcade.Sprite): void {
        bullet.setData('lifespan', 0);
    }

    getBulletGroup(): Phaser.Physics.Arcade.Group | null {
        if (!this.bulletGroup || !this.gameObject.scene || 
            this.bulletGroup.scene?.scene !== this.gameObject.scene.scene) {
            return null;
        }
        return this.bulletGroup;
    }

    private cleanupOffscreenBullets(): void {
        this.cleanupGroupOffscreen(this.bulletGroup);
        this.cleanupGroupOffscreen(this.homingBulletGroup);
    }

    private cleanupGroupOffscreen(group: Phaser.Physics.Arcade.Group): void {
        const worldBounds = this.gameObject.scene.physics.world.bounds;
        const margin = 60;
        
        group.getChildren().forEach((bullet: Phaser.GameObjects.GameObject) => {
            const sprite = bullet as Phaser.Physics.Arcade.Sprite;
            
            if (sprite.active && (
                sprite.y < -margin || 
                sprite.y > worldBounds.height + margin ||
                sprite.x < -margin || 
                sprite.x > worldBounds.width + margin
            )) {
                sprite.disableBody(true, true);
            }
        });
    }

    addPower(amount: number): void {
        const oldLevel = this.getPowerLevel();
        this.currentPower = Phaser.Math.Clamp(this.currentPower + amount, 0, this.maxPower);
        const newLevel = this.getPowerLevel();

        // Отправляем событие об изменении павера
        this.eventBusComponent.emit(CUSTOM_EVENTS.POWER_CHANGED, this.currentPower);
        
        if (oldLevel !== newLevel) {
            this.eventBusComponent.emit(CUSTOM_EVENTS.WEAPON_POWER_CHANGED, {
                oldLevel,
                newLevel,
                homingGroup: this.homingBulletGroup
            });
        }
    }

    getPower(): number {
        return this.currentPower;
    }

    getPowerLevel(): number {
        if (this.currentPower >= 300) return 3;
        if (this.currentPower >= 200) return 2;
        if (this.currentPower >= 100) return 1;
        return 0;
    }

    private getCurrentPattern(): WeaponPattern {
        const level = this.getPowerLevel();
        return CONFIG.PLAYER_WEAPON_CONFIG.powerLevels[level];
    }

    setWeaponType(type: 1 | 2 | 3): void {
        // Деактивируем текущее оружие
        if (this.weaponType === 2) {
            this.deactivateLaser();
        }
        
        // Устанавливаем новый тип
        this.weaponType = type;

        if (this.weaponType === type) return;
    }

    getWeaponType(): number {
        return this.weaponType;
    }

    private destroyGroup(group: Phaser.Physics.Arcade.Group | null): void {
        if (!group || !this.gameObject.scene) return;

        try {
            // Отключаем все тела от физического мира
            group.getChildren().forEach(child => {
                const sprite = child as Phaser.Physics.Arcade.Sprite;
                if (sprite.body) {
                    this.gameObject.scene.physics.world.disableBody(sprite.body);
                }
            });

            // Очищаем группу
            group.clear(true, true);
            
            // Уничтожаем группу
            if (group.scene) {
                group.destroy();
            }
        } catch (e) {
            console.warn('Error destroying group:', e);
        }
    }

    cleanup(): void {
        if (this.isDestroyed) return;
        this.isActive = false;
        this.isDestroyed = true;
        
        // Уничтожение лазера
        this.laserBeam?.destroy();
        this.laserBeam = null;
        this.laserGlow?.destroy();
        this.laserGlow = null;

        if (this.gameObject.scene) {
            this.gameObject.scene.physics.world.off(
                Phaser.Physics.Arcade.Events.WORLD_STEP,
                this.worldStep,
                this
            );
        }
        
        this.destroyGroup(this.bulletGroup);
        this.destroyGroup(this.homingBulletGroup);
        
        this.cleanupTimer?.destroy();
    }
}
