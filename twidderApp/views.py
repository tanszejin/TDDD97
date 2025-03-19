from flask import request, jsonify
from flask_sock import Sock
from twidderApp import app, sock
import math, random
import json
from twidderApp import database_helper
import re
import requests

#server routes

active_connections = {}
email_to_socket = {}  # Changed from token_to_socket to email_to_socket

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
        
         # Check token validity from database
        email = database_helper.get_email_by_token(token)
        if not email:
            ws.send(json.dumps({"type": "error", "message": "Invalid or expired token"}))
            return
        
        print(f"WebSocket connection established for user: {email}")
        
        # Store the WebSocket connection using email as key
        email_to_socket[email] = ws
        
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
        if token:
            email = database_helper.get_email_by_token(token)
            if email and email in email_to_socket:
                print(f"WebSocket connection closed for user: {email}")
                del email_to_socket[email]

@app.route('/')
def serve_client():
    # Serve the client.html file from the static folder
    return app.send_static_file('client.html')

@app.teardown_request
def teardown(exception):
    database_helper.disconnect()

@app.route('/sign_in', methods = ['POST'])
def sign_in():
    if request.method != 'POST':
        response = jsonify({'success':'False', 'message':'Method not allowed'})
        return response, 405

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
        return response, 400

    # validate password
    if len(data['password']) < 8:
        response = jsonify({'success':'False', 'message':'Invalid password'})
        return response, 401
    
    # validate email exists
    if not database_helper.user_exists(data['email']):
        response = jsonify({'success':'False', 'message':'Email not found'})
        return response, 404
    try:
        resp = database_helper.get_user_password(data['email'])
        if resp:
            # check password match
            if data['password'] == resp['password']:

                # Check if user is already logged in
                old_token = database_helper.get_token_by_email(data['email'])
                if old_token:
                    # User is already logged in, send logout notification
                    if data['email'] in email_to_socket:
                        try:
                            # Send logout message to existing connection
                            logout_message = json.dumps({
                                "type": "logout", 
                                "message": "You have been logged out because someone logged in from another browser."
                            })
                            email_to_socket[data['email']].send(logout_message)
                        except Exception as e:
                            print(f"Error sending logout message: {e}")
                    
                    # Remove old token from database
                    database_helper.remove_token(old_token)
                    
                    # Remove socket connection
                    if data['email'] in email_to_socket:
                        del email_to_socket[data['email']]
                token = generate_token()
                # Store token in database
                database_helper.store_token(token, data['email'])
                response = jsonify({'success':'True', 'message':'Successfully signed in', 'data':token})
                response.headers['Authorization'] = f'{token}'   # authorisation header for sending and receiving token
                return response, 200
            else:
                # incorrect password
                response = jsonify({'success':'False', 'message':'Incorrect password'})
                return response, 401
        else:
            response = jsonify({'success':'False', 'message':'User not found'})
            return response, 404
    except:
        response = jsonify({'success':'False', 'message':'Server error'})
        return response, 500

def generate_token():       # algorithm is taken from serverstub
    letters = "abcdefghiklmnopqrstuvwwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
    token = ""
    for i in range(36):
        token += letters[math.floor(random.random() * len(letters))]
    return token


@app.route('/sign_up', methods = ['POST'])
def sign_up():
    if request.method != 'POST':
        response = jsonify({'success':'False', 'message':'Method not allowed'})
        return response, 405
    
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
        return response, 409
    
    # create user
    data_list = [data[f] for f in fields]
    if database_helper.create_user(data_list):
        response = jsonify({'success':'True', 'message':'User created successfully'})
        return response, 201
    else:
        response = jsonify({'success':'False', 'message':'Unable to create user'})
        return response, 500


