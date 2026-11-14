import os
import time
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from services import core_math

router = APIRouter(prefix="/api/problems/{problem_id}")

@router.post("/calculate", response_model=schemas.CalculationRunResponse)
def run_calculation(
    problem_id: int, 
    method_name: str = "combinatorial_geom", 
    db: Session = Depends(get_db)
):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Задачу не знайдено")

    alternatives = sorted(problem.alternatives, key=lambda a: a.id)
    n = len(alternatives)

    # Словник для переведення ID альтернативи з бази у індекс 0..n-1 для C++
    id_to_idx = {}
    for i in range(n):
        id_to_idx[alternatives[i].id] = i

    comparisons = db.query(models.PairwiseComparison).filter(
        models.PairwiseComparison.problem_id == problem_id
    ).all()

    if len(comparisons) < n - 1:
        raise HTTPException(status_code=400, detail="Недостатньо оцінок для зв'язності графа")

    cpp_edges = []
    for comp in comparisons:
        edge = core_math.Edge(
            id_to_idx[comp.alt_i_id], 
            id_to_idx[comp.alt_j_id], 
            comp.unified_value
        )
        cpp_edges.append(edge)

    start_time = time.perf_counter()
    cpp_result = core_math.run_combinatorial_method(n, cpp_edges)
    exec_time_ms = (time.perf_counter() - start_time) * 1000.0

    if not cpp_result.is_connected:
        raise HTTPException(status_code=422, detail="Граф не є зв'язним! Додайте більше порівнянь.")

    # Перевіряємо, чи задані еталонні ваги для всіх альтернатив
    has_ref_weights = True
    ref_sum = 0.0
    for alt in alternatives:
        if alt.reference_weight is None or alt.reference_weight <= 0:
            has_ref_weights = False
            break
        ref_sum += alt.reference_weight

    max_relative_error = None
    if has_ref_weights:
        target_weights = cpp_result.weights_arithm if method_name == "combinatorial_arithm" else cpp_result.weights_geom
        max_err = 0.0
        for i in range(n):
            w_ref = alternatives[i].reference_weight / ref_sum
            w_calc = target_weights[i]
            err = abs(w_calc - w_ref) / w_ref
            if err > max_err:
                max_err = err
        max_relative_error = round(max_err, 6)

    # Формуємо списки результатів для збереження у JSON
    weights_arithm_json = []
    weights_geom_json = []
    variances_json = []

    for i in range(n):
        alt_id = alternatives[i].id
        alt_name = alternatives[i].name
        weights_arithm_json.append({"alternative_id": alt_id, "name": alt_name, "weight": round(cpp_result.weights_arithm[i], 6)})
        weights_geom_json.append({"alternative_id": alt_id, "name": alt_name, "weight": round(cpp_result.weights_geom[i], 6)})
        variances_json.append({"alternative_id": alt_id, "name": alt_name, "variance": round(cpp_result.variances[i], 8)})

    calc_run = models.CalculationRun(
        problem_id=problem_id,
        method_name=method_name,
        is_connected=cpp_result.is_connected,
        workers_count=os.cpu_count() or 1,
        spanning_trees_count=cpp_result.spanning_trees_count,
        processed_trees_count=cpp_result.processed_trees_count,
        exec_time_ms=round(exec_time_ms, 4),
        total_inconsistency=round(cpp_result.total_inconsistency, 8),
        max_relative_error=max_relative_error,
        weights_arithm=weights_arithm_json,
        weights_geom=weights_geom_json,
        variances=variances_json
    )

    db.add(calc_run)
    db.commit()
    db.refresh(calc_run)
    return calc_run

@router.get("/runs", response_model=List[schemas.CalculationRunResponse])
def get_calculation_history(problem_id: int, db: Session = Depends(get_db)):
    return db.query(models.CalculationRun).filter(
        models.CalculationRun.problem_id == problem_id
    ).order_by(models.CalculationRun.run_date.desc()).all()

@router.delete("/runs/{run_id}")
def delete_single_run(problem_id: int, run_id: int, db: Session = Depends(get_db)):
    run = db.query(models.CalculationRun).filter(
        models.CalculationRun.id == run_id,
        models.CalculationRun.problem_id == problem_id
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Запис не знайдено")
    db.delete(run)
    db.commit()
    return {"status": "deleted", "id": run_id}

@router.delete("/runs")
def clear_problem_runs(problem_id: int, db: Session = Depends(get_db)):
    count = db.query(models.CalculationRun).filter(
        models.CalculationRun.problem_id == problem_id
    ).delete()
    db.commit()
    return {"status": "cleared", "deleted_count": count}