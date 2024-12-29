from datetime import datetime,timezone
import random
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
        
        self.very_long_description = [
            "月までぶっとべ！！",
            "莫大な富の予感",
            "To the moon!",
            "buybuybuybuy"
        ]
        self.long_description = [
            "上がれ！",
            "いけいけ！",
            "バブれ！",
            "ぶっとべ！",
            "それなりの富の予感",
        ]
        
        self.short_description = [
            "耐えろ！",
            "切れ！",
        ]
        
        self.very_short_description = [
            "もう終わりだよこの通貨",
            "破滅",
            "解散",
        ]
    
    def notify_process(self):
        while True:
            ltp_data = self.repo.get_ltp_data_by_delta(self.product_code,datetime.now(timezone.utc),self.delta_second)
            
            previous:CryptoLtp = ltp_data.previous
            latest:CryptoLtp = ltp_data.latest
            volatility_result = self.price_volatility.is_notify(previous, latest)
            
            price_info_message = f"最新価格={latest.ltp:.2f}(id={latest.id})\n直前価格={previous.ltp:.2f}({self.delta_second}秒前)(id={previous.id})\n変動率：{volatility_result.volatillity_percent:.2f}%"
            
            if volatility_result.is_notify:
                color = self.__get_message_color(volatility_result.volatillity_percent)
                message_main = self.__get_message_main(color)
                unique_icon = self.__get_message_prefix(color)
                message_unique = self.__get_message_unique(color)
                
                title = f"{message_main}"
                message = f"{unique_icon} {message_unique}\n{price_info_message}"
                self.sender.send_message(title,message, message_accent_color=color)
            else:
                # color = MessageSendColor.DEFAULT
                # unique_icon = ":face_with_open_eyes_and_hand_over_mouth:"
                
                # title = f"{self.product_code}の通知対象外です。"
                # message = f"{unique_icon}通知対象外です。\n{price_info_message}"
                # self.sender.send_message(title,message, message_accent_color=color)
                pass
        
            # await interval
            time.sleep(self.check_interval)
            
    def __get_message_color(self,value:float)->MessageSendColor:
        if value >= 0:
            if value >= self.price_volatility.threshold_percent * 2:
                return MessageSendColor.VERY_LONG
            else:
                return MessageSendColor.LONG
        else:
            if value <= self.price_volatility.threshold_percent * -2:
                return MessageSendColor.VERY_SHORT
            else:
                return MessageSendColor.SHORT
            
        
    def __get_message_main(self,color:MessageSendColor)->str:
        if color == MessageSendColor.VERY_LONG:
            return f"{self.product_code}の価格が急上昇中！！"
        elif color == MessageSendColor.LONG:
            return f"{self.product_code}の価格が上昇中！"
        elif color == MessageSendColor.SHORT:
            return f"{self.product_code}の価格が下降中！"
        elif color == MessageSendColor.VERY_SHORT:
            return f"{self.product_code}の価格が急下降中！！"
    
    def __get_message_prefix(self,color:MessageSendColor)->str:
        if color == MessageSendColor.VERY_LONG:
            return ":rocket::crescent_moon:"
        elif color == MessageSendColor.LONG:
            return ":man_dancing:"
        elif color == MessageSendColor.SHORT:
            return ":exploding_head:"
        elif color == MessageSendColor.VERY_SHORT:
            return ":face_with_symbols_over_mouth:"
        
    def __get_message_unique(self,color:MessageSendColor)->str:
        if color == MessageSendColor.VERY_LONG:
            message_list = self.very_long_description
        elif color == MessageSendColor.LONG:
            message_list = self.long_description
        elif color == MessageSendColor.SHORT:
            message_list = self.short_description
        elif color == MessageSendColor.VERY_SHORT:
            message_list = self.very_short_description
        
        i = random.randint(0,len(message_list)-1)
        return message_list[i]