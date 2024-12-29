

from model.database.crypto_ltp import CryptoLtp
from model.message_sender.message_sender_base import MessageSenderBase


class PriceVolatilityNotifier():
    def __init__(self,notifier:MessageSenderBase,threshold_percent:float):
        self.notifier = notifier
        self.threshold_percent = threshold_percent
        
    def is_notify(self, previous:CryptoLtp, latest:CryptoLtp)->bool:
        """指定された2つのデータの最終取引価格の差が閾値%を超えている場合はTrueを返します。

        Args:
            previous (CryptoLtp): 変動前のデータ
            latest (CryptoLtp): 変動後のデータ

        Returns:
            bool: 閾値%を超えている場合はTrue。
        """
        if previous is None or latest is None:
            return False
        
        previous_ltp = previous.ltp
        latest_ltp = latest.ltp
        percent = (latest_ltp - previous_ltp) / previous_ltp * 100
        
        return abs(percent) >= self.threshold_percent
        
    