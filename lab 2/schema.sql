DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
    email VARCHAR(255) UNIQUE NOT NULL,  -- Email (unique)
    password VARCHAR(255) NOT NULL,  -- password
    firstname VARCHAR(255) NOT NULL,
    familyname VARCHAR(255) NOT NULL,
    gender CHAR(1) NOT NULL,
    city VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL
);

INSERT INTO users (email, password, firstname, familyname, gender, city, country)
VALUES 
    ('user@example.com', 'password123', 'Test', 'User', 'm', 'Linkoping', 'Sweden'),  
    ('admin@example.com', 'adminpass', 'Test', 'Admin', 'm', 'Linkoping', 'Sweden')
ON CONFLICT (email) DO NOTHING;

CREATE TABLE IF NOT EXISTS messages (
    post_by VARCHAR(255) NOT NULL,
    post_to VARCHAR(255) NOT NULL,
    message TEXT NOT NULL
)