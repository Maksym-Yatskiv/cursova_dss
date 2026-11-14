import { observer } from "mobx-react-lite";
import { useDssStore } from "../App";

const HistoryTab = observer(({ onSelectRun }: { onSelectRun: () => void }) => {
  const store = useDssStore();

  const handleClear = () => {
    if (window.confirm("Очистити всю історію для цієї задачі?")) {
      store.clearCalculationHistory();
    }
  };

  return (
    <div className="tab-panel">
      <div className="panel-header">
        <h3>Історія запусків</h3>
        {store.runsHistory.length > 0 && (
          <button className="btn-danger btn-sm" onClick={handleClear}>
            Очистити історію
          </button>
        )}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Дата</th>
            <th>Метод</th>
            <th>Потоків</th>
            <th>Дерев</th>
            <th>Час (мс)</th>
            <th>Дисперсія</th>
            <th>Похибка</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {store.runsHistory.length === 0 ? (
            <tr>
              <td colSpan={9}>Історія порожня</td>
            </tr>
          ) : (
            store.runsHistory.map((run) => (
              <tr key={run.id}>
                <td>#{run.id}</td>
                <td>{new Date(run.run_date).toLocaleString("uk-UA")}</td>
                <td>{run.method_name}</td>
                <td>{run.workers_count}</td>
                <td>{run.spanning_trees_count}</td>
                <td>{run.exec_time_ms}</td>
                <td>{run.total_inconsistency.toFixed(5)}</td>
                <td>
                  {run.max_relative_error !== null
                    ? `${(run.max_relative_error * 100).toFixed(2)}%`
                    : "—"}
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => {
                        store.setLatestResult(run);
                        onSelectRun();
                      }}
                    >
                      Відкрити
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => store.deleteCalculationRun(run.id)}
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
});

export default HistoryTab;