@app.route('/sign_out', methods = ['DELETE'])
def sign_out():
    if request.method != 'DELETE':
        response = jsonify({'success':'False', 'message':'Method not allowed'})
        return response, 405
    
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'No token in header'})
        return response, 400

    # validate input
    if not token:
        response = jsonify({'success':'False', 'message':'Token is null'})
        return response, 400
    
    email = database_helper.get_email_by_token(token)
    if email:
            # Remove socket connection if exists
            if email in email_to_socket:
                del email_to_socket[email]
            
            # Remove token from database
            if database_helper.remove_token(token):
                response = jsonify({'success':'True', 'message':'Successfully signed out'})
                return response, 200
    else:
        # token is not in dictionary of logged in users
        response = jsonify({'success':'False', 'message':'User not logged in'})
        return response, 401


@app.route('/change_password', methods = ['PUT'])
def change_password():
    if request.method != 'PUT':
        response = jsonify({'success':'False', 'message':'Method not allowed'})
        return response, 405
    
    data = request.get_json()
    fields = ['oldpassword', 'newpassword']
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'No token in header'})
        return response, 400

    # validate input
    if not token:
        response = jsonify({'success':'False', 'message':'Token is null'})
        return response, 400

    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            return 'Invalid input', 400
        
    # validate token
    email = database_helper.get_email_by_token(token)
    if not email:
        response = jsonify({'success':'False', 'message':'Token does not exist, user not logged in'})
        return response, 401
    
    # validate new password
    if len(data['newpassword']) < 8:
        response = jsonify({'success':'False', 'message':'Invalid new password'})
        return response, 400

    resp = database_helper.get_user_password(email)
    if resp:
        # check old password match
        if data['oldpassword'] != resp['password']:
            # incorrect password
            response = jsonify({'success':'False', 'message':'Incorrect old password'})
            return response, 401
    else:
        # no user with that email found
        response = jsonify({'success':'False', 'message':'User not found'})
        return response, 404
    
    # update password
    if database_helper.change_password(email, data['newpassword']):
        response = jsonify({'success':'True', 'message':'Password changed successfully'})
        return response, 200
    else:
        response = jsonify({'success':'False', 'message':'Internal server error'})
        return response, 500


@app.route('/get_user_data_by_token', methods = ['GET'])
def get_user_data_by_token():
    if request.method != 'GET':
        response = jsonify({'success':'False', 'message':'Method not allowed'})
        return response, 405
    
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'No token in header'})
        return response, 400

    # validate input
    if not token:
        response = jsonify({'success':'False', 'message':'Token is null'})
        return response, 400
    
    # validate token
    email = database_helper.get_email_by_token(token)
    if not email:
        response = jsonify({'success':'False', 'message':'Token does not exist, user not logged in'})
        return response, 401
    
    resp = database_helper.get_user_data(email)
    if resp:
        response = jsonify({'success':'True', 'message':'User data obtained', 'data':resp[0]})
        return response, 200
    else:
        response = jsonify({'success':'False', 'message':'Internal server error'})
        return response, 500



@app.route('/get_user_data_by_email/<email>', methods = ['GET'])
def get_user_data_by_email(email):
    if request.method != 'GET':
        response = jsonify({'success':'False', 'message':'Method not allowed'})
        return response, 405
    
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'No token in header'})
        return response, 400

    # validate input
    if not token:
        response = jsonify({'success':'False', 'message':'Token is null'})
        return response, 400
    
    # validate token
    if not database_helper.get_email_by_token(token):
        response = jsonify({'success':'False', 'message':'Token does not exist, user not logged in'})
        return response, 401
    
    # validate email exists
    if not database_helper.user_exists(email):
        response = jsonify({'success':'False', 'message':'User not found'})
        return response, 404
    
    resp = database_helper.get_user_data(email)
    if resp:
        response = jsonify({'success':'True', 'message':'User data obtained', 'data':resp})
        return response, 200
    else:
        response = jsonify({'success':'False', 'message':'Internal server error'})
        return response, 500


