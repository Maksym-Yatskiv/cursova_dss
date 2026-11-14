from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from services import unify_comparison_value

router = APIRouter(prefix="/api/problems")

@router.post("", response_model=schemas.ProblemResponse)
def create_problem(problem_in: schemas.ProblemCreate, db: Session = Depends(get_db)):
    problem = models.Problem(
        title=problem_in.title,
        description=problem_in.description,
        base_scale_type=problem_in.base_scale_type
    )
    db.add(problem)
    db.flush()

    for alt in problem_in.alternatives:
        db.add(models.Alternative(
            problem_id=problem.id,
            name=alt.name,
            reference_weight=alt.reference_weight
        ))

    db.commit()
    db.refresh(problem)
    return problem

@router.get("", response_model=List[schemas.ProblemResponse])
def list_problems(db: Session = Depends(get_db)):
    return db.query(models.Problem).order_by(models.Problem.created_at.desc()).all()

@router.get("/{problem_id}", response_model=schemas.ProblemResponse)
def get_problem(problem_id: int, db: Session = Depends(get_db)):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Задачу не знайдено")
    return problem

@router.post("/{problem_id}/comparisons", response_model=List[schemas.ComparisonResponse])
def add_comparisons(
    problem_id: int, 
    batch: schemas.ComparisonBatchCreate, 
    replace_existing: bool = True,
    db: Session = Depends(get_db)
):
    if replace_existing:
        db.query(models.PairwiseComparison).filter(
            models.PairwiseComparison.problem_id == problem_id
        ).delete()

    saved = []
    for item in batch.comparisons:
        if item.alt_i_id == item.alt_j_id:
            continue

        scale = db.query(models.Scale).filter(models.Scale.id == item.scale_id).first()
        expert = db.query(models.Expert).filter(models.Expert.id == item.expert_id).first()
        comp_weight = expert.competence if expert else 1.0
        unified_val = unify_comparison_value(item.raw_value, scale, comp_weight)

        comp = models.PairwiseComparison(
            problem_id=problem_id,
            expert_id=item.expert_id,
            scale_id=item.scale_id,
            alt_i_id=item.alt_i_id,
            alt_j_id=item.alt_j_id,
            raw_value=item.raw_value,
            unified_value=unified_val
        )
        db.add(comp)
        saved.append(comp)

    db.commit()
    for c in saved:
        db.refresh(c)
    return saved

@router.get("/{problem_id}/comparisons", response_model=List[schemas.ComparisonResponse])
def get_comparisons(problem_id: int, db: Session = Depends(get_db)):
    return db.query(models.PairwiseComparison).filter(
        models.PairwiseComparison.problem_id == problem_id
    ).all()

@router.delete("/{problem_id}")
def delete_problem(problem_id: int, db: Session = Depends(get_db)):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Задачу не знайдено")
    db.delete(problem)
    db.commit()
    return {"status": "deleted", "id": problem_id}