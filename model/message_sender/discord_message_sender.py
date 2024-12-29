
from model.message_sender.message_sender_base import MessageSenderBase


class DiscordMessageSender(MessageSenderBase):
    def __init__(self):
        super().__init__()

    def send_message(self, message):
        print(f"Discord: {message}")