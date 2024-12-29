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
    discord_sender.send_message(":face_with_monocle:Crypto 価格変動監視くん","価格変動監視を開始します...",message_accent_color=MessageSendColor.DEFAULT)
    
    # 別スレッドで価格情報を確認し、Discordに通知
    ltp_notifier = LtpNotifier(product_code="XRP_JPY",
                               delta_second=15.0,
                               repo=repo,
                               sender=discord_sender,
                               threshold_percent=0.05,
                               check_interval=None)
    notify_thread = threading.Thread(target=ltp_notifier.notify_process)
    notify_thread.setDaemon(True)
    notify_thread.start()
    
    notify_thread.join()
    retrieve_thread.join()
    