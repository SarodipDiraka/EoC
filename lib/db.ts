import { Pool } from 'pg';

const isServer = typeof window === 'undefined';

let pool: Pool | null = null;

if (isServer) {
    console.log('Initializing database pool...');
    pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    console.log('DB connection settings:', {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '5432')
    });

    pool.on('connect', () => {
        console.log('New client connected to the pool');
    });

    pool.on('error', (err) => {
        console.error('Unexpected database error:', err);
    });
} else {
    console.log('Running in client environment - DB pool not initialized');
}

export async function checkConnection(): Promise<boolean> {
    if (!isServer || !pool) {
        console.log('checkConnection: Not on server or pool not initialized');
        return false;
    }

    try {
        console.log('Attempting to connect to database...');
        const client = await pool.connect();
        client.release();
        console.log('Database connection check successful');
        return true;
    } catch (error) {
        console.error('Database connection error:', error);
        return false;
    }
}

export async function query(text: string, params?: any[]) {
    if (!isServer || !pool) {
        console.error('Attempted to query database from client side');
        throw new Error('Database queries can only be executed on the server side');
    }

    const connected = await checkConnection();
    if (!connected) {
        throw new Error('Database is not connected');
    }

    try {
        console.log(`Executing query: ${text}`, params || '');
        const result = await pool.query(text, params);
        console.log('Query executed successfully');
        return result;
    } catch (error) {
        console.error('Query failed:', text, error);
        throw error;
    }
}

export async function isDbConnected(): Promise<boolean> {
    return checkConnection();
}
