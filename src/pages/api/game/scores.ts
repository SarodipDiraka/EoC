import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdFromToken } from '../../../../lib/auth';
import { query } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await getUserIdFromToken(req);
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        try {
            const result = await query(
                `SELECT id, entry_name, stage, score, date 
                 FROM user_scores 
                 WHERE user_id = $1 
                 ORDER BY score DESC 
                 LIMIT 10`,
                [userId]
            );

            return res.status(200).json(result.rows);
        } catch (error) {
            console.error('Error fetching scores:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    } 
    else if (req.method === 'POST') {
        const { entry_name, stage, score } = req.body;

        try {
            // Добавляем новый результат
            await query(
                `INSERT INTO user_scores (user_id, entry_name, stage, score)
                 VALUES ($1, $2, $3, $4)`,
                [userId, entry_name, stage, score]
            );

            // Получаем обновленный топ-10
            const result = await query(
                `SELECT id, entry_name, stage, score, date 
                 FROM user_scores 
                 WHERE user_id = $1 
                 ORDER BY score DESC 
                 LIMIT 10`,
                [userId]
            );

            // Удаляем результаты, не вошедшие в топ-10
            await query(
                `DELETE FROM user_scores 
                 WHERE user_id = $1 AND id NOT IN (
                     SELECT id FROM user_scores 
                     WHERE user_id = $1 
                     ORDER BY score DESC 
                     LIMIT 10
                 )`,
                [userId]
            );

            return res.status(200).json(result.rows);
        } catch (error) {
            console.error('Error saving score:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    } else if (req.method === 'DELETE') {
        try {
            await query(
                `DELETE FROM user_scores WHERE user_id = $1`,
                [userId]
            );

            return res.status(200).json({ message: 'Scores cleared' });
        } catch (error) {
            console.error('Error clearing scores:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    } 
    else {
        return res.status(405).json({ message: 'Method not allowed' });
    }
}