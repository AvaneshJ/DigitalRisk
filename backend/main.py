from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc

import models, schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ranking System API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/transaction")
def create_transaction(req: schemas.TransactionRequest, db: Session = Depends(get_db)):
    try:
        # 1. Idempotency Check: Prevent duplicate processing
        existing_txn = db.query(models.Transaction).filter(models.Transaction.id == req.transaction_id).first()
        if existing_txn:
            return {"status": "success", "message": "Transaction already processed", "transaction_id": existing_txn.id}

        # 2. Concurrency Control: Lock the row for this specific user
        user = db.query(models.User).filter(models.User.id == req.user_id).with_for_update().first()
        
        # 3. Graceful Handling: Create user if they don't exist
        if not user:
            user = models.User(id=req.user_id, total_score=0, transaction_count=0)
            db.add(user)
            db.flush() # Flush to get the user in the transaction context

        # 4. Apply Business Logic
        user.total_score += req.amount
        user.transaction_count += 1
        
        new_txn = models.Transaction(
            id=req.transaction_id, 
            user_id=req.user_id, 
            amount=req.amount
        )
        db.add(new_txn)
        
        # Commit releases the row-level lock
        db.commit()
        
        return {
            "status": "success", 
            "data": {
                "user_id": user.id, 
                "new_score": user.total_score,
                "transaction_count": user.transaction_count
            }
        }

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Duplicate transaction detected.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/summary/{user_id}", response_model=schemas.UserSummaryResponse)
def get_summary(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": user.id,
        "total_score": user.total_score,
        "transaction_count": user.transaction_count
    }


@app.get("/ranking")
def get_ranking(db: Session = Depends(get_db)):
    # Calculate the rank score natively in Postgres for efficiency
    rank_score_calc = (models.User.total_score * 0.7) + (models.User.transaction_count * 0.3)
    
    top_users = db.query(
        models.User.id,
        models.User.total_score,
        models.User.transaction_count,
        rank_score_calc.label('rank_score')
    ).order_by(desc('rank_score')).limit(10).all()

    rankings = []
    for rank, user in enumerate(top_users, start=1):
        rankings.append({
            "rank": rank,
            "user_id": user.id,
            "total_score": round(user.total_score, 2),
            "transactions": user.transaction_count,
            "rank_score": round(user.rank_score, 2)
        })

    return {"rankings": rankings}