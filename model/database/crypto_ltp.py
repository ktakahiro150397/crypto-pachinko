from sqlalchemy import Column, DATETIME, Float, Integer, String
from sqlalchemy.sql import func
from model.database.base import Base

class CryptoLtp(Base):
    __tablename__ = 'crypto_ltp'
    
    # PK
    id = Column(Integer, primary_key=True)
    product_code = Column(String(255))
    ltp = Column(Float)
    timestamp = Column(DATETIME,default=func.now())
    