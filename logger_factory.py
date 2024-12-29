import logging.config
import logging.handlers
import yaml
from logging import getLogger
import logging

class LoggerFactory():
    def getLogger(logger_name):
        logging.config.dictConfig(yaml.safe_load(open("log_config.yaml").read()))

        logger = getLogger(f"app.{logger_name}")
       
        return logger