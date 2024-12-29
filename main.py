import datetime
import os
import threading
import time

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from api.bitflyer_api import BitflyerAPI
from model.database.base import Base
from model.database.crypto_ltp import CryptoLtp
from model.message_sender.discord_message_sender import DiscordMessageSender
from model.message_sender.message_sender_base import MessageSendColor
from logger_factory import LoggerFactory
from model.retriever.ltp_notifier import LtpNotifier
from model.retriever.ltp_retriever import LtpRetriever
from repository.sqlalchemy_repository import SqlAlchemyRepository

load_dotenv()
logger = LoggerFactory.getLogger(__name__)

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")
SQLALCHEMY_DATABASE_URL = os.getenv("SQLALCHEMY_DATABASE_URI")

if __name__ == "__main__":
    engine_str = SQLALCHEMY_DATABASE_URL
    engine = create_engine(engine_str)
    
    # Create tables
    Base.metadata.create_all(engine)
    
    # Create Session
    session = sessionmaker(engine)()
    repo = SqlAlchemyRepository(session=session)
    
    api = BitflyerAPI()
    
    # 別スレッドで価格情報を取得しDBに登録
    ltp_retriever = LtpRetriever(repo=repo,
                                 api=api,
                                 product_code="XRP_JPY",
                                 api_interval=0.5)
    retrieve_thread = threading.Thread(target=ltp_retriever.db_registration_process)
    retrieve_thread.setDaemon(True)
    retrieve_thread.start()
    
    discord_sender = DiscordMessageSender(DISCORD_WEBHOOK_URL)
    discord_sender.send_message(":face_with_monocle:Crypto 価格変動監視を開始します...",message_accent_color=MessageSendColor.DEFAULT)
    
    # 別スレッドで価格情報を確認し、Discordに通知
    ltp_notifier = LtpNotifier(product_code="XRP_JPY",
                               delta_second=10.0,
                               repo=repo,
                               sender=discord_sender,
                               threshold_percent=0.01,
                               check_interval=None)
    notify_thread = threading.Thread(target=ltp_notifier.notify_process)
    notify_thread.setDaemon(True)
    notify_thread.start()
    
    notify_thread.join()
    retrieve_thread.join()
    
    # discord_sender.send_message("Hello, World! Very long",message_accent_color=MessageSendColor.VERY_LONG)
    # discord_sender.send_message("Hello, World! Long",message_accent_color=MessageSendColor.LONG)
    # discord_sender.send_message("Hello, World! Short",message_accent_color=MessageSendColor.SHORT)
    # discord_sender.send_message("Hello, World! Very short",message_accent_color=MessageSendColor.VERY_SHORT)
    
    # discord_sender.send_message("XRP_JPY: 30s +12%!!",message_accent_color=MessageSendColor.VERY_LONG)
    # discord_sender.send_message("XRP_JPY: 30s +5%!",message_accent_color=MessageSendColor.LONG)
    # discord_sender.send_message("XRP_JPY: 30s -5%!",message_accent_color=MessageSendColor.SHORT)
    # discord_sender.send_message("XRP_JPY: 30s -12%",message_accent_color=MessageSendColor.VERY_SHORT)
    
    # bitflyer = BitflyerAPI()
    
    # response = bitflyer.get_markets()
    # print(response)
    
    # product_code = "XRP_JPY"
    # # response = bitflyer.get_board(product_code)
    # # print(response)
    
    # response = bitflyer.get_ticker(product_code)
    # # print(response)
    
    # while True:
    #     response = bitflyer.get_ticker(product_code)
    #     ltp = response["ltp"]
    #     print(f"ltp={ltp}")
        
    #     # await 0.2s
    #     time.sleep(0.2)
    
    
    
    # Insert data
    # test_data = CryptoLtp(
    #     product_code="TEST_JPY",
    #     ltp=100.0,
    #     timestamp=datetime.datetime.now()
    # )
    # session.add(test_data)
    # session.commit()
    
    # # Select data
    # data = session.query(CryptoLtp).all()
    # data = session.query(CryptoLtp).filter(CryptoLtp.product_code=="XRP_JPY").all()
    # for d in data:
    #     print(d.product_code, d.ltp, d.timestamp)
    