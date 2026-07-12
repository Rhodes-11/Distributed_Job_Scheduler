import inspect
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import backend_py.lib.auth as auth

print('issue_refresh_token:', auth.issue_refresh_token)
print('type:', type(auth.issue_refresh_token))
print('is coroutine:', inspect.iscoroutinefunction(auth.issue_refresh_token))
print('flags:', auth.issue_refresh_token.__code__.co_flags)
print('rotate_refresh_token:', auth.rotate_refresh_token)
print('type:', type(auth.rotate_refresh_token))
print('is coroutine:', inspect.iscoroutinefunction(auth.rotate_refresh_token))
print('flags:', auth.rotate_refresh_token.__code__.co_flags)
print('revoke_refresh_token:', auth.revoke_refresh_token)
print('type:', type(auth.revoke_refresh_token))
print('is coroutine:', inspect.iscoroutinefunction(auth.revoke_refresh_token))
print('flags:', auth.revoke_refresh_token.__code__.co_flags)
