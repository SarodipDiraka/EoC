import { EventBusComponent } from '@/game/components/events/event-bus-component';
import { BulletSpawnerComponent } from '@/game/components/weapon/bullet-spawner-component';
import { BossEnemy } from './base-boss';
import { SinWaveBehavior, AcceleratingBehavior, HomingBehavior, DirectionChangeBehavior } from '@/game/components/weapon/bullet-behaviors';

export class FirstBoss extends BossEnemy {
    private lastShootTime = 0;
    private fireInterval = 200;
    private _patternAngle: number;
    private _patternCounter: number;
    private _shotCounter: number;
    private _lineOffset: number;
    private _shipSprite!: Phaser.GameObjects.Sprite;
    private _engineSprite!: Phaser.GameObjects.Sprite;

    private _spiralAngle: number = 0;
    private _splitTimer: number = 0;
    private _homingTimer: number = 0;

    // Размеры хитбокса (ширина, высота)
    private hitboxWidth: number = 48;
    private hitboxHeight: number = 48;
    
    // Смещение хитбокса (чтобы центрировать)
    private hitboxOffsetX: number = -24;
    private hitboxOffsetY: number = -24;

    protected initSprites(): void {
        this._shipSprite = this.scene.add.sprite(0, 0, 'fighter', 0);
        this._engineSprite = this.scene.add.sprite(0, 0, 'fighter_engine')
            .setFlipY(true)
            .play('fighter_engine');
        
        this.add([this._engineSprite, this._shipSprite]);
    }

