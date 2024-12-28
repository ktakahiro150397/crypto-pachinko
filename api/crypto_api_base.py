from urllib.request import Request

class CryptoAPIBase:
    def __init__(self):
        # # APIアクセスするためのクライアントを作成
        # self.client = Request.Session()
        pass
    
    def get_markets(self):
        pass
    
    def get_board(self, product_code):
        pass
    
    def get_ticker(self, product_code):
        pass