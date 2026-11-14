import { useState } from "react";
import { observer } from "mobx-react-lite";
import { useDssStore } from "../App";

const CalculationTab = observer(() => {
  const store = useDssStore();
  const [method, setMethod] = useState("combinatorial_geom");

  const res = store.latestResult;
  const alts = store.activeProblem?.alternatives || [];

  const hasAllRefs =
    alts.length > 0 &&
    alts.every((a) => a.reference_weight !== null && a.reference_weight > 0);

  const refSum = hasAllRefs
    ? alts.reduce((sum, a) => sum + (a.reference_weight || 0), 0)
    : 0;

  return (
    <div className="tab-panel">
      <div className="panel-header">
        <h3>Розрахунок ваг альтернатив</h3>
        <div className="calc-controls">
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="combinatorial_geom">Середньогеометричний метод</option>
            <option value="combinatorial_arithm">Середньоарифметичний метод</option>
          </select>
          <button
            className="btn-success"
            onClick={() => store.executeCalculation(method)}
            disabled={store.loading}
          >
            {store.loading ? "Розрахунок..." : "Розрахувати"}
          </button>
        </div>
      </div>

      {!res ? (
        <p>Немає результатів. Натисніть «Розрахувати».</p>
      ) : (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Час виконання</div>
              <div className="metric-value">{res.exec_time_ms} мс</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Остовних дерев</div>
              <div className="metric-value">{res.spanning_trees_count}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Потоків OpenMP</div>
              <div className="metric-value">{res.workers_count}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Загальна дисперсія</div>
              <div className="metric-value">{res.total_inconsistency.toFixed(5)}</div>
            </div>
            {res.max_relative_error !== null && (
              <div className="metric-card">
                <div className="metric-label">Відносна похибка Δ</div>
                <div className="metric-value">
                  {(res.max_relative_error * 100).toFixed(2)}%
                </div>
              </div>
            )}
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Альтернатива</th>
                {hasAllRefs && <th>Еталон (w*)</th>}
                <th>Вага (геом.)</th>
                <th>Вага (арифм.)</th>
                <th>Пріоритет (%)</th>
                <th>Дисперсія</th>
              </tr>
            </thead>
            <tbody>
              {res.weights_geom.map((item, idx) => {
                const arithm = res.weights_arithm[idx]?.weight || 0;
                const variance = res.variances[idx]?.variance || 0;
                const activeW = method === "combinatorial_arithm" ? arithm : item.weight;

                const altObj = alts.find((a) => a.id === item.alternative_id);
                const rawRef = altObj?.reference_weight || 0;
                const normRef = hasAllRefs ? rawRef / refSum : 0;

                return (
                  <tr key={item.alternative_id}>
                    <td>
                      <b>{item.name}</b>
                    </td>
                    {hasAllRefs &&
                      <td>
                        {normRef.toFixed(4)}
                        {Math.abs(refSum - 1) > 0.001 ? ` (${rawRef})` : ""}
                      </td>
                    }
                    <td>{item.weight.toFixed(4)}</td>
                    <td>{arithm.toFixed(4)}</td>
                    <td>
                      <div className="bar-cell">
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{ width: `${Math.round(activeW * 100)}%` }}
                          />
                        </div>
                        <span>{(activeW * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td>{variance.toFixed(5)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
});

export default CalculationTab;