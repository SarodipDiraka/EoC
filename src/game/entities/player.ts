import { ColliderComponent } from '../components/collider/collider-component';
import { EventBusComponent } from '../components/events/event-bus-component';
import { HealthComponent } from '../components/health/health-component';
import { KeyboardInputComponent } from '../components/input/human/keyboard-input-component';
import { HorizontalMovementComponent } from '../components/movement/horizontal-movement-component';
import { VerticalMovementComponent } from '../components/movement/vertical-movement-component';
import { WeaponComponent } from '../components/weapon/weapon-component';
import * as CONFIG from '../configs/game-config';
import Phaser from 'phaser';
import { CUSTOM_EVENTS } from '../types/custom-events';

export class Player extends Phaser.GameObjects.Container {
    private _keyboardInput: KeyboardInputComponent;
    private _weapon: WeaponComponent;
    private _horizontalMovement: HorizontalMovementComponent;
    private _verticalMovement: VerticalMovementComponent;
    private _health: HealthComponent;
    private _collider: ColliderComponent;
    private _eventBus: EventBusComponent;
    
    private _shipSprite: Phaser.GameObjects.Sprite;
    private _engineSprite: Phaser.GameObjects.Sprite;
    private _thrusterSprite: Phaser.GameObjects.Sprite;

    private _isInvulnerable: boolean = false;
    private _invulnerabilityTimer: Phaser.Time.TimerEvent | null = null;
    private _blinkTween: Phaser.Tweens.Tween | null = null;

    private _focusIndicator: Phaser.GameObjects.Graphics;

    private _bombsCount: number;
    private _isBombActive: boolean = false;
    private _bombEffect: Phaser.GameObjects.Graphics;
    private _bombTimer: Phaser.Time.TimerEvent | null = null;
    private _bombCooldown: boolean = false;
    private _isWeaponChanged: boolean = false;
    public _pickupRadius: number = 30; // Радиус подбора предметов

    constructor(scene: Phaser.Scene, eventBus: EventBusComponent) {
        super(scene, scene.scale.width / 2, scene.scale.height - 32, []);
        
        // Инициализация физики
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this); //хитбокс, при включенном debug виден
        if (!this.body) {
            throw new Error('Physics body not created for FighterEnemy');
        }

        if(this.body instanceof Phaser.Physics.Arcade.Body)
        {
            this.body.setSize(4, 4); //его размер
            // this.body.setOffset(-12, -12); //его смещение
            this.body.setCollideWorldBounds(true); //столкновение со стенами сцены
            this.setDepth(2); //Выше глубина - отрисовывается выше объектов с меньшей глубиной
        }

        this._eventBus = eventBus;

        // Графические компоненты
        this._shipSprite = scene.add.sprite(0, 0, 'ship');
        this._engineSprite = scene.add.sprite(0, 0, 'ship_engine');
        this._thrusterSprite = scene.add.sprite(0, 0, 'ship_engine_thruster');
        this._thrusterSprite.play('ship_engine_thruster');
        this.add([this._thrusterSprite, this._engineSprite, this._shipSprite]);

        // Инициализация компонентов
        this._keyboardInput = new KeyboardInputComponent(scene);
        
        this._horizontalMovement = new HorizontalMovementComponent(
            this,
            this._keyboardInput,
            CONFIG.PLAYER_MOVEMENT_VELOCITY
        );
        
        this._verticalMovement = new VerticalMovementComponent(
            this,
            this._keyboardInput,
            CONFIG.PLAYER_MOVEMENT_VELOCITY
        );
        

        this._weapon = new WeaponComponent(
            this,
            this._keyboardInput,
            eventBus
        );

        this._health = new HealthComponent(CONFIG.PLAYER_HEALTH);
        this._collider = new ColliderComponent(this._health, eventBus);

        // Настройка событий
        this.hide();
        eventBus.on(CUSTOM_EVENTS.PLAYER_SPAWN, this.spawn, this);

        // Обработка добавления HP
        this._eventBus.on(CUSTOM_EVENTS.ADD_LIFE, (amount: number = 1) => {
            this._health.setLife(this._health.life + amount);
        });

        // Обработка добавления бомб
        this._eventBus.on(CUSTOM_EVENTS.ADD_BOMB, (amount: number = 1) => {
            this._bombsCount = this._bombsCount + amount;
            this._eventBus.emit(CUSTOM_EVENTS.BOMB_COUNT_CHANGED, this._bombsCount);
        });
        
        scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
        this.once(Phaser.GameObjects.Events.DESTROY, this.cleanup, this);

        this._focusIndicator = scene.add.graphics();
        this._focusIndicator.setDepth(10); // Поверх других объектов
        this.add(this._focusIndicator);

        this._bombsCount = CONFIG.PLAYER_BOMB_CONFIG.count;
        this._bombEffect = scene.add.graphics();
        this._bombEffect.setDepth(-5); // Между фоном и объектами
        this._bombEffect.setVisible(false);