    protected createPhases() {
        return [
            // // Фаза 1: Синусоидальные волны
            // {
            //     health: 1000,
            //     duration: 15000,
            //     onEnter: () => {
            //         this.fireInterval = 200;
            //         this._movementSpeed = 120;
            //     },
            //     update: (time: number, delta: number) => {
            //         if (time - this.lastShootTime >= this.fireInterval) {
            //             this.lastShootTime = time;
                        
            //             const directions = [
            //                 new Phaser.Math.Vector2(0, 1),
            //                 new Phaser.Math.Vector2(0.5, 0.8),
            //                 new Phaser.Math.Vector2(-0.5, 0.8)
            //             ];
                        
            //             this.bulletSpawner.spawn({
            //                 directions,
            //                 speed: 300,
            //                 lifespan: 5000,
            //                 animationKey: 'bullet',
            //                 behaviors: [
            //                     new SinWaveBehavior(0.005, 0.15, 90),
            //                 ]
            //             });
            //         }
            //     }
            // },

            // // Фаза 2: Ускоряющиеся спирали
            // {
            //     health: 1200,
            //     duration: 15000,
            //     onEnter: () => {
            //         this.fireInterval = 300;
            //         this._movementSpeed = 150;
            //         this._spiralAngle = 0;
            //     },
            //     update: (time: number, delta: number) => {
            //         if (time - this.lastShootTime < this.fireInterval) return;
            //         this.lastShootTime = time;

            //         const spiralArms = 4;
            //         const bulletsPerArm = 3;
                    
            //         for (let arm = 0; arm < spiralArms; arm++) {
            //             const angleOffset = arm * (2 * Math.PI / spiralArms);
            //             this._spiralAngle += 0.1;
                        
            //             for (let bulletNum = 0; bulletNum < bulletsPerArm; bulletNum++) {
            //                 const angle = angleOffset + this._spiralAngle + bulletNum * 0.3;
            //                 const direction = new Phaser.Math.Vector2(
            //                     Math.cos(angle),
            //                     Math.sin(angle)
            //                 );

            //                 this.bulletSpawner.spawn({
            //                     directions: [direction],
            //                     speed: 150 + bulletNum * 30,
            //                     lifespan: 3500,
            //                     animationKey: 'bullet',
            //                     behaviors: [
            //                         new AcceleratingBehavior(80 + bulletNum * 15),

            //                     ]
            //                 });
            //             }
            //         }
            //     }
            // },

            // Фаза 3: Самонаводящиеся пули с задержкой
            // {
            //     health: 1500,
            //     duration: 20000,
            //     onEnter: () => {
            //         this.fireInterval = 700;
            //         this._movementSpeed = 180;
            //     },
            //     update: (time: number, delta: number) => {
            //         if (time - this.lastShootTime < this.fireInterval) return;
            //         this.lastShootTime = time;

            //         const circleCount = 12;
            //         for (let i = 0; i < circleCount; i++) {
            //             const angle = Phaser.Math.DegToRad(i * (360 / circleCount));
            //             const direction = new Phaser.Math.Vector2(
            //                 Math.cos(angle),
            //                 Math.sin(angle)
            //             );

            //             this.bulletSpawner.spawn({
            //                 directions: [direction],
            //                 speed: 150,
            //                 lifespan: 5000,
            //                 animationKey: 'bullet',
            //                 behaviors: [
            //                     new HomingBehavior(
            //                         0.08,
            //                         () => this.scene.registry.get('player'),
            //                         i * 300,
            //                         1500 // Длительность наведения 1.5 сек
            //                     ),
            //                     new AcceleratingBehavior(40)
            //                 ]
            //             });
            //         }
            //     }
            // },

            // // Фаза 4: Пули с резкой сменой направления
            // {
            //     health: 1800,
            //     duration: 20000,
            //     onEnter: () => {
            //         this.fireInterval = 500;
            //         this._movementSpeed = 200;
            //     },
            //     update: (time: number, delta: number) => {
            //         if (time - this.lastShootTime < this.fireInterval) return;
            //         this.lastShootTime = time;

            //         // Создаем 12 направлений в веере
            //         const directions = Array.from({length: 12}, (_, i) => {
            //             const angle = Phaser.Math.DegToRad(i * 30 - 75); // От -75° до +75°
            //             return new Phaser.Math.Vector2(
            //                 Math.cos(angle),
            //                 Math.sin(angle)
            //             );
            //         });

            //         this.bulletSpawner.spawn({
            //             directions,
            //             speed: 300, // Высокая начальная скорость
            //             lifespan: 3000,
            //             animationKey: 'bullet',
            //             behaviors: [
            //                 new DirectionChangeBehavior(
            //                     1000, // Через 1 сек
            //                     Math.PI // Разворот на 180°
            //                 ),
            //                 new AcceleratingBehavior(50)
            //             ]
            //         });
            //     }
            // },

            
            {
                health: 1000,
                duration: 30000,
                dropItems: [
                    { 
                        type: 'HEALTH' as const,
                        count: 1, 
                        spread: 30 
                    },
                    { 
                        type: 'BOMB' as const,
                        count: 1, 
                        spread: 30
                    }
                ],
                onEnter: () => {
                    this.fireInterval = 200;
                    this._movementSpeed = 120;
                    this._movementChangeCooldown = 2000;
                },
                update: (time: number, delta: number) => {
                    if (time - this.lastShootTime < this.fireInterval) return;
                    if (this.isInvulnerable()) return;
                    this.lastShootTime = time;

                    const player = this._playerGetter?.(); // Получаем игрока
                    if (!player) return; // Если игрока нет, выходим

                    // Вычисляем угол между боссом и игроком
                    const angleToPlayer = Phaser.Math.RadToDeg(
                        Phaser.Math.Angle.Between(
                            this.x, this.y,
                            player.x, player.y
                        )
                    );

                    // Задаем углы разлета пуль относительно направления на игрока
                    const spreadAngles = [-30, -20, -10, 0, 10, 20, 30];
                    const directions = spreadAngles.map(deg => {
                        // Суммируем угол на игрока и угол разлета
                        const totalAngle = angleToPlayer + deg;
                        return new Phaser.Math.Vector2(
                            Math.cos(Phaser.Math.DegToRad(totalAngle)), 
                            Math.sin(Phaser.Math.DegToRad(totalAngle))
                        );
                    });

                    this.bulletSpawner.spawn({
                        directions,
                        speed: 400,
                        lifespan: 6000,
                        animationKey: 'bullet',
                        size: { width: 14, height: 18 },
                        flipY: false,
                        scale: 0.8,
                    });
                },
            },
            {
                health: 1200,
                duration: 30000,
                onEnter: () => {
                    this.fireInterval = 300;
                    this._movementSpeed = 180;
                    this._movementChangeCooldown = 1500;
                    this._shotCounter = 0; // Счётчик залпов
                    this._lineOffset = 0;  // Текущее смещение линий
                },
                update: (time: number, delta: number) => {
                    if (time - this.lastShootTime < this.fireInterval) return;
                    if (this.isInvulnerable()) return;
                    this.lastShootTime = time;
            
                    const bulletCount = 6;
                    const screenWidth = this.scene.scale.width;
                    const lineSpacing = screenWidth / bulletCount;
                    
                    // Смещаем линии каждые n залпов (можно настроить)
                    if (this._shotCounter % 1 === 0) {
                        this._lineOffset = (this._lineOffset + lineSpacing * 0.2) % (lineSpacing * 10);
                    }
                    this._shotCounter++;
            
                    Array(bulletCount).fill(0).forEach((_, i) => {
                        // Позиция с учётом смещения
                        const xPos = ((i + 0.5) * lineSpacing + this._lineOffset) % screenWidth;
                        const directionY = i % 2 === 0 ? 1 : -1;
                        const yPos = i % 2 === 0 ? 0 : this.scene.scale.height;
                        const speed = i % 2 === 0 ? 200 : 300;
                        
                        this.bulletSpawner.spawn({
                            directions: [new Phaser.Math.Vector2(0, directionY)],
                            speed: speed,
                            lifespan: 4000,
                            animationKey: 'bullet',
                            size: { width: 14, height: 18 },
                            flipY: true,
                            scale: 0.8,
                            spawnPosition: { x: xPos, y: yPos }
                        });
                    });
                },
            },
            {
                health: 1200,
                duration: 30000,
                onEnter: () => {
                    this._targetPosition = {
                        x: this.scene.scale.width / 2,
                        y: 150
                    };
                    this._movementState = 'moving';
                    this._movementChangeCooldown = Infinity;
            
                    // Ожидание достижения центра
                    this.scene.time.delayedCall(100, () => {
                        if (this.body && Phaser.Math.Distance.BetweenPoints(
                            this._targetPosition, 
                            this.body.position
                        ) < 10) {
                            (this.body.velocity as Phaser.Math.Vector2).set(0, 0);
                        }
                    }, [], this);
                    this.fireInterval = 40;
                },
                update: (time: number, delta: number) => {
                    if (time - this.lastShootTime < this.fireInterval) return;
                    if (this.body && this.body.velocity.x != 0 && this.body.velocity.y != 0) return;
                    if (this.isInvulnerable()) return;
                    this.lastShootTime = time;

                    const directions = Array(4).fill(0).map(() => {
                        let angle;
                        
                        if (Phaser.Math.Between(1, 100) <= 25) {
                            angle = Math.PI * (-1.5) + Phaser.Math.FloatBetween(-0.5, 0.5); // -30° to +30°
                        } else {
                            angle = Phaser.Math.FloatBetween(0, Math.PI * 2); // Полный рандом
                        }
                        
                        return new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
                    });

                    this.bulletSpawner.spawn({
                        directions,
                        speed: Phaser.Math.Between(300, 550),
                        lifespan: 2000,
                        animationKey: 'bullet',
                        size: { width: 14, height: 18 },
                        flipY: false,
                        scale: 0.8,
                    });
                },
            },
            {
                health: 3500,
                duration: 60000,
                onEnter: () => {
                    this._targetPosition = {
                        x: this.scene.scale.width / 2,
                        y: this.scene.scale.height / 2 - 50
                    };
                    this._movementState = 'moving';
                    this._movementChangeCooldown = Infinity;
            
                    // Ожидание достижения центра
                    this.scene.time.delayedCall(100, () => {
                        if (this.body && Phaser.Math.Distance.BetweenPoints(
                            this._targetPosition, 
                            this.body.position
                        ) < 10) {
                            (this.body.velocity as Phaser.Math.Vector2).set(0, 0);
                        }
                    }, [], this);
                    this.fireInterval = 30;
                    this._patternAngle = 0;  // Базовый угол Phaser.Math.Between(0, 360)
                    this._patternCounter = 0; // Счётчик итераций
                },
                update: (time: number, delta: number) => {
                    // Проверяем интервал стрельбы
                    if (time - this.lastShootTime < this.fireInterval) return;
                    if (this.body && this.body.velocity.x != 0 && this.body.velocity.y != 0) return;
                    if (this.isInvulnerable()) return;
                    this.lastShootTime = time;

                    const BULLETS_IN_RING = 5;
                    const ANGLE_STEP = 20; // Шаг изменения угла
                    
                    // Создаем кольцо из 5 пуль
                    const directions = Array(BULLETS_IN_RING).fill(0).map((_, i) => {
                        const angleDeg = this._patternAngle + (i * (360 / BULLETS_IN_RING));
                        const angleRad = Phaser.Math.DegToRad(angleDeg);
                        return new Phaser.Math.Vector2(Math.cos(angleRad), Math.sin(angleRad));
                    });
                
                    this.bulletSpawner.spawn({
                        directions,
                        speed: 240,
                        lifespan: 2000,
                        animationKey: 'bullet',
                        size: { width: 14, height: 18 },
                        flipY: false,
                        scale: 0.8
                    });
                
                    // Обновляем угол с синусоидальным смещением
                    this._patternAngle += Math.sin(Phaser.Math.DegToRad(this._patternCounter)) * ANGLE_STEP;
                    this._patternCounter++;
                },
            }
        ];
    }

    init(eventBus: EventBusComponent, getPlayer: () => Phaser.GameObjects.Sprite | undefined): void {
        super.init(eventBus, getPlayer);
        this.bulletSpawner = new BulletSpawnerComponent(this.scene, this, 'bullet', 300);
        this.initSprites();
        this.initPhysics();
    }

    protected initPhysics(): void {
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);
        
        // Настраиваем хитбокс
        if (this.body instanceof Phaser.Physics.Arcade.Body) {
            this.body.setSize(this.hitboxWidth, this.hitboxHeight)
                    .setOffset(this.hitboxOffsetX, this.hitboxOffsetY);
        }

        // Увеличиваем спрайты
        this.setScale(2);
    }

    protected getInitialHealth(): number {
        return 100;
    }

    reset(): void {
        super.reset();
        this._engineSprite.setVisible(true);
        this.bulletSpawner.bulletClear();
    }

    destroy(fromScene?: boolean): void {
        this._engineSprite.destroy(fromScene);
        super.destroy(fromScene);
        this.bulletSpawner?.bulletClear();
    }

    get shipAssetKey(): string { return  'fighter'; }
    get shipDestroyedAnimationKey(): string { return  'fighter_destroy'; }
}