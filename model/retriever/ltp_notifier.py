from datetime import datetime,timezone
import time
from logger_factory import LoggerFactory
from model.database.crypto_ltp import CryptoLtp
from model.message_sender.message_sender_base import MessageSendColor, MessageSenderBase
from model.notify_data.price_volatility import PriceVolatilityNotifier
from repository.ltp_data_by_delta_result import LtpDataByDeltaResult
from repository.repository_base import RepositoryBase


logger = LoggerFactory.getLogger(__name__)

class LtpNotifier():
    def __init__(self,
                 product_code:str,
                 delta_second:float, 
                 repo:RepositoryBase,
                 sender:MessageSenderBase,
                 threshold_percent:float,
                 check_interval:float=None):
        self.product_code = product_code
        self.delta_second = delta_second
        
        self.repo = repo
        self.sender = sender
        
        if check_interval is None:
            self.check_interval = delta_second
        else:
            self.check_interval = check_interval
        
        self.price_volatility = PriceVolatilityNotifier(sender=sender,threshold_percent=threshold_percent)
    
    def notify_process(self):
        while True:
            ltp_data = self.repo.get_ltp_data_by_delta(self.product_code,datetime.now(timezone.utc),self.delta_second)
            
            previous:CryptoLtp = ltp_data.previous
            latest:CryptoLtp = ltp_data.latest
            volatility_result = self.price_volatility.is_notify(previous, latest)
            
            if volatility_result.is_notify:
                color = self.__get_message_color(volatility_result.volatillity_percent)
                prefix = self.__get_message_prefix(color)
                description = self.__get_message_descrption(color)
                
                message = f"{prefix}{self.product_code}の価格が変動しています！{description}\nlatest={latest.ltp:.2f}(id={latest.id}\nprevious={previous.ltp:.2f}(id={previous.id}\n変動率：{volatility_result.volatillity_percent:.2f}%"
                self.sender.send_message(message, message_accent_color=color)
            else:
                message = f"{self.product_code}の通知対象外です。\nlatest={latest.ltp:.2f}(id={latest.id}\nprevious={previous.ltp:.2f}(id={previous.id}\n変動率：{volatility_result.volatillity_percent:.2f}%"
                self.sender.send_message(message, message_accent_color=MessageSendColor.DEFAULT)
        
            # await interval
            time.sleep(self.check_interval)
            
    def __get_message_color(self,value:float)->MessageSendColor:
        if value >= 0:
            if value >= self.price_volatility.threshold_percent * 2:
                return MessageSendColor.VERY_LONG
            else:
                return MessageSendColor.LONG
        else:
            if value >= self.price_volatility.threshold_percent * -2:
                return MessageSendColor.VERY_SHORT
            else:
                return MessageSendColor.SHORT
    
    def __get_message_prefix(self,color:MessageSendColor)->str:
        if color == MessageSendColor.VERY_LONG:
            return ":rocket::crescent_moon:"
        elif color == MessageSendColor.LONG:
            return ":man_dancing:"
        elif color == MessageSendColor.SHORT:
            return ":exploding_head:"
        elif color == MessageSendColor.VERY_SHORT:
            return ":face_with_symbols_over_mouth:"
        
    def __get_message_descrption(self,color:MessageSendColor)->str:
        if color == MessageSendColor.VERY_LONG:
            return "ぶっとべ〜〜〜〜〜！"
        elif color == MessageSendColor.LONG:
            return "イケイケだ！"
        elif color == MessageSendColor.SHORT:
            return "耐えろ！"
        elif color == MessageSendColor.VERY_SHORT:
            return "もう終わりだよこの通貨"