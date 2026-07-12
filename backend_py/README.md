# PulseQueue Python Backend

This backend is a Python/MongoDB alternative to the existing Node/Prisma implementation.

## Run

1. Activate the virtualenv:
   ```powershell
   .\.venv\Scripts\activate
   ```
2. Install dependencies:
   ```powershell
   python -m pip install -r requirements.txt
   ```
3. Start the app:
   ```powershell
   uvicorn backend_py.main:app --reload --host 0.0.0.0 --port 8001
   ```

## Environment

- `MONGODB_URI`: MongoDB connection string
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_TTL_MIN`
- `JWT_REFRESH_TTL_DAYS`
