import Phaser from 'phaser';

export class GraphicsUtils {
    static createBombItem(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Graphics {
        const graphics = scene.add.graphics();
        
        // Зеленая звезда 32x32
        graphics.fillStyle(0x00ff00, 1);
        graphics.lineStyle(3, 0xffffff, 1); // Более толстая рамка
        this.drawStar(
            graphics,
            x, y,
            5,  // 5 лучей
            16, // Внешний радиус
            8   // Внутренний радиус
        );
        
        return graphics;
    }

    static createHealthItem(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Graphics {
        const graphics = scene.add.graphics();
        
        // Красная звезда 32x32
        graphics.fillStyle(0xff0000, 1);
        graphics.lineStyle(3, 0xffffff, 1);
        this.drawStar(
            graphics,
            x, y,
            5,  // 5 лучей
            16, // Внешний радиус
            8   // Внутренний радиус
        );
        
        return graphics;
    }

    static createPowerItem(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Graphics {
        const size = 16;
        const graphics = scene.add.graphics();
        
        // Красный квадрат 16x16 с толстой внутренней рамкой
        graphics.fillStyle(0xff0000, 1);
        graphics.fillRect(-size/2, -size/2, size, size);
        
        // Толстая белая рамка (3px) внутри квадрата
        graphics.lineStyle(3, 0xffffff, 1);
        graphics.strokeRect(-size/2, -size/2, size, size);
        
        return graphics;
    }

    static createScoreItem(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Graphics {
        const size = 16;
        const graphics = scene.add.graphics();
        
        // Синий квадрат 16x16 с толстой внутренней рамкой
        graphics.fillStyle(0x0000ff, 1);
        graphics.fillRect(-size/2, -size/2, size, size);
        
        // Толстая белая рамка (3px) внутри квадрата
        graphics.lineStyle(3, 0xffffff, 1);
        graphics.strokeRect(-size/2, -size/2, size, size);
        
        return graphics;
    }

    static createBombIcon(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Graphics {
        const graphics = scene.add.graphics();
        
        // Зеленая звезда для иконки бомбы
        graphics.fillStyle(0x00ff00, 1);
        graphics.lineStyle(2, 0xffffff, 1);
        this.drawStar(
            graphics,
            x, y,
            5,  // 5 лучей
            10, // Внешний радиус
            5   // Внутренний радиус
        );
        
        return graphics;
    }

    private static drawStar(
        graphics: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        points: number,
        outerRadius: number,
        innerRadius: number
    ): void {
        const angle = Math.PI / points;
        let rotation = Math.PI / 2 * 3;
    
        graphics.beginPath();
        graphics.moveTo(x, y - outerRadius);
    
        for (let i = 0; i < points; i++) {
            const outerX = x + Math.cos(rotation) * outerRadius;
            const outerY = y + Math.sin(rotation) * outerRadius;
            graphics.lineTo(outerX, outerY);
            rotation += angle;
    
            const innerX = x + Math.cos(rotation) * innerRadius;
            const innerY = y + Math.sin(rotation) * innerRadius;
            graphics.lineTo(innerX, innerY);
            rotation += angle;
        }
    
        graphics.lineTo(x, y - outerRadius);
        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();
    }
}