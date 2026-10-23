from backend.app.core.database import SessionLocal
from backend.app.services.spendnest_service import SpendNestService

def seed():
    db = SessionLocal()
    try:
        print("Resetting and loading 01_initial.json into PostgreSQL...")
        res = SpendNestService.reset_database_to_initial(db)
        print("SEED_RESULT:", res)
    finally:
        db.close()

if __name__ == "__main__":
    seed()
