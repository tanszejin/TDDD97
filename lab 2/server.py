from flask import Flask, request, jsonify
import math, random
import database_helper
import re

app = Flask(__name__)

@app.route("/", methods = ['GET'])
def root():
    return "", 200

@app.teardown_request
def teardown(exception):
    database_helper.disconnect()

@app.route('/sign_in', methods = ['POST'])
def sign_in():
    data = request.get_json()
    fields = ['email', 'password']

    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            response = jsonify({'success':'False', 'message':'Invalid input'})
            return response, 200
    
    # vlaidate email
    valid = re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', data['email'])
    if not valid:
        response = jsonify({'success':'False', 'message':'Invalid email'})
        return response, 200

    # validate email and password
    if '@' not in data['email'] or len(data['password']) < 8:
        response = jsonify({'success':'False', 'message':'Invalid username or password'})
        return response, 200
    
    # validate email exists
    if not database_helper.user_exists(data['email']):
        response = jsonify({'success':'False', 'message':'Invalid username'})
        return response, 200

    resp = database_helper.get_user_password(data['email'])
    if resp:
        # check password match
        if data['password'] == resp['password']:
            # correct password
            token = generate_token()
            if database_helper.add_logged_in_user(data['email'], token):
                response = jsonify({'success':'True', 'message':'Successfully signed in', 'data':token})
                response.headers['Authorization'] = f'{token}'   # authorisation header for sending and receiving token
                return response, 200
            else:
                response = jsonify({'success':'False', 'message':'Server error'})
                return response, 200  #500
        else:
            # incorrect password
            response = jsonify({'success':'False', 'message':'Incorrect password'})
            return response, 200
    else:
        response = jsonify({'success':'False', 'message':'No password received'})
        return response, 200


def generate_token():       # algorithm is taken from serverstub
    letters = "abcdefghiklmnopqrstuvwwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
    token = ""
    for i in range(36):
        token += letters[math.floor(random.random() * len(letters))]
    return token


@app.route('/sign_up', methods = ['POST'])
def sign_up():
    data = request.get_json()
    fields = ['email', 'password', 'firstname', 
              'familyname', 'gender', 'city', 'country']
    
    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            response = jsonify({'success':'False', 'message':'Invalid email'})
            return response, 200
        
    # vlaidate email
    valid = re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', data['email'])
    if not valid:
        response = jsonify({'success':'False', 'message':'Invalid email'})
        return response, 200
    
    # check if user already exists
    if database_helper.user_exists(data['email']):
        response = jsonify({'success':'False', 'message':'User already exists'})
        return response, 200
    
    # create user
    data_list = [data[f] for f in fields]
    if database_helper.create_user(data_list):
        response = jsonify({'success':'True', 'message':'User created successfully'})
        return response, 201
    else:
        response = jsonify({'success':'False', 'message':'Unable to create user'})
        return response, 200


@app.route('/sign_out', methods = ['DELETE'])
def sign_out():
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 200

    # validate input
    if not token:
        response = jsonify({'success':'False', 'message':'Invalid input'})
        return response, 200
    
    # validate token
    email = database_helper.get_email_from_token(token)
    if not email:
        response = jsonify({'success':'False', 'message':'No such token'})
        return response, 200
        
    if database_helper.remove_logged_in_user(token):
        response = jsonify({'success':'True', 'message':'Successfully signed out'})
        return response, 200
    else:
        # token is not in dictionary of logged in users
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 200


