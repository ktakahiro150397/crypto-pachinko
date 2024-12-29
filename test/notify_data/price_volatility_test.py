import pytest
from model.database.crypto_ltp import CryptoLtp
from model.message_sender.message_sender_base import MessageSenderBase
from model.notify_data.price_volatility import PriceVolatilityNotifier

class MockMessageSender(MessageSenderBase):
    def send_message(self, message: str):
        pass

@pytest.fixture
def notifier():
    return PriceVolatilityNotifier(notifier=MockMessageSender(), threshold_percent=5.0)

def test_is_notify_true(notifier):
    # Arrange
    previous = CryptoLtp(ltp=100.0)
    latest = CryptoLtp(ltp=110.0)  # 10% increase

    # Act
    result = notifier.is_notify(previous, latest)

    # Assert
    assert result is True

def test_is_notify_false(notifier):
    # Arrange
    previous = CryptoLtp(ltp=100.0)
    latest = CryptoLtp(ltp=104.0)  # 4% increase

    # Act
    result = notifier.is_notify(previous, latest)

    # Assert
    assert result is False

def test_is_notify_previous_none(notifier):
    # Arrange
    previous = None
    latest = CryptoLtp(ltp=110.0)

    # Act
    result = notifier.is_notify(previous, latest)

    # Assert
    assert result is False

def test_is_notify_latest_none(notifier):
    # Arrange
    previous = CryptoLtp(ltp=100.0)
    latest = None

    # Act
    result = notifier.is_notify(previous, latest)

    # Assert
    assert result is False

def test_is_notify_no_change(notifier):
    # Arrange
    previous = CryptoLtp(ltp=100.0)
    latest = CryptoLtp(ltp=100.0)  # No change

    # Act
    result = notifier.is_notify(previous, latest)

    # Assert
    assert result is False
    
def test_is_notify_negative_change(notifier):
    # Arrange
    previous = CryptoLtp(ltp=100.0)
    latest = CryptoLtp(ltp=90.0)  # 10% decrease

    # Act
    result = notifier.is_notify(previous, latest)

    # Assert
    assert result is True