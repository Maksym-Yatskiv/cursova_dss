from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class ScaleCreate(BaseModel):
    name: str
    scale_type: str
    min_val: float
    max_val: float
    base_c: float = 1.0

class ScaleResponse(ScaleCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ExpertCreate(BaseModel):
    name: str
    competence: float = 1.0

class ExpertResponse(ExpertCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class AlternativeCreate(BaseModel):
    name: str
    reference_weight: Optional[float] = None

class AlternativeResponse(AlternativeCreate):
    id: int
    problem_id: int
    model_config = ConfigDict(from_attributes=True)


class ProblemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    base_scale_type: str = "multiplicative"
    alternatives: List[AlternativeCreate]

class ProblemResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    base_scale_type: str
    created_at: datetime
    alternatives: List[AlternativeResponse]
    model_config = ConfigDict(from_attributes=True)


class ComparisonCreate(BaseModel):
    expert_id: Optional[int] = 1
    scale_id: int = 1
    alt_i_id: int
    alt_j_id: int
    raw_value: float

class ComparisonBatchCreate(BaseModel):
    comparisons: List[ComparisonCreate]

class ComparisonResponse(BaseModel):
    id: int
    problem_id: int
    expert_id: Optional[int]
    scale_id: int
    alt_i_id: int
    alt_j_id: int
    raw_value: float
    unified_value: float
    model_config = ConfigDict(from_attributes=True)


class CalculationRunResponse(BaseModel):
    id: int
    problem_id: int
    method_name: str
    run_date: datetime
    is_connected: bool
    workers_count: int
    spanning_trees_count: int
    processed_trees_count: int
    exec_time_ms: float
    total_inconsistency: float
    avg_relative_error: Optional[float]
    weights_arithm: List[Dict[str, Any]]
    weights_geom: List[Dict[str, Any]]
    variances: List[Dict[str, Any]]
    model_config = ConfigDict(from_attributes=True)