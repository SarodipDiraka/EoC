import { ItemType } from "../types/interfaces";

export interface ItemConfig {
    texture: string;
    dropChance: number;
    minDropInterval: number; // Минимальное количество врагов между дропом
    guaranteedDropEvery: number; // Гарантированный дроп каждые N врагов
}

export const ITEMS_CONFIG: Record<ItemType, ItemConfig> = {
    SCORE: {
        texture: 'score_item',
        dropChance: 0.3,
        minDropInterval: 3,
        guaranteedDropEvery: 15
    },
    POWER: {
        texture: 'power_item',
        dropChance: 0.15,
        minDropInterval: 5,
        guaranteedDropEvery: 20
    },
    HEALTH: {
        texture: 'health_item',
        dropChance: 0.1,
        minDropInterval: 8,
        guaranteedDropEvery: 30
    },
    BOMB: {
        texture: 'bomb_item',
        dropChance: 0.05,
        minDropInterval: 10,
        guaranteedDropEvery: 40
    }
};