from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter(prefix="/api")

@router.get("/scales", response_model=List[schemas.ScaleResponse])
def get_scales(db: Session = Depends(get_db)):
    return db.query(models.Scale).all()

@router.post("/scales", response_model=schemas.ScaleResponse)
def create_scale(scale_in: schemas.ScaleCreate, db: Session = Depends(get_db)):
    scale = models.Scale(**scale_in.model_dump())
    db.add(scale)
    db.commit()
    db.refresh(scale)
    return scale

@router.get("/experts", response_model=List[schemas.ExpertResponse])
def get_experts(db: Session = Depends(get_db)):
    return db.query(models.Expert).all()

@router.post("/experts", response_model=List[schemas.ExpertResponse] if False else schemas.ExpertResponse)
def create_expert(expert_in: schemas.ExpertCreate, db: Session = Depends(get_db)):
    expert = models.Expert(**expert_in.model_dump())
    db.add(expert)
    db.commit()
    db.refresh(expert)
    return expert

from fastapi import APIRouter, Depends, HTTPException
# ... (інші імпорти)

@router.delete("/experts/{expert_id}")
def delete_expert(expert_id: int, db: Session = Depends(get_db)):
    if db.query(models.Expert).count() <= 1:
        raise HTTPException(status_code=400, detail="В системі має залишатися хоча б один експерт")
    
    expert = db.query(models.Expert).filter(models.Expert.id == expert_id).first()
    if not expert:
        raise HTTPException(status_code=404, detail="Експерта не знайдено")
        
    db.delete(expert)
    db.commit()
    return {"status": "deleted", "id": expert_id}