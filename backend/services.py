import sys
import os
import math
from sqlalchemy.orm import Session
import models

core_math_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "core_math"))
if core_math_dir not in sys.path:
    sys.path.insert(0, core_math_dir)

import core_math

def unify_comparison_value(raw_value: float, scale: models.Scale, competence: float = 1.0) -> float:
    if scale.scale_type == "multiplicative":
        if raw_value <= 0:
            raise ValueError("Оцінка має бути додатною")
        base_val = float(raw_value)
    elif scale.scale_type == "additive":
        base_val = float(math.pow(scale.base_c, raw_value))
    else:
        raise ValueError("Невідомий тип шкали")

    return float(math.pow(base_val, competence))

def seed_initial_data(db: Session):
    if db.query(models.Scale).count() == 0:
        db.add_all([
            models.Scale(name="Мультиплікативна Сааті (1-9)", scale_type="multiplicative", min_val=1/9, max_val=9.0, base_c=1.0),
            models.Scale(name="Адитивна 10-бальна (-9 .. +9)", scale_type="additive", min_val=-9.0, max_val=9.0, base_c=1.35),
            models.Scale(name="Вербальна 5-рівнева (1-5)", scale_type="multiplicative", min_val=0.2, max_val=5.0, base_c=1.0),
        ])
        db.commit()

    if db.query(models.Expert).count() == 0:
        db.add(models.Expert(name="Основний експерт", competence=1.0))
        db.commit()