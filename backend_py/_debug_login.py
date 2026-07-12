import json
import urllib.request
import urllib.error
import pymongo

print('=== HTTP LOGIN TEST ===')
url = 'http://127.0.0.1:8000/api/auth/login'
data = json.dumps({'email': 'demo@pulsequeue.dev', 'password': 'demo1234'}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req, timeout=10) as res:
        print('STATUS', res.status)
        print(res.read().decode())
except urllib.error.HTTPError as e:
    print('HTTPERR', e.code)
    print(e.read().decode())
except Exception as e:
    print('ERR', type(e).__name__, e)

print('\n=== MONGO USER TEST ===')
client = pymongo.MongoClient('mongodb://localhost:27017')
db = client.pulsequeue
print('count', db.users.count_documents({}))
print('user', db.users.find_one({'email': 'demo@pulsequeue.dev'}))
