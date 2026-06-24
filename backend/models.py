from sqlalchemy import Column, String, Float, Integer, DateTime
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    total_score = Column(Float, default=0.0)
    transaction_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Transaction(Base):
    __tablename__ = "transactions"
    
    # The transaction ID acts as our idempotency key
    id = Column(String, primary_key=True, index=True) 
    user_id = Column(String, index=True)
    amount = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())