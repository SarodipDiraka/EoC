import Phaser from 'phaser';
import { BaseEnemy } from '../base-enemy';
import { EventBusComponent } from '@/game/components/events/event-bus-component';
import { CUSTOM_EVENTS } from '@/game/types/custom-events';
import { BulletSpawnerComponent } from '@/game/components/weapon/bullet-spawner-component';
import { BossPhase } from '@/game/types/interfaces';

export abstract class BossEnemy extends BaseEnemy {
    protected _bulletSpawner!: BulletSpawnerComponent;
    
    protected _phases: BossPhase[] = [];
    protected _currentPhaseIndex = 0;
    protected _phaseTimeLeft = 0;
    protected _lastMovementChangeTime = 0;
    protected _movementChangeCooldown = 3000;

    protected _isInvulnerable = true;
    protected invulnerabilityTimer?: Phaser.Time.TimerEvent;

    protected _isPhaseTransitioning = false;

    protected _spawnComplete = false;
    protected _verticalRange = { min: 50, max: 200 };
    protected _targetPosition = { x: 0, y: 100 };
    protected _movementSpeed = 100;
    protected _screenMargin = 20;

    protected _playerGetter: () => Phaser.GameObjects.Sprite | undefined;
    protected _currentSection = 0;
    protected _sections: { min: number; max: number }[] = [];

    protected _movementState: 'moving' | 'waiting' = 'waiting';

