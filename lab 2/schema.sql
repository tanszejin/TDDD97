-- drop all tables first 
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS messages;

CREATE TABLE IF NOT EXISTS users (
    email VARCHAR(255) UNIQUE NOT NULL,  
    password VARCHAR(255) NOT NULL,  
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
    from_email VARCHAR(255) NOT NULL,
    to_email VARCHAR(255) NOT NULL,
    content TEXT NOT NULL
);

INSERT INTO messages (from_email, to_email, content)
VALUES 
    ('user@example.com', 'admin@example.com', 'from user to admin'),  
    ('admin@example.com', 'user@example.com', 'from admin to user');

CREATE TABLE IF NOT EXISTS logged_in_users (
    email VARCHAR(255) UNIQUE NOT NULL,
    token VARCHAR(255) NOT NULL
);

-- INSERT INTO logged_in_users (email, token)
-- VALUES 
--     ('loggedin@example.com', 't');