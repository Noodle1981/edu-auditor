import sqlite3
import os
import re

def normalize_date(date_str):
    if not date_str:
        return None
    date_str = str(date_str).strip()
    if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        return date_str
    match = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{2,4})$', date_str)
    if match:
        day, month, year = match.groups()
        if len(year) == 2:
            year = "20" + year
        return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"
    match = re.match(r'^(\d{4})/(\d{1,2})/(\d{1,2})$', date_str)
    if match:
        year, month, day = match.groups()
        return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"
    return date_str

def normalize_datetime(dt_str):
    if not dt_str:
        return None
    dt_str = str(dt_str).strip()
    parts = dt_str.split(maxsplit=1)
    if not parts:
        return dt_str
    date_part = parts[0]
    time_part = parts[1] if len(parts) > 1 else ""
    normalized_date = normalize_date(date_part)
    if time_part:
        return f"{normalized_date} {time_part}"
    return normalized_date

def safe_open_csv(csv_path):
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            return f.readlines()
    except UnicodeDecodeError:
        with open(csv_path, 'r', encoding='latin-1') as f:
            return f.readlines()

def get_db_connection(db_path):
    conn = sqlite3.connect(db_path)
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def safe_db_close(conn, success=True):
    if not conn:
        return
    try:
        if success:
            conn.commit()
        else:
            conn.rollback()
    except Exception as e:
        print(f"Error executing commit/rollback: {e}")
    try:
        conn.close()
    except Exception as e:
        print(f"Error closing connection: {e}")
