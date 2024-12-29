from dataclasses import dataclass
from model.database.crypto_ltp import CryptoLtp

@dataclass
class LtpDataByDeltaResult:
    previous:CryptoLtp
    latest:CryptoLtp