from flask import request, jsonify
from flask_sock import Sock
from twiddlerApp import app, sock
import math, random
import json
from twiddlerApp import database_helper
import re

#server routes

active_connections = {}
token_to_socket = {}

@sock.route('/ws')
def ws(ws):
    """WebSocket endpoint for real-time communication"""
    # Authentication is needed for WebSocket
    token = None
    
    try:
        # Get the token from the first message
        message = ws.receive(timeout=30)  # Set a timeout for security
        if not message:
            return
        
        data = json.loads(message)
        token = data.get('token')
        
        if not token or token not in logged_in_users:
            ws.send(json.dumps({"type": "error", "message": "Invalid or expired token"}))
            return
        
        email = logged_in_users[token]
        print(f"WebSocket connection established for user: {email}")
        
        # Store the WebSocket connection
        token_to_socket[token] = ws
        
        # Keep the connection alive
        while True:
            message = ws.receive()
            if message is None:
                break  # Connection closed
            
            # Process other message types if needed
            
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Clean up when connection is closed
        if token and token in token_to_socket:
            print(f"WebSocket connection closed for token: {token}")
            del token_to_socket[token]

@app.route('/')
def serve_client():
    # Serve the client.html file from the static folder
    return app.send_static_file('client.html')

@app.teardown_request
def teardown(exception):
    database_helper.disconnect()

# initialise with simple values for easy testing
logged_in_users = {"t":"user@example.com"}

@app.route('/sign_in', methods = ['POST'])
def sign_in():
    data = request.get_json()
    fields = ['email', 'password']

    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            return 'Invalid input', 400
        
    # validate email
    valid = re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', data['email'])
    if not valid:
        response = jsonify({'success':'False', 'message':'Invalid email'})
        return response, 401

    # validate password
    if len(data['password']) < 8:
        response = jsonify({'success':'False', 'message':'Invalid password'})
        return response, 401
    
    # validate email exists
    if not database_helper.user_exists(data['email']):
        response = jsonify({'success':'False', 'message':'Invalid username'})
        return response, 400

    resp = database_helper.get_user_password(data['email'])
    if resp:
        # check password match
        if data['password'] == resp['password']:

            # Check if user is already logged in
            for token, email in list(logged_in_users.items()):
                if email == data['email']:
                    # User is already logged in, send logout notification
                    if token in token_to_socket:
                        try:
                            # Send logout message to existing connection
                            logout_message = json.dumps({
                                "type": "logout", 
                                "message": "You have been logged out because someone logged in from another browser."
                            })
                            token_to_socket[token].send(logout_message)
                        except Exception as e:
                            print(f"Error sending logout message: {e}")
                    
                    # Remove old token
                    del logged_in_users[token]
                    if token in token_to_socket:
                        del token_to_socket[token]
            token = generate_token()
            logged_in_users[token] = data['email']      # add token to dictionary of logged in users
            response = jsonify({'success':'True', 'message':'Successfully signed in', 'data':token})
            response.headers['Authorization'] = f'{token}'   # authorisation header for sending and receiving token
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
        
    # validate email
    valid = re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', data['email'])
    if not valid:
        response = jsonify({'success':'False', 'message':'Invalid email'})
        return response, 400
    
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


@app.route('/sign_out', methods = ['DELETE'])
def sign_out():
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400

    # validate input
    if not token:
        response = jsonify({'success':'False', 'message':'Invalid input'})
        return response, 400
        
    if token in logged_in_users:
        if token in token_to_socket:
            del token_to_socket[token]
        logged_in_users.pop(token)
        response = jsonify({'success':'True', 'message':'Successfully signed out'})
        return response, 200
    else:
        # token is not in dictionary of logged in users
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400


@app.route('/change_password', methods = ['PUT'])
def change_password():
    data = request.get_json()
    fields = ['oldpassword', 'newpassword']
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400

    # validate input
    if not token:
        response = jsonify({'success':'False', 'message':'Invalid input'})
        return response, 400

    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            return 'Invalid input', 400
        
    # validate token
    if token not in logged_in_users:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400
    
    # validate new password
    if len(data['newpassword']) < 8:
        response = jsonify({'success':'False', 'message':'Invalid new password'})
        return response, 400

    email = logged_in_users[token]

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
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400

    # validate input
    if not token:
        response = jsonify({'success':'False', 'message':'Invalid input'})
        return response, 400
    
    # validate token
    if token not in logged_in_users:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400
    
    email = logged_in_users[token]
    resp = database_helper.get_user_data(email)
    response = jsonify({'success':'True', 'message':'User data obtained', 'data':resp[0]})
    return response, 200


@app.route('/get_user_data_by_email/<email>', methods = ['GET'])
def get_user_data_by_email(email):
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400

    # validate input
    if not token:
        response = jsonify({'success':'False', 'message':'Invalid input'})
        return response, 400
    
    # validate token
    if token not in logged_in_users:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400
    
    # validate email exists
    if not database_helper.user_exists(email):
        response = jsonify({'success':'False', 'message':'User does not exist'})
        return response, 400
    
    resp = database_helper.get_user_data(email)
    response = jsonify({'success':'True', 'message':'User data obtained', 'data':resp})
    return response, 200


@app.route('/get_user_messages_by_token', methods = ['GET'])
def get_user_messages_by_token():
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400

    # validate input
    if not token:
        response = jsonify({'success':'False', 'message':'Invalid input'})
        return response, 400
    
    # validate token
    if token not in logged_in_users:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400
    
    email = logged_in_users[token]
    resp = database_helper.get_user_messages(email)
    response = jsonify({'success':'True', 'message':'User messages obtained', 'data':resp})
    return response, 200


@app.route('/get_user_messages_by_email/<email>', methods = ['GET'])
def get_user_messages_by_email(email):
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400

    # validate input
    if not token:
        response = jsonify({'success':'False', 'message':'Invalid input'})
        return response, 400
    
    # validate token
    if token not in logged_in_users:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400
    
    # validate email exists
    if not database_helper.user_exists(email):
        response = jsonify({'success':'False', 'message':'User does not exist'})
        return response, 400
    
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
        return response, 400

    # validate input
    if not token:
        response = jsonify({'success':'False', 'message':'Invalid input'})
        return response, 400

    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            return 'Invalid input', 400
    
    # validate token
    if token not in logged_in_users:
        response = jsonify({'success':'False', 'message':'Token does not exist'})
        return response, 400
    
    # validate email exists
    if not database_helper.user_exists(data['email']):
        response = jsonify({'success':'False', 'message':'User does not exist'})
        return response, 400
    
    from_email = logged_in_users[token]
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