        this.setupTestControls();
    }

    public canPickup(item: Phaser.GameObjects.Sprite): boolean {
        return Phaser.Math.Distance.Between(this.x, this.y, item.x, item.y) <= this._pickupRadius;
    }

    private setupTestControls(): void {
        if (!this.scene.input.keyboard) return;

        // Добавление power
        this.scene.input.keyboard.on('keydown-P', () => {
            this.increasePower(50);
            console.log(`Power: ${this.getPower()} (Level ${this.getPowerLevel()})`);
        });

        // Сброс power
        this.scene.input.keyboard.on('keydown-O', () => {
            this.increasePower(-this.getPower());
            console.log(`Power reset`);
        });

    }

    increasePower(amount: number): void {
        this._weapon.addPower(amount);
    }

    getPower(): number {
        return this._weapon.getPower();
    }

    getPowerLevel(): number {
        return this._weapon.getPowerLevel();
    }

    get powerLevel(): number {
        return this._weapon.getPowerLevel();
    }

    get collider(): ColliderComponent {
        return this._collider;
    }

    get health(): HealthComponent {
        return this._health;
    }

    get weaponGroup(): Phaser.Physics.Arcade.Group | null {
        return this._weapon.getBulletGroup();
    }

    get weapon(): WeaponComponent {
        return this._weapon;
    }

    get isInvulnerable()
    {
        return this._isInvulnerable;
    }

    update(time: number, delta: number): void {
        if (!this.active) return;

        if (this._health.isDead) {
            this.handleDeath();
            return;
        }

        this._keyboardInput.update();
        this._horizontalMovement.update();
        this._verticalMovement.update();
        this._weapon.update(delta);
        
        // Обработка смены оружия
        if (this._keyboardInput.thirdActionIsDown) {
            if(!this._isWeaponChanged) this.cycleWeaponType();
            this._isWeaponChanged = true;
        }
        else{
            this._isWeaponChanged = false;
        }

        this.updateHitboxIndicator();

        // Обработка активации бомбы
        if (this._keyboardInput.secondaryActionIsDown && 
            !this._isBombActive && 
            !this._bombCooldown &&
            this._bombsCount > 0) {
            this.activateBomb();
        }
    }

    private activateBomb(): void {
        if (this._isInvulnerable) return; // Нельзя активировать в неуязвимости
        
        this._bombsCount--;
        this._isBombActive = true;
        this._bombCooldown = true;
        
        // Начальная вспышка
        this.showBombInitialFlash();
        
        // Постоянный эффект на время действия бомбы
        this.showBombPersistentEffect();
        
        // Делаем игрока неуязвимым
        this.activateInvulnerability(CONFIG.PLAYER_BOMB_CONFIG.duration);
        
        // Удаляем все пули противников и наносим урон
        this._eventBus.emit(CUSTOM_EVENTS.PLAYER_BOMB_ACTIVATED);
        
        // Запускаем таймеры
        this._bombTimer = this.scene.time.delayedCall(
            CONFIG.PLAYER_BOMB_CONFIG.duration, 
            this.deactivateBomb, 
            [], 
            this
        );
        
        // КД после использования
        this.scene.time.delayedCall(
            CONFIG.PLAYER_BOMB_CONFIG.cooldown,
            () => this._bombCooldown = false,
            [],
            this
        );
        
        // Периодический урон врагам
        const damageTimer = this.scene.time.addEvent({
            delay: CONFIG.PLAYER_BOMB_CONFIG.damageInterval,
            callback: () => {
                this._eventBus.emit(CUSTOM_EVENTS.PLAYER_BOMB_DAMAGE_TICK);
            },
            callbackScope: this,
            repeat: Math.floor(CONFIG.PLAYER_BOMB_CONFIG.duration / CONFIG.PLAYER_BOMB_CONFIG.damageInterval)
        });
        
        // Обновляем UI
        this._eventBus.emit(CUSTOM_EVENTS.BOMB_COUNT_CHANGED, this._bombsCount);
    }

    private deactivateBomb(): void {
        this._isBombActive = false;
        
        // Плавное затухание эффекта
        this.scene.tweens.add({
            targets: this._bombEffect,
            alpha: 0,
            duration: 500,
            onComplete: () => this._bombEffect.setVisible(false)
        });
        
        if (this._bombTimer) {
            this._bombTimer.destroy();
            this._bombTimer = null;
        }
    }

    private showBombInitialFlash(): void {
        // Яркая начальная вспышка
        const flash = this.scene.add.graphics()
            .fillStyle(0xffffff, 1)
            .fillRect(0, 0, this.scene.scale.width, this.scene.scale.height)
            .setDepth(1);
        
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 300,
            ease: 'Cubic.easeOut',
            onComplete: () => flash.destroy()
        });
    }

    private showBombPersistentEffect(): void {
        this._bombEffect.clear();
        
        // Пульсирующий эффект на весь экран
        this._bombEffect.fillStyle(0x88aaff, 0.8);
        this._bombEffect.fillRect(
            0, 
            0, 
            this.scene.scale.width, 
            this.scene.scale.height
        );
        
        this._bombEffect.setVisible(true);
        
        // Анимация пульсации
        this.scene.tweens.add({
            targets: this._bombEffect,
            alpha: { from: 0.3, to: 0.1 },
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
    }

    resetBombs(): void {
        this._bombsCount = CONFIG.PLAYER_BOMB_CONFIG.count;
        this._isBombActive = false;
        this._bombCooldown = false;
        this._bombEffect.setVisible(false);
        this._eventBus.emit(CUSTOM_EVENTS.BOMB_COUNT_CHANGED, this._bombsCount);
    }

    private cycleWeaponType(): void {
        const currentType = this._weapon.getWeaponType();
        const nextType = currentType % 3 + 1; // 1→2→3→1
        this._weapon.setWeaponType(nextType as 1 | 2 | 3);
        this._eventBus.emit(CUSTOM_EVENTS.WEAPON_CHANGED, { weaponType: nextType });
    }

    private updateHitboxIndicator(): void {
        this._focusIndicator.clear();
        
        if (this._keyboardInput.focusIsDown && this.body) {
            const body = this.body as Phaser.Physics.Arcade.Body;
            
            // Красная точка в центре
            this._focusIndicator.fillStyle(0xff0000, 1);
            this._focusIndicator.fillCircle(
                body.offset.x + body.width / 2,
                body.offset.y + body.height / 2,
                3
            );
            
            // Контур хитбокса
            this._focusIndicator.lineStyle(1, 0xff0000, 0.5);
            this._focusIndicator.strokeRect(
                body.offset.x,
                body.offset.y,
                body.width,
                body.height
            );
        }
    }

    private handleDeath(): void {
        this.hide();
        this._weapon.deactivateLaser();
        this.resetBombs();
        this.setVisible(true);
        this._shipSprite.play('explosion');
        this._eventBus.emit(CUSTOM_EVENTS.PLAYER_DESTROYED);
    }

    private hide(): void {
        // Отключаем физическое тело
        if (this.body && this.body instanceof Phaser.Physics.Arcade.Body) {
            this.body.enable = false;
            this.body.stop(); // Останавливаем движение
        }
    
        this.setActive(false).setVisible(false);
        this._engineSprite.setVisible(false);
        this._thrusterSprite.setVisible(false);
        this._keyboardInput.lockInput = true;
    
        // Отписываемся от физических событий
        this.scene.physics.world.disable(this);
    }

    private spawn(): void {
        if (!this.scene || this.ignoreDestroy) return;
    
        // Включаем физику
        this.scene.physics.world.enable(this);
        if (this.body && this.body instanceof Phaser.Physics.Arcade.Body) {
            this.body.enable = true;
            this.body.velocity.set(0, 0);
        }
    
        this.setActive(true).setVisible(true);
        this._engineSprite.setVisible(true);
        this._thrusterSprite.setVisible(true);
        this._shipSprite.setTexture('ship', 0);
        this._health.reset();
        this.setPosition(this.scene.scale.width / 2, this.scene.scale.height - 32);
        this._keyboardInput.lockInput = false;
    
        this.activateInvulnerability(3000);
    }

    private activateInvulnerability(duration: number): void {
        // Отменяем предыдущие эффекты, если есть
        this.deactivateInvulnerability();
        
        // Устанавливаем флаг неуязвимости
        this._isInvulnerable = true;
        
        // Эффект мигания
        this._blinkTween = this.scene.tweens.add({
            targets: [this._shipSprite, this._engineSprite, this._thrusterSprite],
            alpha: { from: 0.3, to: 1 },
            duration: 300,
            yoyo: true,
            repeat: -1
        });
        
        // Таймер для отключения неуязвимости
        this._invulnerabilityTimer = this.scene.time.delayedCall(duration, () => {
            this.deactivateInvulnerability();
        });
    }

    private deactivateInvulnerability(): void {
        if (!this._isInvulnerable) return;
        
        this._isInvulnerable = false;
        
        // Останавливаем мигание
        if (this._blinkTween) {
            this._blinkTween.stop();
            this._blinkTween = null;
        }
        
        // Восстанавливаем полную видимость
        this._shipSprite.setAlpha(1);
        this._engineSprite.setAlpha(1);
        this._thrusterSprite.setAlpha(1);
        
        // Очищаем таймер
        if (this._invulnerabilityTimer) {
            this._invulnerabilityTimer.destroy();
            this._invulnerabilityTimer = null;
        }
    }

    public cleanup(): void {
        this.deactivateInvulnerability();
        this.scene?.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
        this._eventBus.off(CUSTOM_EVENTS.PLAYER_SPAWN, this.spawn, this);
        this._weapon.cleanup();

        // Очистка таймеров бомбы
        if (this._bombTimer) {
            this._bombTimer.destroy();
            this._bombTimer = null;
        }
        
        // Очистка графики бомбы
        this._bombEffect.destroy();
    }

}
