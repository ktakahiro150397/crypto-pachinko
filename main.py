

import time
from api.bitflyer_api import BitflyerAPI


if __name__ == "__main__":
    print("Hello, World!")
    
    bitflyer = BitflyerAPI()
    
    response = bitflyer.get_markets()
    print(response)
    
    product_code = "XRP_JPY"
    # response = bitflyer.get_board(product_code)
    # print(response)
    
    response = bitflyer.get_ticker(product_code)
    # print(response)
    
    while True:
        response = bitflyer.get_ticker(product_code)
        ltp = response["ltp"]
        print(f"ltp={ltp}")
        
        # await 0.2s
        time.sleep(0.2)