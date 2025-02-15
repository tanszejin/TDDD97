import sqlite3
from flask import g

DATABASE_URI = "database.db"

def get_db():
    db = getattr(g, 'db', None)
    if db is None:
        db = g.db = sqlite3.connect(DATABASE_URI)
    return db

def disconnect():
    db = getattr(g, 'db', None)
    if db is not None:
        g.db.close()
        g.db = None

def initialise_db():
    con = get_db()
    cursor = con.cursor()
    with open('schema.sql', 'r') as f:
        sql = f.read()
    cursor.executescript(sql)
    con.commit()
    con.close()

def get_user_password(email):
    cursor = get_db().execute("select email, password from users where email == ?;", [email])
    match = cursor.fetchone()
    cursor.close()
    if match:
        return {'email': match[0], 'password': match[1]}
    else:
        return None

def user_exists(email):
    cursor = get_db().execute("select * from users where email == ?;", [email])
    match = cursor.fetchone()
    cursor.close()
    if match:
        return True
    else:
        return False

def create_user(data_list):
    try:
        get_db().execute("insert into users values(?,?,?,?,?,?,?);", data_list)
        get_db().commit()
        return True
    except:
        return False

def change_password(email, newpassword):
    try:
        get_db().execute("update users set password = ? where email = ?;", [newpassword, email])
        get_db().commit()
        return True
    except:
        return False

def get_user_data(email):
    cursor = get_db().execute("select email, firstname, familyname, gender, city, country from users where email like %?%;", [email])
    matches = cursor.fetchall()
    cursor.close()
    if matches:
        result = []
        for match in matches:
            result.append({'email': match[0], 'firstname': match[1], 'familyname': match[2], 
                'gender': match[3], 'city': match[4], 'country': match[5]})
        return result
    else:
        return None

