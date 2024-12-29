from datetime import datetime, timedelta
import time
from logger_factory import LoggerFactory
from model.database.crypto_ltp import CryptoLtp
from repository.ltp_data_by_delta_result import LtpDataByDeltaResult
from repository.repository_base import RepositoryBase
from sqlalchemy.orm import Session

logger = LoggerFactory.getLogger(__name__)

class SqlAlchemyRepository(RepositoryBase):
    def __init__(self,session:Session):
        self.session = session
        
    def add_ltp_data(self,crypto_ltp: CryptoLtp):
        self.session.add(crypto_ltp)
        self.session.commit()
    
    def get_ltp_data(self,product_code:str)->list[CryptoLtp]:
        return self.session \
            .query(CryptoLtp) \
            .filter(CryptoLtp.product_code==product_code) \
            .all()
    
    def get_ltp_data_by_delta(self,product_code:str,base_time:datetime,delta_second:int) -> LtpDataByDeltaResult:
        while True:
            try:
                base_data = self.session \
                    .query(CryptoLtp) \
                    .filter(CryptoLtp.product_code==product_code) \
                    .filter(CryptoLtp.timestamp<=base_time) \
                    .order_by(CryptoLtp.timestamp.desc()) \
                    .first()
                
                delta_date = base_time - timedelta(seconds=delta_second)
                delta_data = self.session \
                    .query(CryptoLtp) \
                    .filter(CryptoLtp.product_code==product_code) \
                    .filter(CryptoLtp.timestamp<=delta_date) \
                    .order_by(CryptoLtp.timestamp.desc()) \
                    .first()
                
                return LtpDataByDeltaResult(previous=delta_data,latest=base_data)
            except Exception as e:
                logger.warning(f"get_ltp_data_by_delta: {e} (Attempt retry)")
                time.sleep(0.5)