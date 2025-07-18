CREATE DATABASE smartcart;

\connect smartcart

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    avg_price DECIMAL(10,2),
    unit VARCHAR(50),
    availability JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_carts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    items JSONB,
    parsing_stats JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE parsing_analytics (
    id SERIAL PRIMARY KEY,
    date DATE,
    lists_processed INTEGER,
    items_extracted INTEGER,
    avg_confidence DECIMAL(5,3),
    processing_time_ms INTEGER,
    method VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    section VARCHAR(100),
    settings JSONB,
    updated_at TIMESTAMP DEFAULT NOW()
);