@app.route('/change_password', methods = ['PUT'])
def change_password():
    data = request.get_json()
    fields = ['oldpassword', 'newpassword']
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 200

    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            response = jsonify({'success':'False', 'message':'Invalid input'})
            return response, 200
        
    # validate token
    if not token:
        response = jsonify({'success':'False', 'message':'Invalid input'})
        return response, 200
    
    email = database_helper.get_email_from_token(token)
    if not email:
        response = jsonify({'success':'False', 'message':'No such token'})
        return response, 200
    
    # validate new password
    if len(data['newpassword']) < 8:
        response = jsonify({'success':'False', 'message':'Invalid new password'})
        return response, 200

    email = database_helper.get_email_from_token(token)
    if not email:
        response = jsonify({'success':'False', 'message':'No such token'})
        return response, 200

    resp = database_helper.get_user_password(email)
    if resp:
        # check old password match
        if data['oldpassword'] != resp['password']:
            # incorrect password
            response = jsonify({'success':'False', 'message':'Incorrect old password'})
            return response, 200
    else:
        # no user with that email found
        response = jsonify({'success':'False', 'message':'Unable to find user'})
        return response, 200
    
    # update password
    if database_helper.change_password(email, data['newpassword']):
        response = jsonify({'success':'True', 'message':'Password changed successfully'})
        return response, 200
    else:
        response = jsonify({'success':'False', 'message':'Unable to change password'})
        return response, 200


@app.route('/get_user_data_by_token', methods = ['GET'])
def get_user_data_by_token():
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 200

    if not token:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 200
    
    # validate token
    email = database_helper.get_email_from_token(token)
    if not email:
        response = jsonify({'success':'False', 'message':'No such token'})
        return response, 200
    
    resp = database_helper.get_user_data(email)
    response = jsonify({'success':'True', 'message':'User data obtained', 'data':resp})
    return response, 200


@app.route('/get_user_data_by_email/<email>', methods = ['GET'])
def get_user_data_by_email(email):
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 200

    if not token or not email:
        response = jsonify({'success':'False', 'message':'Invalid input'})
        return response, 200
    
    # validate token
    user_email = database_helper.get_email_from_token(token)
    if not user_email:
        response = jsonify({'success':'False', 'message':'No such token'})
        return response, 200
    
    # validate email exists
    if not database_helper.user_exists(email):
        response = jsonify({'success':'False', 'message':'User does not exist'})
        return response, 200
    
    resp = database_helper.get_user_data(email)
    response = jsonify({'success':'True', 'message':'User data obtained', 'data':resp})
    return response, 200


@app.route('/get_user_messages_by_token', methods = ['GET'])
def get_user_messages_by_token():
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 200

    if not token:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 200
    
    # validate token
    email = database_helper.get_email_from_token(token)
    if not email:
        response = jsonify({'success':'False', 'message':'No such token'})
        return response, 200
    
    resp = database_helper.get_user_messages(email)
    response = jsonify({'success':'True', 'message':'User messages obtained', 'data':resp})
    return response, 200


@app.route('/get_user_messages_by_email/<email>', methods = ['GET'])
def get_user_messages_by_email(email):
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 200

    if not token or not email:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 200
    
    # validate token
    user_email = database_helper.get_email_from_token(token)
    if not user_email:
        response = jsonify({'success':'False', 'message':'No such token'})
        return response, 200
    
    # validate email exists
    if not database_helper.user_exists(email):
        response = jsonify({'success':'False', 'message':'User does not exist'})
        return response, 200
    
    resp = database_helper.get_user_messages(email)
    response = jsonify({'success':'True', 'message':'User messages obtained', 'data':resp})
    return response, 200


@app.route('/post_message', methods = ['POST'])
def post_message():
    data = request.get_json()
    fields = ['message', 'email']
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 200

    if not token:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 200

    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            response = jsonify({'success':'False', 'message':'Invalid input'})
            return response, 200
    
    # validate token
    from_email = database_helper.get_email_from_token(token)
    if not from_email:
        response = jsonify({'success':'False', 'message':'No such token'})
        return response, 200
    
    # validate email exists
    if not database_helper.user_exists(data['email']):
        response = jsonify({'success':'False', 'message':'User does not exist'})
        return response, 200
    
    if database_helper.post_message(from_email, data['email'], data['message']):
        response = jsonify({'success':'True', 'message':'Message posted successfully'})
        return response, 201
    else:
        response = jsonify({'success':'False', 'message':'Unable to post message'})
        return response, 200       


if __name__ == '__main__':
    with app.app_context():    
        database_helper.initialise_db()
        app.debug = True
        app.run()