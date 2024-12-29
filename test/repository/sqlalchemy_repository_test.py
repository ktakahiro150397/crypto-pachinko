import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from model.database.base import Base
from model.database.crypto_ltp import CryptoLtp
from repository.sqlalchemy_repository import SqlAlchemyRepository
from repository.ltp_data_by_delta_result import LtpDataByDeltaResult

@pytest.fixture
def session():
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return Session()

@pytest.fixture
def repository(session):
    return SqlAlchemyRepository(session)

def test_get_ltp_data(repository, session):
    # Arrange
    product_code = 'BTC_JPY'
    ltp_data = CryptoLtp(product_code=product_code, ltp=5000000, timestamp=datetime.now())
    session.add(ltp_data)
    session.commit()

    # Act
    result = repository.get_ltp_data(product_code)

    # Assert
    assert len(result) == 1
    assert result[0].product_code == product_code
    assert result[0].ltp == 5000000

def test_get_ltp_data_by_delta(repository, session):
    # Arrange
    product_code = 'BTC_JPY'
    base_time = datetime.now()
    delta_second = 60
    ltp_data1 = CryptoLtp(product_code=product_code, ltp=5000000, timestamp=base_time - timedelta(seconds=30))
    ltp_data2 = CryptoLtp(product_code=product_code, ltp=4900000, timestamp=base_time - timedelta(seconds=90))
    session.add(ltp_data1)
    session.add(ltp_data2)
    session.commit()

    # Act
    result = repository.get_ltp_data_by_delta(product_code, base_time, delta_second)

    # Assert
    assert result.latest.ltp == 5000000
    assert result.previous.ltp == 4900000
    
def test_get_ltp_data_by_delta_various_deltas(repository, session):
    # Arrange
    product_code = 'BTC_JPY'
    base_time = datetime.now()
    ltp_data1 = CryptoLtp(product_code=product_code, ltp=5000000, timestamp=base_time - timedelta(seconds=5))
    ltp_data2 = CryptoLtp(product_code=product_code, ltp=4900000, timestamp=base_time - timedelta(seconds=15))
    ltp_data3 = CryptoLtp(product_code=product_code, ltp=4800000, timestamp=base_time - timedelta(seconds=25))
    session.add(ltp_data1)
    session.add(ltp_data2)
    session.add(ltp_data3)
    session.commit()
    
     # Act & Assert for delta_second = 10
    result = repository.get_ltp_data_by_delta(product_code, base_time, 10)
    assert result.latest.ltp == 5000000
    assert result.previous.ltp == 4900000  # No data within delta of 10 seconds

    # Act & Assert for delta_second = 20
    result = repository.get_ltp_data_by_delta(product_code, base_time, 20)
    assert result.latest.ltp == 5000000
    assert result.previous.ltp == 4800000  # Data within delta of 20 seconds

    # Act & Assert for delta_second = 30
    result = repository.get_ltp_data_by_delta(product_code, base_time, 30)
    assert result.latest.ltp == 5000000
    assert result.previous is None # Data within delta of 30 seconds
    
def test_add_ltp_data(repository, session):
    # Arrange
    product_code = 'BTC_JPY'
    ltp = 5000000
    timestamp = datetime.now()
    cryptoLtp = CryptoLtp(product_code=product_code, ltp=ltp, timestamp=timestamp)

    # Act
    repository.add_ltp_data(crypto_ltp=cryptoLtp)
    session.commit()

    # Assert
    result = session.query(CryptoLtp).filter_by(product_code=product_code).first()
    assert result is not None
    assert result.product_code == product_code
    assert result.ltp == ltp
    assert result.timestamp == timestamp