from dotenv import load_dotenv
import os
load_dotenv()
url = os.getenv('DATABASE_URL')
print('URL:', url)

from sqlalchemy import create_engine, text
engine = create_engine(url)
print('Engine created OK')

with engine.connect() as conn:
    result = conn.execute(text("SELECT 1"))
    print('Query OK:', result.fetchone())