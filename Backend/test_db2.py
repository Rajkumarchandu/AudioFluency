import psycopg2
try:
    conn = psycopg2.connect(
        host="::1",
        port=5432,
        database="audio_fluency",
        user="postgres",
        password="admin123"
    )
    print("Connected OK!")
    conn.close()
except Exception as e:
    print(f"Error: {e}")