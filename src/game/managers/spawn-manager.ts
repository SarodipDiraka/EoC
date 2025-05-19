import { PatternType, RandomPatternParams, LinePatternParams, DirectPatternParams, CirclePatternParams, PatternParams, SpiralPatternParams, WavePatternParams } from '../types/interfaces';

export class SpawnManager {
    static getSpawnPositions(
        patternType: PatternType,
        params: PatternParams['params'],
        groupSize: number
    ): { x: number; y: number }[] {
        switch (patternType) {
            case 'random':
                return this.getRandomPositions(params as RandomPatternParams, groupSize);
            case 'line':
                return this.getLinePositions(params as LinePatternParams, groupSize);
            case 'direct':
                return this.getDirectPositions(params as DirectPatternParams, groupSize);
            case 'spiral':
                return this.getSpiralPositions(params as SpiralPatternParams, groupSize);
            case 'circle':
                return this.getCirclePositions(params as CirclePatternParams, groupSize);
            case 'wave':
                return this.getWavePositions(params as WavePatternParams, groupSize);
            default:
                console.warn(`Unknown pattern type: ${patternType}, using random`);
                return this.getRandomPositions(
                    { minX: 0, maxX: 800, minY: -50, maxY: -20 }, 
                    groupSize
                );
        }
    }

    private static getRandomPositions(params: RandomPatternParams, groupSize: number): { x: number; y: number }[] {
        const positions: { x: number; y: number }[] = [];
        for (let i = 0; i < groupSize; i++) {
            positions.push({
                x: Phaser.Math.Between(params.minX, params.maxX),
                y: Phaser.Math.Between(params.minY, params.maxY)
            });
        }
        return positions;
    }

    private static getLinePositions(params: LinePatternParams, groupSize: number): { x: number; y: number }[] {
        const positions: { x: number; y: number }[] = [];
        let currentX = params.startX;
        let currentY = params.startY;
        for (let i = 0; i < groupSize; i++) {
            positions.push({ x: currentX, y: currentY });
            currentX += params.stepX;
            currentY += params.stepY;
        }
        return positions;
    }

    private static getDirectPositions(params: DirectPatternParams, groupSize: number): { x: number; y: number }[] {
        return params.positions.slice(0, groupSize);
    }

    private static getSpiralPositions(
        params: SpiralPatternParams, 
        groupSize: number
    ): { x: number; y: number }[] {
        const positions: { x: number; y: number }[] = [];
        let radius = params.initialRadius || 0;
        let angle = params.initialAngle || 0;

        for (let i = 0; i < groupSize; i++) {
            positions.push({
                x: params.centerX + Math.cos(angle) * radius,
                y: params.centerY + Math.sin(angle) * radius
            });
            
            radius += params.radiusStep;
            angle += params.angleStep;
        }

        return positions;
    }

    private static getCirclePositions(
        params: CirclePatternParams, 
        groupSize: number
    ): { x: number; y: number }[] {
        const positions: { x: number; y: number }[] = [];
        const angleStep = (params.fullCircle ? Math.PI * 2 : Math.PI) / groupSize;
        let angle = params.startAngle || 0;

        for (let i = 0; i < groupSize; i++) {
            positions.push({
                x: params.centerX + Math.cos(angle) * params.radius,
                y: params.centerY + Math.sin(angle) * params.radius
            });
            
            angle += angleStep;
        }

        return positions;
    }

    private static getWavePositions(
        params: WavePatternParams, 
        groupSize: number
    ): { x: number; y: number }[] {
        const positions: { x: number; y: number }[] = [];
        let x = params.startX;
        let y = params.startY;

        for (let i = 0; i < groupSize; i++) {
            positions.push({ x, y });
            
            if (params.direction === 'horizontal') {
                x += params.wavelength;
                y = params.startY + Math.sin(i * 0.5) * params.amplitude;
            } else {
                y += params.wavelength;
                x = params.startX + Math.sin(i * 0.5) * params.amplitude;
            }
        }

        return positions;
    }
}