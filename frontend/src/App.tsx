import { createContext, useState, useContext } from "react";
import { observer } from "mobx-react-lite";
import { DssStore } from "./context/DssContext";
import Sidebar from "./components/Sidebar";
import ComparisonsTab from "./components/ComparisonsTab";
import CalculationTab from "./components/CalculationTab";
import HistoryTab from "./components/HistoryTab";
import "./App.css";

export const dssStore = new DssStore();
const DssContext = createContext<DssStore>(dssStore);

export function useDssStore() {
  return useContext(DssContext);
}

const MainWorkspace = observer(() => {
  const store = useDssStore();
  const [tab, setTab] = useState("comparisons");

  if (!store.activeProblem) {
    return (
      <main className="workspace">
        <h2>Оберіть або створіть задачу в меню ліворуч</h2>
      </main>
    );
  }

  return (
    <main className="workspace">
      <div className="workspace-header">
        <div>
          <h1>{store.activeProblem.title}</h1>
          {store.activeProblem.description && <p>{store.activeProblem.description}</p>}
        </div>
      </div>

      {store.error && (
        <div className="alert-error">
          <span>Помилка: {store.error}</span>
          <button onClick={() => store.setError(null)}>✕</button>
        </div>
      )}

      <div className="tabs-nav">
        <button
          className={tab === "comparisons" ? "tab-btn active" : "tab-btn"}
          onClick={() => setTab("comparisons")}
        >
          1. Ввід оцінок
        </button>
        <button
          className={tab === "calculation" ? "tab-btn active" : "tab-btn"}
          onClick={() => setTab("calculation")}
        >
          2. Розрахунок
        </button>
        <button
          className={tab === "history" ? "tab-btn active" : "tab-btn"}
          onClick={() => setTab("history")}
        >
          3. Історія ({store.runsHistory.length})
        </button>
      </div>

      <div className="tab-content">
        {tab === "comparisons" && <ComparisonsTab />}
        {tab === "calculation" && <CalculationTab />}
        {tab === "history" && <HistoryTab onSelectRun={() => setTab("calculation")} />}
      </div>
    </main>
  );
});

export default function App() {
  return (
    <DssContext.Provider value={dssStore}>
      <div className="app-layout">
        <Sidebar />
        <MainWorkspace />
      </div>
    </DssContext.Provider>
  );
}