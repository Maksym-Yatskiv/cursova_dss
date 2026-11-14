from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from database import engine, SessionLocal
import models
from services import seed_initial_data
from routers import catalogs, problems, calculations

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()
seed_initial_data(db)
db.close()

app = FastAPI(title="DSS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(catalogs.router)
app.include_router(problems.router)
app.include_router(calculations.router)

@app.get("/")
def root():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)