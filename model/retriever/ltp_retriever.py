
from datetime import datetime
import time
from api.crypto_api_base import CryptoAPIBase
from logger_factory import LoggerFactory
from model.database.crypto_ltp import CryptoLtp
from repository.repository_base import RepositoryBase

logger = LoggerFactory.getLogger(__name__)

class LtpRetriever():
    def __init__(self,repo:RepositoryBase,api:CryptoAPIBase,product_code:str,api_interval:float=0.2):
        self.repo = repo
        self.api = api
        self.product_code = product_code
        self.api_interval = api_interval
        
        logger.debug(f"LtpRetriever: repo={self.repo}, api={self.api}, product_code={self.product_code}")
    
    def db_registration_process(self):
        while True:
            ticker_response = self.api.get_ticker(self.product_code)
            logger.debug(f"LtpRetriever: ticker_response={ticker_response}")
            
            ltp = ticker_response["ltp"]
            
            
            date_str = ticker_response["timestamp"]
            date_format = '%Y-%m-%dT%H:%M:%S.%f'

            # 文字列をdatetimeオブジェクトに変換
            try:
                timestamp = datetime.strptime(date_str, date_format)
            except ValueError as e:
                logger.warning(f"ValueError: {e}")
                timestamp = datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%S')

            register_data = CryptoLtp(product_code=self.product_code,ltp=ltp,timestamp=timestamp)
            logger.debug(f"LtpRetriever: register_data={register_data}")
            
            self.repo.add_ltp_data(register_data)
            logger.debug(f"LtpRetriever: add_ltp_data")
            
            # await interval
            time.sleep(self.api_interval)
            
            