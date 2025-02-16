from flask import Flask, request, jsonify
import math, random
import database_helper

app = Flask(__name__)

@app.route("/", methods = ['GET'])
def root():
    return "", 200

@app.teardown_request
def teardown(exception):
    database_helper.disconnect()

logged_in_users = {}

@app.route('/sign_in', methods = ['POST'])
def sign_in():
    data = request.get_json()
    fields = ['email', 'password']

    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            return 'Invalid input', 400

    # validate email and password
    if '@' not in data['email'] or len(data['password']) < 8:
        response = jsonify({'success':'False', 'message':'Invalid username or password'})
        return response, 401
    
    # validate email exists
    if not database_helper.user_exists(data['email']):
        response = jsonify({'success':'False', 'message':'Invalid username'})
        return response, 400

    resp = database_helper.get_user_password(data['email'])
    if resp:
        # check password match
        if data['password'] == resp['password']:
            # correct password
            token = generate_token()
            logged_in_users[token] = data['email']      # add token to dictionary of logged in users
            response = jsonify({'success':'True', 'message':'Successfully signed in', 'data':token})
            response.headers['Authorisation'] = f'Bearer {token}'   # authorisation header for sending and receiving token
            return response, 200
        else:
            # incorrect password
            response = jsonify({'success':'False', 'message':'Incorrect password'})
            return response, 401
    else:
        response = jsonify({'success':'False', 'message':'Incorrect username or password'})
        return response, 401


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
            return 'Invalid input', 400
    
    # check if user already exists
    if database_helper.user_exists(data['email']):
        response = jsonify({'success':'False', 'message':'User already exists'})
        return response, 400
    
    # create user
    data_list = [data[f] for f in fields]
    if database_helper.create_user(data_list):
        response = jsonify({'success':'True', 'message':'User created successfully'})
        return response, 201
    else:
        response = jsonify({'success':'False', 'message':'Unable to create user'})
        return response, 400


@app.route('/sign_out', methods = ['POST'])
def sign_out():
    data = request.get_json()
    fields = ['token']

    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            return 'Invalid input', 400
        
    try:
        logged_in_users.pop(data['token'])
        response = jsonify({'success':'True', 'message':'Successfully signed out'})
        return response, 200
    except:
        # token is not in dictionary of logged in users
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400


@app.route('/change_password', methods = ['PUT'])
def change_password():
    data = request.get_json()
    fields = ['token', 'oldpassword', 'newpassword']

    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            return 'Invalid input', 400
        
    # validate token
    if data['token'] not in logged_in_users:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400
    
    # validate new password
    if len(data['newpassword']) < 8:
        response = jsonify({'success':'False', 'message':'Invalid new password'})
        return response, 400

    email = logged_in_users[data['token']]

    resp = database_helper.get_user_password(email)
    if resp:
        # check old password match
        if data['oldpassword'] != resp['password']:
            # incorrect password
            response = jsonify({'success':'False', 'message':'Incorrect old password'})
            return response, 401
    else:
        # no user with that email found
        response = jsonify({'success':'False', 'message':'Unable to find user'})
        return response, 400
    
    # update password
    if database_helper.change_password(email, data['newpassword']):
        response = jsonify({'success':'True', 'message':'Password changed successfully'})
        return response, 200
    else:
        response = jsonify({'success':'False', 'message':'Unable to change password'})
        return response, 400


@app.route('/get_user_data_by_token', methods = ['GET'])
def get_user_data_by_token():
    data = request.get_json()
    fields = ['token']

    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            return 'Invalid input', 400
    
    # validate token
    if data['token'] not in logged_in_users:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400
    
    email = logged_in_users[data['token']]
    resp = database_helper.get_user_data(email)
    response = jsonify({'success':'True', 'message':'User data obtained', 'data':resp[0]})
    return response, 200


@app.route('/get_user_data_by_email', methods = ['GET'])
def get_user_data_by_email():
    data = request.get_json()
    fields = ['token', 'email']

    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            return 'Invalid input', 400
    
    # validate token
    if data['token'] not in logged_in_users:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400
    
    # validate email exists
    if not database_helper.user_exists(data['email']):
        response = jsonify({'success':'False', 'message':'User does not exist'})
        return response, 400
    
    resp = database_helper.get_user_data(data['email'])
    response = jsonify({'success':'True', 'message':'User data obtained', 'data':resp})
    return response, 200


@app.route('/get_user_messages_by_token', methods = ['GET'])
def get_user_messages_by_token():
    data = request.get_json()
    fields = ['token']

    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            return 'Invalid input', 400
    
    # validate token
    if data['token'] not in logged_in_users:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400
    
    email = logged_in_users[data['token']]
    resp = database_helper.get_user_messages(email)
    response = jsonify({'success':'True', 'message':'User messages obtained', 'data':resp})
    return response, 200


@app.route('/get_user_messages_by_email', methods = ['GET'])
def get_user_messages_by_email():
    data = request.get_json()
    fields = ['token', 'email']

    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            return 'Invalid input', 400
    
    # validate token
    if data['token'] not in logged_in_users:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400
    
    # validate email exists
    if not database_helper.user_exists(data['email']):
        response = jsonify({'success':'False', 'message':'User does not exist'})
        return response, 400
    
    resp = database_helper.get_user_messages(data['email'])
    response = jsonify({'success':'True', 'message':'User messages obtained', 'data':resp})
    return response, 200


@app.route('/post_message', methods = ['POST'])
def post_message():
    data = request.get_json()
    fields = ['token', 'message', 'email']

    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            return 'Invalid input', 400
    
    # validate token
    if data['token'] not in logged_in_users:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400
    
    # validate email exists
    if not database_helper.user_exists(data['email']):
        response = jsonify({'success':'False', 'message':'User does not exist'})
        return response, 400
    
    from_email = logged_in_users[data['token']]
    if database_helper.post_message(from_email, data['email'], data['message']):
        response = jsonify({'success':'True', 'message':'Message posted successfully'})
        return response, 201
    else:
        response = jsonify({'success':'False', 'message':'Unable to post message'})
        return response, 400       


if __name__ == '__main__':
    with app.app_context():    
        database_helper.initialise_db()
        app.debug = True
        app.run()