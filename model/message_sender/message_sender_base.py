from enum import Enum

class MessageSendColor(Enum):
    DEFAULT = 0
    VERY_SHORT = 1
    SHORT = 2
    LONG = 3
    VERY_LONG = 4

def get_color_code(color: MessageSendColor) -> int:
    color_map = {
        MessageSendColor.DEFAULT: 0x000000,     # Black
        MessageSendColor.VERY_SHORT: 0xf54275,  # Red(Amana)
        MessageSendColor.SHORT: 0xe75bec,       # Pink(Tenka)
        MessageSendColor.LONG: 0xa6cdb6,        # Green(Nichika)
        MessageSendColor.VERY_LONG: 0x008e74    # Green(SHHis)
    }
    return color_map.get(color, "0x000000")  # Default to black if color not found


class MessageSenderBase():
    def __init__(self):
        pass

    def send_message(self, title, message, message_accent_color: MessageSendColor = 3):
        print(f"MessageSenderBase: {title} / {message} / {message_accent_color}")

