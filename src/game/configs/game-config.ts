import { PlayerWeaponConfig } from "../types/interfaces";
import level1 from "./levels/level-1.config";
import level2 from "./levels/level-2.config";

// Настройки игрока
export const PLAYER_LIVES: number = 1;
export const PLAYER_HEALTH: number = 1;
export const PLAYER_MOVEMENT_VELOCITY: number = 250;
export const LIFE_BONUS_VALUE = 1000; // Бонус за каждую оставшуюся жизнь

// Настройки врага-истребителя
export const ENEMY_FIGHTER_SCORE: number = 200;
export const ENEMY_FIGHTER_HEALTH: number = 250;
export const ENEMY_FIGHTER_MOVEMENT_VERTICAL_VELOCITY: number = 200;
export const ENEMY_FIGHTER_BULLET_SPEED: number = -280;
export const ENEMY_FIGHTER_BULLET_INTERVAL: number = 2000;
export const ENEMY_FIGHTER_BULLET_LIFESPAN: number = 30000;
export const ENEMY_FIGHTER_BULLET_MAX_COUNT: number = 10;
export const ENEMY_FIGHTER_GROUP_SPAWN_INTERVAL: number = 6000;
export const ENEMY_FIGHTER_GROUP_SPAWN_START: number = 3000;

// Настройки врага-разведчика
export const ENEMY_SCOUT_SCORE: number = 100;
export const ENEMY_SCOUT_HEALTH: number = 20;
export const ENEMY_SCOUT_MOVEMENT_MAX_X: number = 40;
export const ENEMY_SCOUT_MOVEMENT_VERTICAL_VELOCITY: number = 180;
export const ENEMY_SCOUT_MOVEMENT_HORIZONTAL_VELOCITY: number = 110;
export const ENEMY_SCOUT_GROUP_SPAWN_INTERVAL: number = 5000;
export const ENEMY_SCOUT_GROUP_SPAWN_START: number = 1000;

// circular-fighter-config.ts
export const CIRCULAR_FIGHTER_SCORE: number = 300; // Больше очков за сложность
export const CIRCULAR_FIGHTER_HEALTH: number = 300; 
export const CIRCULAR_FIGHTER_MOVEMENT_VELOCITY: number = 180; // Скорость движения
export const CIRCULAR_FIGHTER_BULLET_SPEED: number = 350; // Пули летят быстрее
export const CIRCULAR_FIGHTER_BULLET_INTERVAL: number = 250; // Интервал между выстрелами в серии
export const CIRCULAR_FIGHTER_BULLET_LIFESPAN: number = 4000; // Время жизни пули
export const CIRCULAR_FIGHTER_SHOOT_INTERVAL: number = 2000; // 10 сек между сменами цели
export const CIRCULAR_FIGHTER_SHOOT_CYCLES: number = 25; // Количество циклов стрельбы
export const CIRCULAR_FIGHTER_STOP_DISTANCE: number = 150; // Дистанция остановки от центра

export const levels = [level1, level2];

export const PLAYER_WEAPON_CONFIG: PlayerWeaponConfig = {
    base: {
        speed: 600,
        lifespan: 1000,
        texture: 'bullet',
        scale: 0.8,
        size: { width: 14, height: 18 },
        damage: 20
    },
    powerLevels: {
        0: {
            bulletCount: 3,
            spread: 15,
            fireRate: 300,
            yOffset: -20
        },
        1: {
            bulletCount: 5,
            spread: 25,
            fireRate: 250,
            yOffset: -20
        },
        2: {
            bulletCount: 7,
            spread: 35,
            fireRate: 200,
            yOffset: -20
        },
        3: {
            bulletCount: 9,
            spread: 45,
            fireRate: 150,
            yOffset: -20
        }
    },
    laser: {
        damageLevels: [1, 2, 3, 4],
        widthLevels: [16, 22, 26, 30],
        fireRate: 50,
        colors: {
            inner: 0x00ffff,
            outer: 0x0066ff,
            glow: 0x00aaff
        },
        alpha: 0.8
    },
    homing: {
        primary: {
            bulletCount: [2, 2, 3, 3],
            spread: [2, 2, 15, 15],
            fireRate: 300,
            yOffset: -20,
            damage: 5
        },
        homing: {
            bulletCount: [2, 4, 6, 8], // Количество наводящихся пуль по уровням
            texture: 'rocket',
            speed: 300,
            turnRate: 0.08, // Скорость поворота (радианы за кадр)
            delayBeforeHoming: 100, // Начинает наводиться
            lifespan: 5000,
            damage: 7
        }
    }
};

export const PLAYER_BOMB_CONFIG = {
    count: 3, // Бомб на жизнь
    duration: 5000, // Длительность эффекта (5 сек)
    damageInterval: 50, // Интервал нанесения урона (мс)
    damage: 5, // Урон за тик
    cooldown: 1000 // Задержка после использования
};