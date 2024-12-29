

import datetime
import time

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from api.bitflyer_api import BitflyerAPI
from model.database.base import Base
from model.database.crypto_ltp import CryptoLtp

if __name__ == "__main__":
    print("Hello, World!")
    
    bitflyer = BitflyerAPI()
    
    # response = bitflyer.get_markets()
    # print(response)
    
    # product_code = "XRP_JPY"
    # # response = bitflyer.get_board(product_code)
    # # print(response)
    
    # response = bitflyer.get_ticker(product_code)
    # # print(response)
    
    # while True:
    #     response = bitflyer.get_ticker(product_code)
    #     ltp = response["ltp"]
    #     print(f"ltp={ltp}")
        
    #     # await 0.2s
    #     time.sleep(0.2)
    
    engine_str = "sqlite:///crypto_db.sqlite3"
    engine = create_engine(engine_str)
    
    # Create tables
    Base.metadata.create_all(engine)
    
    # Create Session
    session = sessionmaker(engine)()
    
    # Insert data
    # test_data = CryptoLtp(
    #     product_code="TEST_JPY",
    #     ltp=100.0,
    #     timestamp=datetime.datetime.now()
    # )
    # session.add(test_data)
    # session.commit()
    
    # Select data
    data = session.query(CryptoLtp).all()
    data = session.query(CryptoLtp).filter(CryptoLtp.product_code=="XRP_JPY").all()
    for d in data:
        print(d.product_code, d.ltp, d.timestamp)
    