    private debugGraphics?: Phaser.GameObjects.Graphics;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
    ) {
        super(scene, x, y);
    }

    init(eventBus: EventBusComponent, getPlayer: () => Phaser.GameObjects.Sprite | undefined): void {
        super.init(eventBus);
        this._playerGetter = getPlayer;
        this._phases = this.createPhases();
        this._phaseTimeLeft = this._phases[0]?.duration ?? 0;
        this._healthComponent.setLife(this._phases[0]?.health ?? 1);
        this._isInvulnerable = true;

        // Инициализация секций экрана
        this.initScreenSections();

        if (this.body) {
            this.body.velocity.y = this._movementSpeed;
            this._targetPosition = { x: this.x, y: this._verticalRange.min };
        }

        eventBus.emit(CUSTOM_EVENTS.BOSS_SPAWNED, this);
    }

    protected initScreenSections(): void {
        const screenWidth = this.scene.scale.width;
        const sectionWidth = screenWidth / 5; // 5 равных секций
        
        this._sections = Array.from({ length: 5 }, (_, i) => ({
            min: i * sectionWidth,
            max: (i + 1) * sectionWidth
        }));

        // Визуализация секций для отладки
        // this.debugGraphics = this.scene.add.graphics();
        // this.debugGraphics.lineStyle(2, 0xff0000, 0.5);
        
        // this._sections.forEach((section, index) => {
        //     this.debugGraphics?.strokeRect(
        //         section.min,
        //         50, // Верхняя граница
        //         section.max - section.min,
        //         this.scene.scale.height - 100 // Высота секции
        //     );
        // });
    }

    public isInvulnerable() {
        return this._isInvulnerable;
    }

    public setInvulnerable(duration: number) {
        this._isInvulnerable = true;
        this.invulnerabilityTimer = this.scene.time.delayedCall(duration, () => {
            this._isInvulnerable = false;
        });
    }

    protected abstract createPhases(): BossPhase[];

    protected customUpdate(time: number, delta: number): void {
        if (!this._spawnComplete) {
            this.handleSpawnMovement();
            return;
        }

        const currentPhase = this._phases[this._currentPhaseIndex];
        if (!currentPhase) return;

        this._phaseTimeLeft -= delta;
        if (this._phaseTimeLeft <= 0) {
            this.handlePhaseTransition();
        }

        currentPhase.update(time, delta);
        this.handleMovement(time, delta);
    }

    protected handleDeath(): void {
        if (this._isPhaseTransitioning) return;
        
        // Только если все фазы пройдены
        if (this._currentPhaseIndex >= this._phases.length - 1) {
            super.handleDeath();
            this._eventBusComponent.emit(CUSTOM_EVENTS.BOSS_DEFEATED, this);
            this.bulletSpawner?.cleanup();
        } else {
            this._isPhaseTransitioning = true;
            this.handlePhaseTransition();
        }
    }

    protected handlePhaseTransition(): void {
        const currentPhase = this._phases[this._currentPhaseIndex];
        currentPhase.onExit?.();
        
        this._currentPhaseIndex++;
        
        if (this._currentPhaseIndex >= this._phases.length) {
            this._healthComponent.die();
            return;
        }

        const nextPhase = this._phases[this._currentPhaseIndex];
        this._phaseTimeLeft = nextPhase.duration;
        
        // Сбрасываем флаг смерти перед установкой нового здоровья
        this._healthComponent.reset();
        this._healthComponent.setLife(nextPhase.health);
        
        this.setInvulnerable(2000);
        this.bulletSpawner?.bulletClear();
        this._eventBusComponent.emit(CUSTOM_EVENTS.BOSS_PHASE_CHANGE, this);
        
        this.scene.time.delayedCall(500, () => {
            nextPhase.onEnter?.();
            this._isPhaseTransitioning = false; // Разблокируем переходы
        });
    }

    protected handleMovement(time: number, delta: number): void {
        if (!this.body) {
            console.log('Movement skipped: no physics body');
            return;
        }

        const now = Date.now();
        
        switch (this._movementState) {
            case 'waiting':
                // Проверяем, закончился ли cooldown
                if (now - this._lastMovementChangeTime >= this._movementChangeCooldown) {
                    // console.log('Cooldown finished, starting new movement');
                    this.chooseNewTarget();
                    this._movementState = 'moving';
                }
                break;
                
            case 'moving':
                // Проверяем достижение цели
                const dx = this._targetPosition.x - this.x;
                const dy = this._targetPosition.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 10) {
                    // console.log('Target reached, stopping and starting cooldown');
                    (this.body.velocity as Phaser.Math.Vector2).set(0, 0);
                    this._lastMovementChangeTime = now;
                    this._movementState = 'waiting';
                } else {
                    // console.log(`Moving to target: ${distance.toFixed(1)}px left`);
                    this.updateVelocity();
                }
                break;
        }
    }

    protected chooseNewTarget(): void {
        const player = this._playerGetter?.();
        if (!player) return;
    
        // Определение текущей секции
        const currentSection = this.getCurrentSection();
        const playerSection = this._sections.findIndex(s => 
            player.x >= s.min && player.x < s.max
        );
    
        // Логика выбора горизонтальной цели
        let targetXSection = currentSection;
        if (playerSection === currentSection) {
            // Особый случай для крайних секций
            if (currentSection === 0 || currentSection === 4) {
                // Всегда уходим от края
                targetXSection = currentSection === 0 ? 1 : 3;
            } 
            else {
                // Стандартная логика для некрайних секций
                const playerOffsetX = player.x - this.x;
                targetXSection += Math.sign(playerOffsetX) || Phaser.Math.Between(-1, 1);
            }
        } else {
            targetXSection += Math.sign(playerSection - currentSection);
        }
    
        // Ограничение секций
        targetXSection = Phaser.Math.Clamp(targetXSection, 0, 4);
        const section = this._sections[targetXSection];
    
        // Применение margin
        this._targetPosition = {
            x: Phaser.Math.Clamp(
                Phaser.Math.Between(section.min, section.max),
                this._screenMargin,
                this.scene.scale.width - this._screenMargin
            ),
            y: Phaser.Math.Between(this._verticalRange.min + this._screenMargin, this._verticalRange.max)
        };
    }

    protected updateVelocity(): void {
        if (!this.body) return;

        const dx = this._targetPosition.x - this.x;
        const dy = this._targetPosition.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;

        const speed = this._movementSpeed;
        const vx = (dx / distance) * speed;
        const vy = (dy / distance) * speed;

        // console.log(`Updating velocity: x=${vx.toFixed(1)}, y=${vy.toFixed(1)}`);
        (this.body.velocity as Phaser.Math.Vector2).set(vx, vy);
    }

    protected getCurrentSection(): number {
        return this._sections.findIndex(s => 
            this.x >= s.min && this.x < s.max
        );
    }

    protected handleSpawnMovement(): void {
        if (!this.body) return;
    
        if (this.y >= this._verticalRange.min) {
            (this.body.velocity as Phaser.Math.Vector2).set(0, 0);
            this._spawnComplete = true;
            this._isInvulnerable = false;
            this.scene.time.delayedCall(1000, () => {
                this._phases[0]?.onEnter?.();
            });
        }
    }

    reset(): void {
        super.reset();
        this._currentPhaseIndex = 0;
        this._phases = this.createPhases();
        this._phaseTimeLeft = this._phases[0]?.duration ?? 0;
        this._healthComponent.setLife(this._phases[0]?.health ?? 1);
        this._phases[0]?.onEnter?.();
        this._spawnComplete = false;
        this._isInvulnerable = true;
    }

    get currentPhaseIndex(): number {
        return this._currentPhaseIndex;
    }

    public get bulletSpawner(): BulletSpawnerComponent {
        return this._bulletSpawner;
    }
    public set bulletSpawner(value: BulletSpawnerComponent) {
        this._bulletSpawner = value;
    }
}