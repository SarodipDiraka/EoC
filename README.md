Приложение уже развернуто на https://sarodipdiraka.github.io/EoC/  

Сетевые функции в этом варианте отключены  

Запуск  

npm install  

Для работы сервера настроить .env.local  

DB_USER=  
DB_HOST=  
DB_NAME=  
DB_PASSWORD=  
DB_PORT=  
DB_SSL=  
JWT_SECRET=  
Создать бд скриптом  
CREATE TABLE users (  
    id SERIAL PRIMARY KEY,  
    username VARCHAR(50) UNIQUE NOT NULL,  
    password VARCHAR(255) NOT NULL,  
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP  
);  

CREATE TABLE user_settings (  
    id SERIAL PRIMARY KEY,  
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,  
    sound_volume NUMERIC(3, 2) DEFAULT 0.1,  
    music_volume NUMERIC(3, 2) DEFAULT 0.5,  
    shot_type VARCHAR(20) DEFAULT 'wide',  
    fps BOOLEAN DEFAULT TRUE,  
    UNIQUE(user_id)  
);  

CREATE TABLE user_scores (  
    id SERIAL PRIMARY KEY,  
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,  
    entry_name VARCHAR(100) NOT NULL,  
    stage VARCHAR(20) NOT NULL,  
    score INTEGER NOT NULL,  
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP  
);  

CREATE INDEX idx_user_scores_user_id_score ON user_scores(user_id, score DESC);  

npm run dev  
