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
    
    def get_board(self, product_code):
        getboard = self.base_url + 'getboard'
        response = requests.get(getboard, params={'product_code': product_code})
        return response.json()
    
    def get_ticker(self, product_code):
        getticker = self.base_url + 'getticker'
        response = requests.get(getticker, params={'product_code': product_code})
        return response.json()