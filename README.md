# Ranking System & Transaction Dashboard

This project is a full-stack application designed to demonstrate robust backend engineering fundamentals. It features a FastAPI backend and a Next.js frontend, backed by a serverless PostgreSQL database.

The system gracefully handles concurrent data updates, enforces strict idempotency to prevent duplicate requests, and features a multi-factor ranking algorithm to prevent system manipulation.

## 🚀 How to Run the Project

### Prerequisites

- Python 3.10+
- Node.js v18+
- A PostgreSQL Database (e.g., Neon Serverless, Supabase, or Local Docker)

### 1. Start the Backend (FastAPI)

Navigate to the root directory of the project, set up your virtual environment, and start the server:

Bash

```bash
# 1. Create and activate a virtual environment
python -m venv venv
# On Windows: .\venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate

# 2. Install dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic python-dotenv

# 3. Configure Environment Variables
# Create a .env file in the root directory and add your PostgreSQL connection string:
# DATABASE_URL=postgresql://user:password@your-database-host:5432/dbname?sslmode=require

# 4. Run the server
cd backend
python -m uvicorn main:app --reload
```

*The backend will be available at* *`http://127.0.0.1:8000`*

### 2. Start the Frontend (Next.js)

Open a new terminal window and navigate to the frontend directory:

Bash

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure Environment Variables
# Create a .env.local file in the frontend directory:
# NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

# 3. Run the development server
npm run dev
```

*The interactive dashboard will be available at* *`http://localhost:3000`*

## 📡 How Each API Works

The backend exposes three primary RESTful endpoints. Request validation and type checking are strictly enforced using Pydantic.

### `POST /transaction`

Processes a new transaction and safely updates the user's score.

- **Payload:** `{"transaction_id": "uuid", "user_id": "string", "amount": float}`
- **Behavior:** Validates the amount (must be between 0.01 and 10,000). It checks for idempotency, locks the user's database row to prevent race conditions, updates the user's score/count, and logs the transaction.

### `GET /summary/{user_id}`

Retrieves a specific user's current standing.

- **Response:** `{"user_id": "string", "total_score": float, "transaction_count": int}`
- **Behavior:** Fetches the exact total score and transaction count for the requested user. Returns a `404 Not Found` if the user does not exist.

### `GET /ranking`

Retrieves the top 10 users on the platform based on the calculated rank score.

- **Response:** A sorted array of the top 10 users with their raw scores, transaction counts, and computed rank score.
- **Behavior:** The ranking calculation is offloaded directly to the PostgreSQL database for maximum efficiency.

## 🏆 How Ranking is Calculated

A naive "highest total score wins" approach is easily manipulated by a single massive transaction. To ensure platform fairness and reward consistent engagement, the ranking relies on a multi-factor formula:

**`Rank Score = (Total Score × 0.7) + (Transaction Count × 0.3)`**

- **Volume Weight (70%):** Acknowledges the raw financial value the user brings.
- **Engagement Weight (30%):** Rewards users who use the platform consistently, preventing a user from buying the top spot with a single API call.

This calculation is executed natively via a SQL query, ensuring the backend doesn't have to load the entire `users` table into application memory to sort the leaderboard.

## 🛡️ Concurrency & Abuse Prevention

### How Duplicate Requests are Prevented (Idempotency)

In distributed systems, a network stutter or a double-click can cause a client to submit the exact same transaction twice.

1. **Client-Side UUIDs:** The frontend generates a unique `transaction_id` (UUIDv4) for every distinct action.
2. **Database Primary Keys:** The `transactions` table in PostgreSQL uses this `id` as its Primary Key.
3. **Execution:** If two identical requests hit the server, the database's unique constraint acts as the final source of truth. The backend explicitly catches the resulting `IntegrityError` and returns a graceful duplicate warning, completely preventing double-charging.

### How Concurrent Updates are Handled

If two *different* valid transactions for the same user hit the API at the exact same millisecond, a standard read/write cycle could overwrite one of the scores (a race condition).

To solve this, the API utilizes **Row-Level Locking** via PostgreSQL's `SELECT ... FOR UPDATE` feature. When a transaction begins processing, the database explicitly locks that specific user's row. Any simultaneous requests for that user are forced to wait in a queue until the first transaction safely commits, guaranteeing mathematically perfect data consistency.
