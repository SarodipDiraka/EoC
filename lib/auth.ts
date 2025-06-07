import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';

export function getUserIdFromToken(req: NextApiRequest): Promise<string | null> {
    return new Promise((resolve) => {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            resolve(null);
            return;
        }
        
        jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
            if (err) {
                console.error('JWT verification error:', err);
                resolve(null);
            } else {
                resolve((decoded as any).userId);
            }
        });
    });
}