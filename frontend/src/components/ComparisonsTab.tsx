import { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useDssStore } from "../App";
import { IComparison } from "../context/DssContext";

const ComparisonsTab = observer(() => {
  const store = useDssStore();
  const alts = store.activeProblem?.alternatives || [];

  const [edges, setEdges] = useState<IComparison[]>([]);
  const [expertId, setExpertId] = useState(1);
  const [scaleId, setScaleId] = useState(1);
  const [altI, setAltI] = useState(0);
  const [altJ, setAltJ] = useState(0);
  const [val, setVal] = useState("1");

  const [showExperts, setShowExperts] = useState(false);
  const [newExpName, setNewExpName] = useState("");
  const [newExpComp, setNewExpComp] = useState("1.0");

  useEffect(() => {
    setEdges(store.comparisons.map((c) => ({ ...c })));
    if (alts.length >= 2) {
      setAltI(alts[0].id);
      setAltJ(alts[1].id);
    }
    if (store.experts.length > 0) {
      setExpertId(store.experts[0].id);
    }
  }, [store.comparisons, store.activeProblem, store.experts.length]);

  const currentScale = store.scales.find((s) => s.id === scaleId);

  const handleCreateExpert = async (e: any) => {
    e.preventDefault();
    if (!newExpName.trim()) return;
    await store.addExpert(newExpName.trim(), parseFloat(newExpComp) || 1.0);
    setNewExpName("");
    setNewExpComp("1.0");
  };

  const addEdge = (e: any) => {
    e.preventDefault();
    if (altI === altJ) {
      alert("Оберіть різні альтернативи для порівняння");
      return;
    }

    setEdges([
      ...edges,
      {
        expert_id: expertId,
        scale_id: scaleId,
        alt_i_id: altI,
        alt_j_id: altJ,
        raw_value: parseFloat(val),
      },
    ]);
  };

  const removeEdge = (index: number) => {
    setEdges(edges.filter((_, i) => i !== index));
  };

  const generateChain = () => {
    if (alts.length < 2 || store.scales.length === 0) return;

    const generated: IComparison[] = [];
    const expList = store.experts.length > 0 ? store.experts : [{ id: expertId }];

    const createRandomEdge = (idxI: number, idxJ: number) => {
      const aI = alts[idxI];
      const aJ = alts[idxJ];
      const scale = store.scales[Math.floor(Math.random() * store.scales.length)];
      const exp = expList[Math.floor(Math.random() * expList.length)];

      let ratio = 1;
      if (aI.reference_weight && aJ.reference_weight && aJ.reference_weight > 0) {
        ratio = aI.reference_weight / aJ.reference_weight;
      } else {
        ratio = 0.25 + Math.random() * 4.5;
      }

      const noise = 0.85 + Math.random() * 0.3;
      const noisyRatio = ratio * noise;

      let rawVal = 1;
      if (scale.scale_type === "additive") {
        const c = scale.base_c > 1 ? scale.base_c : 1.35;
        rawVal = Math.log(noisyRatio) / Math.log(c);
      } else {
        rawVal = noisyRatio;
      }

      rawVal = Math.max(scale.min_val, Math.min(scale.max_val, rawVal));
      rawVal = Number(rawVal.toFixed(2));

      return {
        expert_id: exp.id,
        scale_id: scale.id,
        alt_i_id: aI.id,
        alt_j_id: aJ.id,
        raw_value: rawVal,
      };
    };

    for (let i = 0; i < alts.length - 1; i++) {
      generated.push(createRandomEdge(i, i + 1));
    }

    for (let i = 0; i < alts.length; i++) {
      for (let j = i + 2; j < alts.length; j++) {
        if (Math.random() < 0.7) {
          generated.push(createRandomEdge(i, j));
        }
        if (Math.random() < 0.25) {
          generated.push(createRandomEdge(i, j));
        }
      }
    }

    setEdges(generated);
  };

  const handleSave = async () => {
    await store.saveProblemComparisons(edges);
    alert("Оцінки збережено!");
  };

  const VERBAL_OPTIONS = [
    { label: "Значно гірше (0.2)", textOnly: "Значно гірше", value: 0.2 },
    { label: "Трохи гірше (0.5)", textOnly: "Трохи гірше", value: 0.5 },
    { label: "Однаково (1.0)", textOnly: "Однаково", value: 1.0 },
    { label: "Трохи краще (2.0)", textOnly: "Трохи краще", value: 2.0 },
    { label: "Значно краще (5.0)", textOnly: "Значно краще", value: 5.0 },
  ];

  const formatVerbalValue = (val: number) => {
    const closest = VERBAL_OPTIONS.reduce((prev, curr) =>
      Math.abs(curr.value - val) < Math.abs(prev.value - val) ? curr : prev
    );
    return `${closest.textOnly} (${val})`;
  };

  const selectedScaleObj = store.scales.find((s) => s.id === Number(scaleId));
  const isVerbalScale = selectedScaleObj?.name.toLowerCase().includes("вербальна");

  const getAltName = (id: number) => alts.find((a) => a.id === id)?.name || id;
  const getScaleName = (id: number) => store.scales.find((s) => s.id === id)?.name || id;
  const getExpertLabel = (id: number | null) => {
    if (!id) return "Видалений експерт";
    const ex = store.experts.find((e) => e.id === id);
    return ex ? `${ex.name} (k=${ex.competence})` : "Видалений експерт";
  };

  return (
    <div className="tab-panel">
      <div className="panel-header">
        <h3>Попарні порівняння альтернатив</h3>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowExperts(!showExperts)}>
            {showExperts ? "Сховати експертів" : `Експерти (${store.experts.length})`}
          </button>
          <button className="btn-secondary" onClick={generateChain}>
            Згенерувати тестовий граф
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={edges.length === 0}>
            Зберегти оцінки ({edges.length})
          </button>
        </div>
      </div>

      {showExperts && (
        <div className="edge-add-bar" style={{ flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
          <form onSubmit={handleCreateExpert} style={{ display: "flex", gap: "10px", alignItems: "flex-end", marginBottom: "8px" }}>
            <div className="field-group">
              <label>Ім'я нового експерта</label>
              <input
                type="text"
                placeholder="Напр. Експерт 2"
                value={newExpName}
                onChange={(e) => setNewExpName(e.target.value)}
                style={{ padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                required
              />
            </div>
            <div className="field-group">
              <label>Компетентність (k)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="5.0"
                value={newExpComp}
                onChange={(e) => setNewExpComp(e.target.value)}
                style={{ width: "110px" }}
                required
              />
            </div>
            <button type="submit" className="btn-success">
              + Додати експерта
            </button>
          </form>

          <div style={{ width: "100%", maxWidth: "450px" }}>
            <h4 style={{ marginBottom: "8px", fontSize: "0.85rem", color: "#475569" }}>Список експертів в системі:</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
              {store.experts.map((ex) => (
                <li
                  key={ex.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "#fff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px"
                  }}
                >
                  <span>
                    {ex.name} <strong>(k={ex.competence})</strong>
                  </span>
                  {store.experts.length > 1 && (
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => store.deleteExpert(ex.id)}
                      title="Видалити експерта"
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <form className="edge-add-bar" onSubmit={addEdge}>
        <div className="field-group">
          <label>Експерт</label>
          <select value={expertId} onChange={(e) => setExpertId(Number(e.target.value))}>
            {store.experts.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} (k={ex.competence})
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label>Шкала</label>
          <select value={scaleId} onChange={(e) => setScaleId(Number(e.target.value))}>
            {store.scales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label>Альтернатива 1</label>
          <select value={altI} onChange={(e) => setAltI(Number(e.target.value))}>
            {alts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label>Альтернатива 2</label>
          <select value={altJ} onChange={(e) => setAltJ(Number(e.target.value))}>
            {alts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label>Оцінка</label>
          {isVerbalScale ? (
            <select
              value={val}
              onChange={(e) => setVal( e.target.value )}
            >
              {VERBAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              step="0.1"
              value={val}
              onChange={(e) => setVal( e.target.value )}
            />
            )}
          </div>

        <button type="submit" className="btn-secondary">
          + Додати
        </button>
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Експерт</th>
            <th>Шкала</th>
            <th>Пара альтернатив</th>
            <th>Оцінка</th>
            <th>Уніфіковане знач. (з k)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {edges.length === 0 ? (
            <tr>
              <td colSpan={7}>Список порівнянь порожній</td>
            </tr>
          ) : (
            edges.map((e, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{getExpertLabel(e.expert_id)}</td>
                <td>{getScaleName(e.scale_id)}</td>
                <td>
                  {getAltName(e.alt_i_id)} → {getAltName(e.alt_j_id)}
                </td>
                <td>{e.raw_value}</td>
                <td>{e.unified_value !== undefined ? e.unified_value.toFixed(4) : "—"}</td>
                <td>
                  <button className="btn-icon" onClick={() => removeEdge(i)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
});

export default ComparisonsTab;