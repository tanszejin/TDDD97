from flask import Flask
from flask_sock import Sock
app = Flask(__name__)
sock = Sock(app)

import twidderApp.views