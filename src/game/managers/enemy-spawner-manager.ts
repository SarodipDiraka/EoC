import { EventBusComponent } from "../components/events/event-bus-component";
import { EnemySpawnerComponent } from "../components/spawners/enemy-spawner-component";
import { EnemyClass } from "../types/interfaces";

export class EnemySpawnerManager {
    private spawners: Map<string, EnemySpawnerComponent> = new Map();
    private scene: Phaser.Scene;
    private eventBus: EventBusComponent;

    constructor(scene: Phaser.Scene, eventBus: EventBusComponent) {
        this.scene = scene;
        this.eventBus = eventBus;
    }

    registerSpawner(enemyType: string, enemyClass: EnemyClass): EnemySpawnerComponent {
        const spawner = new EnemySpawnerComponent(this.scene, enemyClass, this.eventBus);
        this.spawners.set(enemyType, spawner);
        return spawner;
    }

    getSpawner(enemyType: string): EnemySpawnerComponent | undefined {
        return this.spawners.get(enemyType);
    }

    getAllSpawners(): EnemySpawnerComponent[] {
        return Array.from(this.spawners.values());
    }

    cleanup(): void {
        this.spawners.forEach(spawner => spawner.cleanup());
        this.spawners.clear();
    }
}