import { EventBusComponent } from "../components/events/event-bus-component";

export interface EnemyInterface extends Phaser.Physics.Arcade.Sprite {
    init(eventBus: EventBusComponent): void;
    reset(): void;
    destroy(fromScene?: boolean): void;
}

export interface EnemyClass {
    new (scene: Phaser.Scene, x: number, y: number): EnemyInterface;
    enemyType: string;
}

export type PatternType = 'random' | 'line' | 'direct' | 'spiral' | 'circle' | 'wave';

export interface RandomPatternParams {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export interface LinePatternParams {
    startX: number;
    startY: number;
    stepX: number;
    stepY: number;
}

export interface DirectPatternParams {
    positions: Array<{ x: number; y: number }>;
}

export interface SpiralPatternParams { //враги вылетают по раскручивающейся спирали
    centerX: number;
    centerY: number;
    radiusStep: number; // увеличение радиуса на каждом шаге
    angleStep: number; //  увеличение угла на каждом шаге
    initialRadius?: number;
    initialAngle?: number;
}

export interface CirclePatternParams { // враги появляются равномерно по окружности
    centerX: number;
    centerY: number;
    radius: number;
    startAngle?: number; // начальный угол в радианах
    fullCircle?: boolean; // если false, то полукруг
}

export interface WavePatternParams { // зигзагообразное появление сверху вниз или слева направо
    startX: number;
    startY: number;
    amplitude: number; //высота волны
    wavelength: number; //расстояние между точками по оси
    direction: 'horizontal' | 'vertical'; //направление движения волны
}

export type PatternParams = 
    | { type: 'random'; params: RandomPatternParams }
    | { type: 'line'; params: LinePatternParams }
    | { type: 'direct'; params: DirectPatternParams }
    | { type: 'spiral'; params: SpiralPatternParams }
    | { type: 'circle'; params: CirclePatternParams }
    | { type: 'wave'; params: WavePatternParams };

export interface SpawnerConfig {
    enemyType: string;
    interval: number;
    groupSize: number;
    count?: number;
    patternType: PatternType;
    patternParams: PatternParams;
}

export interface WaveConfig {
    duration: number;
    delayAfter: number;
    spawners: SpawnerConfig[];
}

export interface LevelConfig {
    waves: WaveConfig[];
    boss?: {
        enemyType: string;
    };
}

export interface BulletConfig {
    speed: number;
    lifespan: number;
    texture: string;
    scale: number;
    size: { width: number; height: number };
    damage: number;
}

export interface WeaponPattern {
    bulletCount: number;
    spread: number;
    fireRate: number;
    yOffset: number;
}

export interface PowerLevels {
    0: WeaponPattern;
    1: WeaponPattern;
    2: WeaponPattern;
    3: WeaponPattern;
    [key: number]: WeaponPattern;
}

export interface LaserConfig {
    damageLevels: [number, number, number, number];
    widthLevels: [number, number, number, number];
    fireRate: number;
    colors: {
        inner: number;
        outer: number;
        glow: number;
    };
    alpha: number;
}

export interface HomingPrimaryConfig {
    bulletCount: [number, number, number, number];
    spread: [number, number, number, number];
    fireRate: number;
    yOffset: number;
    damage: number;
}

export interface HomingBulletConfig {
    bulletCount: [number, number, number, number];
    texture: string;
    speed: number;
    turnRate: number;
    delayBeforeHoming: number;
    lifespan: number;
    damage: number;
}

export interface HomingConfig {
    primary: HomingPrimaryConfig;
    homing: HomingBulletConfig;
}

export interface PlayerWeaponConfig {
    base: BulletConfig;
    powerLevels: PowerLevels;
    laser: LaserConfig;
    homing: HomingConfig;
}

export interface HomingBulletData {
    delay: number;
    turnRate: number;
    target: Phaser.Physics.Arcade.Sprite | null;
    speed: number;
}

export type ItemType = 'SCORE' | 'POWER' | 'HEALTH' | 'BOMB';

export interface ItemDrop {
    type: ItemType;
    x: number;
    y: number;
}

export interface EnemyDropConfig {
    items: {
        type: ItemType;
        chance: number;
    }[];
}

export interface BossPhase {
    health: number;
    duration: number;
    dropItems?: BossPhaseDropConfig[];
    onEnter?: () => void;
    onExit?: () => void;
    update: (time: number, delta: number) => void;
}

export interface BossPhaseDropConfig {
    type: ItemType;
    count: number;
    spread: number;
}