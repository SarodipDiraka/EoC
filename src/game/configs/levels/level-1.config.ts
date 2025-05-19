import { LevelConfig } from "@/game/types/interfaces";

const level1: LevelConfig = {
    waves: [
        {
            duration: 20000,
            delayAfter: 4000,
            spawners: [
                {
                    enemyType: 'scout',
                    interval: 200,
                    groupSize: 1,
                    patternType: 'random',
                    patternParams: {
                        type: 'random',
                        params: {
                            minX: 30,
                            maxX: 450,
                            minY: -50,
                            maxY: -20
                        }
                    }
                }
            ]
        },
        {
            duration: 18000,
            delayAfter: 1000,
            spawners: [
                {
                    enemyType: "fighter",
                    interval: 6000,
                    groupSize: 8,
                    count: 16,
                    patternType: "line",
                    patternParams: {
                        type: "line",
                        params: {
                            startX: 30,
                            startY: -20,
                            stepX: 60,
                            stepY: 0
                        }
                    }
                }
            ]
        },
        {
            duration: 30000,
            delayAfter: 5000,
            spawners: [
                {
                    enemyType: "circular_fighter",
                    interval: 100000,
                    groupSize: 8,
                    count: 8,
                    patternType: "circle",
                    patternParams: {
                        type: "circle",
                        params: {
                            centerX: 240, // Центр круга
                            centerY: 340, 
                            radius: 300,  // Радиус круга
                            fullCircle: true
                        }
                    }
                }
            ]
        }
    ],
    boss: {
        enemyType: 'firstBoss'
    }
};

export default level1;
