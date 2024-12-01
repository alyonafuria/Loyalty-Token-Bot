import sqlite3
from datetime import datetime
import json

class Database:
    def __init__(self, db_file="bot_responses.db"):
        self.db_file = db_file
        self.init_db()

    def init_db(self):
        conn = sqlite3.connect(self.db_file)
        c = conn.cursor()
        
        # Create table for storing user responses
        c.execute('''
            CREATE TABLE IF NOT EXISTS token_responses (
                user_id INTEGER,
                username TEXT,
                token_name TEXT,
                token_symbol TEXT,
                token_supply TEXT,
                recipient_address TEXT,
                timestamp DATETIME,
                PRIMARY KEY (user_id, timestamp)
            )
        ''')
        
        conn.commit()
        conn.close()

    def store_token_response(self, user_id, username, token_data):
        conn = sqlite3.connect(self.db_file)
        c = conn.cursor()
        
        c.execute('''
            INSERT INTO token_responses 
            (user_id, username, token_name, token_symbol, token_supply, recipient_address, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id,
            username,
            token_data['name'],
            token_data['symbol'],
            token_data['supply'],
            token_data['recipient'],
            datetime.now()
        ))
        
        conn.commit()
        conn.close()

    def get_user_responses(self, user_id):
        conn = sqlite3.connect(self.db_file)
        c = conn.cursor()
        
        c.execute('''
            SELECT * FROM token_responses 
            WHERE user_id = ?
            ORDER BY timestamp DESC
        ''', (user_id,))
        
        responses = c.fetchall()
        conn.close()
        return responses

    def export_to_txt(self, filename="database_export.txt"):
        """
        Export all database contents to a text file
        """
        conn = sqlite3.connect(self.db_file)
        c = conn.cursor()
        
        c.execute('SELECT * FROM token_responses ORDER BY timestamp DESC')
        rows = c.fetchall()
        
        try:
            with open(filename, 'w') as f:
                f.write("Token Responses Database Export\n")
                f.write("=" * 50 + "\n\n")
                for row in rows:
                    f.write(f"User ID: {row[0]}\n")
                    f.write(f"Username: {row[1]}\n")
                    f.write(f"Token Name: {row[2]}\n")
                    f.write(f"Token Symbol: {row[3]}\n")
                    f.write(f"Token Supply: {row[4]}\n")
                    f.write(f"Recipient Address: {row[5]}\n")
                    f.write(f"Timestamp: {row[6]}\n")
                    f.write("-" * 30 + "\n")
            return True
        except Exception as e:
            print(f"Error exporting to file: {e}")
            return False
        finally:
            conn.close()

    def export_to_json(self, filename="database_export.json"):
        """
        Export all database contents to a JSON file
        """
        conn = sqlite3.connect(self.db_file)
        c = conn.cursor()
        
        c.execute('SELECT * FROM token_responses ORDER BY timestamp DESC')
        rows = c.fetchall()
        
        # Create a list to store all records
        json_data = []
        
        # Convert each row to a dictionary
        for row in rows:
            record = {
                "user_id": row[0],
                "username": row[1],
                "token_name": row[2],
                "token_symbol": row[3],
                "token_supply": row[4],
                "recipient_address": row[5],
                "timestamp": str(row[6])  # Convert datetime to string for JSON serialization
            }
            json_data.append(record)
        
        try:
            with open(filename, 'w') as f:
                json.dump(json_data, f, indent=4)
            return True
        except Exception as e:
            print(f"Error exporting to JSON file: {e}")
            return False
        finally:
            conn.close()
