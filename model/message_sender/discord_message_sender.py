
import requests
from model.message_sender.message_sender_base import MessageSendColor, MessageSenderBase, get_color_code

class DiscordMessageSender(MessageSenderBase):
    def __init__(self,webhook_url:str):
        super().__init__()
        self.webhook_url = webhook_url

    def send_message(self, message, message_accent_color: MessageSendColor = 3):
        print(f"Discord: {message}")
        
        payload = {
            # "content": message,
            "username": "Crypto 価格変動通知botくん",
            "embeds": [
                {
                    "title": "Crypto 価格変動通知",
                    "description": message,
                    "color": get_color_code(message_accent_color)
                }
            ]
        }
        requests.post(self.webhook_url, json=payload)
        