@app.route('/get_user_messages_by_token', methods = ['GET'])
def get_user_messages_by_token():
    if request.method != 'GET':
        response = jsonify({'success':'False', 'message':'Method not allowed'})
        return response, 405
    
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'No token in header'})
        return response, 400

    # validate input
    if not token:
        response = jsonify({'success':'False', 'message':'Token is null'})
        return response, 400
    
    # validate token
    email = database_helper.get_email_by_token(token)
    if not email:
        response = jsonify({'success':'False', 'message':'Token does not exist, user not logged in'})
        return response, 401
    
    try:
        resp = database_helper.get_user_messages(email)
        response = jsonify({'success':'True', 'message':'User messages obtained', 'data':resp})
        return response, 200
    except:
        response = jsonify({'success':'False', 'message':'Internal server error'})
        return response, 500


@app.route('/get_user_messages_by_email/<email>', methods = ['GET'])
def get_user_messages_by_email(email):
    if request.method != 'GET':
        response = jsonify({'success':'False', 'message':'Method not allowed'})
        return response, 405
    
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'No token in header'})
        return response, 400

    # validate input
    if not token:
        response = jsonify({'success':'False', 'message':'Token is null'})
        return response, 400
    
    # validate token
    user_email = database_helper.get_email_by_token(token)
    if not user_email:
        response = jsonify({'success':'False', 'message':'Token does not exist, user not logged in'})
        return response, 401
    
    # validate email exists
    if not database_helper.user_exists(email):
        response = jsonify({'success':'False', 'message':'User not found'})
        return response, 404
    
    try:
        resp = database_helper.get_user_messages(email)
        response = jsonify({'success':'True', 'message':'User messages obtained', 'data':resp})
        return response, 200
    except:
        response = jsonify({'success':'False', 'message':'Internal server error'})
        return response, 500


@app.route('/post_message', methods = ['POST'])
def post_message():
    if request.method != 'POST':
        response = jsonify({'success':'False', 'message':'Method not allowed'})
        return response, 405
    
    data = request.get_json()
    fields = ['message', 'email']  # latitude and longitude can be null
    try:
        token = request.headers['Authorization']
    except:
        response = jsonify({'success':'False', 'message':'No token in header'})
        return response, 400

    # validate input
    if not token:
        response = jsonify({'success':'False', 'message':'Token is null'})
        return response, 400

    # validate input
    for f in fields:
        if f not in data or data[f] is None or len(data[f]) < 1: 
            return 'Invalid input', 400
    
    # validate token
    email = database_helper.get_email_by_token(token)
    if not email:
        response = jsonify({'success':'False', 'message':'Token does not exist, user not logged in'})
        return response, 401
    
    # validate email exists
    if not database_helper.user_exists(data['email']):
        response = jsonify({'success':'False', 'message':'User not found'})
        return response, 404
    
    # user_ip = request.remote_addr
    # print(user_ip)
    # coordinates = get_coordinates_from_ip(user_ip)    
    from_email = email
    if database_helper.post_message(from_email, data['email'], data['message'], data['latitude'], data['longitude']):
        response = jsonify({'success':'True', 'message':'Message posted successfully'})
        return response, 201
    else:
        response = jsonify({'success':'False', 'message':'Internal server error'})
        return response, 500       

def get_coordinates_from_ip(ip):
    url = f"https://geocode.xyz/{ip}?json=1&auth=10437519277611469283x94815 "
    # url = f"https://geocode.xyz"
    # data = {
    #     'locate': f'{ip}',
    #     'geoit': 'XML'
    # }
    try:
        resp = requests.get(url)
        resp.raise_for_status()
        result = resp.json()
        if "error" in result:
            print(result['error']['description'])
            return None
        return {'latitude': result.get('latt'), 'longitude': result.get('longt')}
    except:
        print('Error getting location')
        return None

if __name__ == '__main__':
    with app.app_context():    
        database_helper.initialise_db()
        app.debug = True
        app.run()