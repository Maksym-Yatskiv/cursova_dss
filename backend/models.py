import datetime
from sqlalchemy import Column, Integer, BigInteger, String, Float, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from database import Base


class Problem(Base):
    __tablename__ = "problems"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    base_scale_type = Column(String, default="multiplicative")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    alternatives = relationship("Alternative", back_populates="problem", cascade="all, delete-orphan")
    comparisons = relationship("PairwiseComparison", back_populates="problem", cascade="all, delete-orphan")
    runs = relationship("CalculationRun", back_populates="problem", cascade="all, delete-orphan")


class Alternative(Base):
    __tablename__ = "alternatives"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    reference_weight = Column(Float, nullable=True)

    problem = relationship("Problem", back_populates="alternatives")


class Scale(Base):
    __tablename__ = "scales"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    scale_type = Column(String, nullable=False)
    min_val = Column(Float, nullable=False)
    max_val = Column(Float, nullable=False)
    base_c = Column(Float, default=1.0)


class Expert(Base):
    __tablename__ = "experts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    competence = Column(Float, default=1.0)


class PairwiseComparison(Base):
    __tablename__ = "pairwise_comparisons"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    expert_id = Column(Integer, ForeignKey("experts.id", ondelete="SET NULL"), nullable=True)
    scale_id = Column(Integer, ForeignKey("scales.id", ondelete="RESTRICT"), nullable=False)

    alt_i_id = Column(Integer, ForeignKey("alternatives.id", ondelete="CASCADE"), nullable=False)
    alt_j_id = Column(Integer, ForeignKey("alternatives.id", ondelete="CASCADE"), nullable=False)

    raw_value = Column(Float, nullable=False)
    unified_value = Column(Float, nullable=False)

    problem = relationship("Problem", back_populates="comparisons")
    expert = relationship("Expert")
    scale = relationship("Scale")


class CalculationRun(Base):
    __tablename__ = "calculation_runs"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    method_name = Column(String, default="combinatorial_geom")
    run_date = Column(DateTime, default=datetime.datetime.utcnow)

    is_connected = Column(Boolean, nullable=False)
    workers_count = Column(Integer, nullable=False)
    spanning_trees_count = Column(BigInteger, nullable=False)
    processed_trees_count = Column(BigInteger, nullable=False)
    exec_time_ms = Column(Float, nullable=False)
    total_inconsistency = Column(Float, nullable=False)
    max_relative_error = Column(Float, nullable=True)

    weights_arithm = Column(JSON, nullable=False)
    weights_geom = Column(JSON, nullable=False)
    variances = Column(JSON, nullable=False)

    problem = relationship("Problem", back_populates="runs")