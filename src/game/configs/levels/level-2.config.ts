import { LevelConfig } from "@/game/types/interfaces";

const level2: LevelConfig = {
    waves: [
        {
            duration: 40000,
            delayAfter: 4000,
            initialDelay: 8000,
            spawners: [
                {
                    enemyType: "scout",
                    interval: 10000,
                    groupSize: 20,
                    patternType: "spiral",
                    patternParams: {
                        type: "spiral",
                        params: {
                            centerX: 250,
                            centerY: -100,
                            radiusStep: 15,
                            angleStep: 0.3
                        }
                    }
                }
            ]
        },
        {
            duration: 20000,
            delayAfter: 4000,
            spawners: [
                {
                    enemyType: "scout",
                    interval: 3000,
                    groupSize: 20,
                    patternType: "wave",
                    patternParams: {
                        type: "wave",
                        params: {
                            startX: 50,
                            startY: -50,
                            amplitude: 100,
                            wavelength: 60,
                            direction: "horizontal"
                        }
                    }
                }
            ]
        },
        {
            duration: 5000,
            delayAfter: 4000,
            spawners: [
                {
                    enemyType: 'fighter',
                    interval: 2000,
                    groupSize: 3,
                    count: 3,
                    patternType: 'direct',
                    patternParams: {
                        type: 'direct',
                        params: {
                            positions: [
                                { x: 100, y: -50 },
                                { x: 200, y: -50 },
                                { x: 300, y: -50 }
                            ]
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

export default level2;