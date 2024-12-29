
from datetime import datetime,timezone
from time import strftime
import requests
from logger_factory import LoggerFactory
from model.message_sender.message_sender_base import MessageSendColor, MessageSenderBase, get_color_code


logger = LoggerFactory.getLogger(__name__)

class DiscordMessageSender(MessageSenderBase):
    def __init__(self,webhook_url:str):
        super().__init__()
        self.webhook_url = webhook_url
        
        logger.debug(f"DiscordMessageSender: webhook_url={self.webhook_url}")

    def send_message(self, title, message, message_accent_color: MessageSendColor = 3):
        payload = {
            # "content": message,
            "username": "Crypto 価格変動通知botくん",
            "embeds": [
                {
                    "title": title,
                    "description": message,
                    "color": get_color_code(message_accent_color),
                    "timestamp": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')
                }
            ],
        }
        logger.debug(f"DiscordMessageSender: payload={payload}")
        
        requests.post(self.webhook_url, json=payload)
        