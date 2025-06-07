import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdFromToken } from '../../../../lib/auth';
import { isDbConnected, query } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!(await isDbConnected())) {
        return res.status(200).json({
            sound_volume: 0.1,
            music_volume: 0.5,
            shot_type: 'wide',
            fps: true,
            localMode: true
        });
    }

    const userId = await getUserIdFromToken(req);
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        try {
            const result = await query(
                'SELECT sound_volume, music_volume, shot_type, fps FROM user_settings WHERE user_id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                await query(
                    'INSERT INTO user_settings (user_id) VALUES ($1)',
                    [userId]
                );
                return res.status(200).json({
                    sound_volume: 0.1,
                    music_volume: 0.5,
                    shot_type: 'wide',
                    fps: true
                });
            }

            const row = result.rows[0];
            return res.status(200).json({
            sound_volume: parseFloat(row.sound_volume),
            music_volume: parseFloat(row.music_volume),
            shot_type: row.shot_type,
            fps: row.fps
            });
        } catch (error) {
            console.error('Error fetching settings:', error);
            return res.status(500).json({ 
                sound_volume: 0.1,
                music_volume: 0.5,
                shot_type: 'wide',
                fps: true,
                localMode: true
            });
        }
    } else if (req.method === 'POST') {
        try {
            const { sound_volume, music_volume, shot_type, fps } = req.body;

            // Валидация входящих данных
            if (typeof sound_volume !== 'number' || sound_volume < 0 || sound_volume > 1 ||
                typeof music_volume !== 'number' || music_volume < 0 || music_volume > 1 ||
                !['wide', 'laser', 'rockets'].includes(shot_type) ||
                typeof fps !== 'boolean') {
                return res.status(400).json({ message: 'Invalid settings data' });
            }

            await query(`
                INSERT INTO user_settings 
                (user_id, sound_volume, music_volume, shot_type, fps)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (user_id) DO UPDATE SET
                    sound_volume = EXCLUDED.sound_volume,
                    music_volume = EXCLUDED.music_volume,
                    shot_type = EXCLUDED.shot_type,
                    fps = EXCLUDED.fps
                RETURNING *
            `, [userId, sound_volume, music_volume, shot_type, fps]);

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error saving settings:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    } else {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
}