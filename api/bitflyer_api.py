import requests
from api.crypto_api_base import CryptoAPIBase

class BitflyerAPI(CryptoAPIBase):
    def __init__(self):
        super().__init__()
        self.base_url = "https://api.bitflyer.com/v1/"
    
    def get_markets(self):
        getmarkets = self.base_url + 'getmarkets'
        response = requests.get(getmarkets)
        return response.json()