import { GameSettings, HighScoreRecord } from '../types/interfaces';

const SETTINGS_KEY = 'game_settings';
const HIGHSCORES_KEY = 'game_highscores';

export class LocalStorageManager {
    // Загрузка настроек
    static loadSettings(): GameSettings {
        const defaultSettings = this.getDefaultConfig();

        try {
            const saved = localStorage.getItem(SETTINGS_KEY);
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (e) {
            console.error('Failed to load settings', e);
            return defaultSettings;
        }
    }

    static getDefaultConfig(): GameSettings {
        return {
            musicVolume: 0.5,
            sfxVolume: 0.1,
            showFPS: true,
            weaponType: 'wide'
        };
    }

    // Сохранение настроек
    static saveSettings(settings: GameSettings): void {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    }

    // Загрузка таблицы рекордов
    static loadHighScores(): HighScoreRecord[] {
        const defaultHighScores: HighScoreRecord[] = Array(10).fill(null).map((_, i) => ({
            name: `NoEntry`,
            score: (10 - i) * 1000,
            level: (10 - i) >= 3 ? 'All' : (10 - i) as number,
            date: new Date(Date.now() - (i * 86400000)).toISOString()
        }));

        try {
            const saved = localStorage.getItem(HIGHSCORES_KEY);
            return saved ? JSON.parse(saved) : defaultHighScores;
        } catch (e) {
            console.error('Failed to load highscores', e);
            return defaultHighScores;
        }
    }

    // Сохранение таблицы рекордов
    static saveHighScores(records: HighScoreRecord[]): void {
        try {
            // Сортируем по убыванию и берем топ-10
            const sorted = [...records]
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);
                
            localStorage.setItem(HIGHSCORES_KEY, JSON.stringify(sorted));
        } catch (e) {
            console.error('Failed to save highscores', e);
        }
    }

    // Добавление нового рекорда
    static addHighScore(record: Omit<HighScoreRecord, 'date'>): HighScoreRecord[] {
        const records = this.loadHighScores();
        const newRecord = {
            ...record,
            date: new Date().toISOString()
        };
        
        const updatedRecords = [...records, newRecord]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
            
        this.saveHighScores(updatedRecords);
        return updatedRecords;
    }

    static isScoreInTop(score: number): boolean {
        const records = this.loadHighScores();
        return records.length < 10 || score > records[records.length - 1].score;
    }
}