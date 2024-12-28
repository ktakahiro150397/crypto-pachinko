

from api.bitflyer_api import BitflyerAPI


if __name__ == "__main__":
    print("Hello, World!")
    
    bitflyer = BitflyerAPI()
    
    response = bitflyer.get_markets()
    print(response)