import Phaser from 'phaser';

export interface BulletSpawnConfig {
    directions: Phaser.Math.Vector2[];
    speed: number;
    lifespan: number;
    scale?: number;
    size?: { width: number; height: number };
    animationKey?: string;
    flipY?: boolean;
    spawnPosition?: { x: number; y: number };
}

export class BulletSpawnerComponent {
    private owner: Phaser.GameObjects.Sprite;
    private bulletGroup: Phaser.Physics.Arcade.Group;
    private activeBullets: Set<Phaser.Physics.Arcade.Sprite>;
    private debug: boolean = false;

    constructor(scene: Phaser.Scene, owner: Phaser.GameObjects.Sprite, bulletTexture: string, maxCount = 2048) {
        this.owner = owner;
        this.activeBullets = new Set();

        this.bulletGroup = scene.physics.add.group({
            name: `boss-bullets-${Phaser.Math.RND.uuid()}`,
            enable: false,
            classType: Phaser.Physics.Arcade.Sprite
        });

        this.bulletGroup.createMultiple({
            key: bulletTexture,
            quantity: maxCount,
            active: false,
            visible: false
        });

        this.bulletGroup.setDepth(6);

        scene.events.on('update', this.update, this);
        owner.once(Phaser.GameObjects.Events.DESTROY, this.cleanup, this);
    }

    private update(time: number, delta: number): void {
        this.activeBullets.forEach(bullet => {
            if (!bullet.active) {
                this.activeBullets.delete(bullet);
                return;
            }

            const lifespan = bullet.getData('lifespan') as number;
            const newLifespan = lifespan - delta;
            bullet.setData('lifespan', newLifespan);

            if (this.debug && newLifespan <= 0) {
                console.log('Disabling bullet via update', bullet.body?.velocity);
            }

            if (newLifespan <= 0) {
                bullet.disableBody(true, true);
                this.activeBullets.delete(bullet);
            }
        });
    }

    spawn(config: BulletSpawnConfig): void {
        config.directions.forEach(direction => {
            const bullet = this.bulletGroup.getFirstDead(false);
            if (!bullet) {
                if (this.debug) console.warn("No available bullets in pool!");
                return;
            }

            const spawnX = config.spawnPosition?.x ?? this.owner.x;
            const spawnY = config.spawnPosition?.y ?? this.owner.y;

            bullet.enableBody(true, spawnX, spawnY, true, true);
            bullet.setData('lifespan', config.lifespan);
            bullet.setScale(config.scale ?? 1);
            
            if (config.size) bullet.body?.setSize(config.size.width, config.size.height);
            if (config.animationKey) bullet.play(config.animationKey);
            if (config.flipY) bullet.setFlipY(true);

            if (bullet.body) {
                bullet.body.velocity.x = direction.x * config.speed;
                bullet.body.velocity.y = direction.y * config.speed;
            }

            this.activeBullets.add(bullet);
        });
    }

    destroyBullet(bullet: Phaser.Physics.Arcade.Sprite): void {
        if (bullet.active) {
            bullet.disableBody(true, true);
            this.activeBullets.delete(bullet);
        }
    }

    bulletClear(): void {
        this.activeBullets.forEach(bullet => {
            this.destroyBullet(bullet);
        });
    }

    cleanup(): void {
        this.activeBullets.clear();
        this.bulletGroup.clear(true, true);
        this.owner.scene?.events.off('update', this.update, this);
    }

    getGroup(): Phaser.Physics.Arcade.Group {
        return this.bulletGroup;
    }
}
