import sqlite3
from flask import g
import os
DATABASE_URI = os.path.join(os.path.dirname(__file__), 'database.db')

# DATABASE_URI = "/twiddlerApp/database.db"

def get_db():
    db = getattr(g, 'db', None)
    if db is None:
        db = g.db = sqlite3.connect(DATABASE_URI)
        db.row_factory = sqlite3.Row
    return db

def disconnect():
    db = getattr(g, 'db', None)
    if db is not None:
        g.db.close()
        g.db = None

def initialise_db():
    con = get_db()
    cursor = con.cursor()
    with open('/twiddlerApp/schema.sql', 'r') as f:
        sql = f.read()
    cursor.executescript(sql)
    con.commit()
    con.close()

def get_user_password(email:str):
    cursor = get_db().execute("select email, password from users where email == ?;", [email])
    match = cursor.fetchone()
    cursor.close()
    if match:
        return {'email': match[0], 'password': match[1]}
    else:
        return None

def user_exists(email:str) -> bool:
    cursor = get_db().execute("select * from users where email == ?;", [email])
    match = cursor.fetchone()
    cursor.close()
    if match:
        return True
    else:
        return False

def create_user(data_list:list) -> bool:
    try:
        get_db().execute("insert into users values(?,?,?,?,?,?,?);", data_list)
        get_db().commit()
        return True
    except:
        return False

def change_password(email:str, newpassword:str) -> bool:
    try:
        get_db().execute("update users set password = ? where email = ?;", [newpassword, email])
        get_db().commit()
        return True
    except:
        return False

def get_user_data(email:str):
    cursor = get_db().execute("select email, firstname, familyname, gender, city, country from users where email like ?;", [email])
    matches = cursor.fetchall()
    cursor.close()
    result = []
    for match in matches:
        result.append({'email': match[0], 'firstname': match[1], 'familyname': match[2], 
            'gender': match[3], 'city': match[4], 'country': match[5]})
    print(result)
    return result

def get_user_messages(email:str) -> list:
    cursor = get_db().execute("select from_email, content from messages where to_email == ?;", [email])
    matches = cursor.fetchall()
    cursor.close()
    result = []
    for match in matches:
        result.append({'writer': match[0], 'message': match[1]})
    return result

def post_message(from_email:str, to_email:str, content:str) -> bool:
    try:    
        get_db().execute("insert into messages values(?,?,?);", [from_email, to_email, content])
        get_db().commit()
        return True
    except:
        return False
    
def ensure_tokens_table_exists():
    """Make sure the tokens table exists in the database"""
    try:
        get_db().execute('''
        CREATE TABLE IF NOT EXISTS tokens (
            token TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (email) REFERENCES users (email)
        );
        ''')
        get_db().commit()
        return True
    except Exception as e:
        print(f"Error creating tokens table: {e}")
        return False

def store_token(token:str, email:str) -> bool:
    """Store a token in the database with no expiration"""
    try:
        # Ensure tokens table exists
        ensure_tokens_table_exists()
        
        # First remove any existing tokens for this email
        get_db().execute("DELETE FROM tokens WHERE email = ?;", [email])
        
        # Insert new token
        get_db().execute(
            "INSERT INTO tokens (token, email) VALUES (?, ?);",
            [token, email]
        )
        get_db().commit()
        return True
    except Exception as e:
        print(f"Error storing token: {e}")
        return False

def get_email_by_token(token:str) -> str:
    """Get the email associated with a token"""
    try:
        # Ensure tokens table exists
        ensure_tokens_table_exists()
        
        cursor = get_db().execute(
            "SELECT email FROM tokens WHERE token = ?;",
            [token]
        )
        result = cursor.fetchone()
        cursor.close()
        
        if result:
            return result['email']
        
        return None
    except Exception as e:
        print(f"Error getting email by token: {e}")
        return None

def get_token_by_email(email:str) -> str:
    """Get the token associated with an email"""
    try:
        # Ensure tokens table exists
        ensure_tokens_table_exists()
        
        cursor = get_db().execute(
            "SELECT token FROM tokens WHERE email = ?;",
            [email]
        )
        result = cursor.fetchone()
        cursor.close()
        
        if result:
            return result['token']
        
        return None
    except Exception as e:
        print(f"Error getting token by email: {e}")
        return None

def remove_token(token:str) -> bool:
    """Remove a token from the database"""
    try:
        # Ensure tokens table exists
        ensure_tokens_table_exists()
        
        get_db().execute("DELETE FROM tokens WHERE token = ?;", [token])
        get_db().commit()
        return True
    except Exception as e:
        print(f"Error removing token: {e}")
        return False
