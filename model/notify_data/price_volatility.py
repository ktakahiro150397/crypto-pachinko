

from dataclasses import dataclass
from model.database.crypto_ltp import CryptoLtp
from model.message_sender.message_sender_base import MessageSenderBase

@dataclass
class PriceVolatilityNotifierResult():
    is_notify:bool
    volatillity_percent:float

class PriceVolatilityNotifier():
    def __init__(self,sender:MessageSenderBase,threshold_percent:float):
        self.sender = sender
        self.threshold_percent = threshold_percent
        
    def is_notify(self, previous:CryptoLtp, latest:CryptoLtp)->PriceVolatilityNotifierResult:
        """指定された2つのデータの最終取引価格の差が閾値%を超えている場合はTrueを返します。

        Args:
            previous (CryptoLtp): 変動前のデータ
            latest (CryptoLtp): 変動後のデータ

        Returns:
            PriceVolatilityNotifierResult: チェック結果。
        """
        if previous is None or latest is None:
            return PriceVolatilityNotifierResult(is_notify=False,volatillity_percent=0)
        
        previous_ltp = previous.ltp
        latest_ltp = latest.ltp
        percent = (latest_ltp - previous_ltp) / previous_ltp * 100
        
        is_notify = abs(percent) >= self.threshold_percent
        return PriceVolatilityNotifierResult(is_notify=is_notify,volatillity_percent=percent)
