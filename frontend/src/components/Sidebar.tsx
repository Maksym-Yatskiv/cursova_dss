import { useState } from "react";
import { observer } from "mobx-react-lite";
import { useDssStore } from "../App";

const Sidebar = observer(() => {
  const store = useDssStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [alts, setAlts] = useState([
    { name: "Альтернатива 1", weight: "0.5" },
    { name: "Альтернатива 2", weight: "0.3" },
    { name: "Альтернатива 3", weight: "0.2" },
  ]);

  const addAlt = () => {
    setAlts([...alts, { name: `Альтернатива ${alts.length + 1}`, weight: "" }]);
  };

  const removeAlt = (idx: number) => {
    if (alts.length <= 2) return;
    setAlts(alts.filter((_, i) => i !== idx));
  };

  const updateAlt = (idx: number, field: "name" | "weight", value: string) => {
    const updated = [...alts];
    updated[idx][field] = value;
    setAlts(updated);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Перевірка на унікальність імен альтернатив
    const names = alts.map((a) => a.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      alert("Помилка: назви альтернатив мають бути різними!");
      return;
    }

    await store.createNewProblem({
      title: title.trim(),
      description: description.trim() || null,
      base_scale_type: "multiplicative",
      alternatives: alts.map((a) => ({
        name: a.name.trim(),
        reference_weight: a.weight !== "" ? parseFloat(a.weight) : null,
      })),
    });

    setTitle("");
    setDescription("");
    setShowForm(false);
  };

  const handleDelete = (e: any, id: number, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Видалити задачу "${name}"?`)) {
      store.deleteProblem(id);
    }
  };

  return (
    <aside className={isCollapsed ? "sidebar collapsed" : "sidebar"}>
      <div className="sidebar-header">
        {!isCollapsed && <h2>Задачі</h2>}
        <div className="sidebar-header-actions">
          {!isCollapsed && (
            <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Закрити" : "+ Нова"}
            </button>
          )}
          <button className="btn-collapse" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? ">>" : "<<"}
          </button>
        </div>
      </div>

      {!isCollapsed && showForm && (
        <form className="problem-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Назва задачі"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="Опис задачі (необов'язково)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />

          <div className="alts-section">
            <div className="alts-header">
              <span>Альтернатива</span>
              <span>Еталон w*</span>
            </div>

            {alts.map((alt, i) => (
              <div key={i} className="alt-row">
                <input
                  type="text"
                  value={alt.name}
                  onChange={(e) => updateAlt(i, "name", e.target.value)}
                  required
                />
                <input
                  type="number"
                  step="any"
                  className="weight-input"
                  placeholder="0.0"
                  value={alt.weight}
                  onChange={(e) => updateAlt(i, "weight", e.target.value)}
                />
                {alts.length > 2 && (
                  <button type="button" className="btn-icon" onClick={() => removeAlt(i)}>
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button type="button" className="btn-secondary" onClick={addAlt}>
              + Додати альтернативу
            </button>
          </div>

          <button type="submit" className="btn-success">
            Створити
          </button>
        </form>
      )}

      <div className="problem-list">
        {store.problems.map((p) => (
          <div
            key={p.id}
            className={store.activeProblem?.id === p.id ? "problem-card active" : "problem-card"}
            onClick={() => store.setActiveProblem(p)}
          >
            {isCollapsed ? (
              <b>#{p.id}</b>
            ) : (
              <div className="problem-card-row">
                <div>
                  <div className="problem-title">{p.title}</div>
                  <div className="problem-meta">Альтернатив: {p.alternatives.length}</div>
                </div>
                <button
                  className="btn-delete-problem"
                  onClick={(e) => handleDelete(e, p.id, p.title)}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
});

export default Sidebar;