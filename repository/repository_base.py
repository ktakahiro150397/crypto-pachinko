from model.database.crypto_ltp import CryptoLtp
from datetime import datetime

from repository.ltp_data_by_delta_result import LtpDataByDeltaResult

class RepositoryBase:
    def __init__(self):
        pass
    
    def get_ltp_data(self,product_code:str)->list[CryptoLtp]:
        """最終取引価格の一覧を取得します。

        Args:
            product_code (str): プロダクトコード

        Returns:
            list[CryptoLtp]: プロダクトコードに一致するデータ一覧
        """
        pass
    
    def get_ltp_data_by_delta(self,product_code:str,base_time:datetime,delta_second:int) -> LtpDataByDeltaResult:
        """基準日時最新のデータと、指定した秒数前のデータを取得します。

        Args:
            product_code (str): プロダクトコード
            base_time (datetime): 基準となる日時
            delta_second (int): 基準となる日時からの差分秒数

        Returns:
            LtpDataByDeltaResult: 取得結果
        """
        pass
