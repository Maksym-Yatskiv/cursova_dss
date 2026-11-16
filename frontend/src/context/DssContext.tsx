import { makeAutoObservable, runInAction } from "mobx";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export interface IScale {
  id: number;
  name: string;
  scale_type: "multiplicative" | "additive";
  min_val: number;
  max_val: number;
  base_c: number;
}

export interface IExpert {
  id: number;
  name: string;
  competence: number;
}

export interface IAlternative {
  id: number;
  problem_id: number;
  name: string;
  reference_weight: number | null;
}

export interface IProblem {
  id: number;
  title: string;
  description: string | null;
  base_scale_type: string;
  created_at: string;
  alternatives: IAlternative[];
}

export interface IComparison {
  id?: number;
  problem_id?: number;
  expert_id: number;
  scale_id: number;
  alt_i_id: number;
  alt_j_id: number;
  raw_value: number;
  unified_value?: number;
}

export interface ICalculationRun {
  id: number;
  problem_id: number;
  run_date: string;
  method_name: string;
  is_connected: boolean;
  workers_count: number;
  spanning_trees_count: number;
  processed_trees_count: number;
  exec_time_ms: number;
  total_inconsistency: number;
  avg_relative_error: number | null;
  weights_arithm: { alternative_id: number; name: string; weight: number }[];
  weights_geom: { alternative_id: number; name: string; weight: number }[];
  variances: { alternative_id: number; name: string; variance: number }[];
}

export class DssStore {
  scales: IScale[] = [];
  experts: IExpert[] = [];
  problems: IProblem[] = [];

  activeProblem: IProblem | null = null;
  comparisons: IComparison[] = [];
  runsHistory: ICalculationRun[] = [];
  latestResult: ICalculationRun | null = null;

  loading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.loadInitialData();
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || `Помилка: ${res.status}`);
    }
    return res.json();
  }

  setError(msg: string | null) {
    this.error = msg;
  }

  setLatestResult(run: ICalculationRun | null) {
    this.latestResult = run;
  }

  setActiveProblem(problem: IProblem | null) {
    this.activeProblem = problem;
    if (problem) {
      this.loadProblemDetails(problem.id);
    } else {
      this.comparisons = [];
      this.runsHistory = [];
      this.latestResult = null;
    }
  }

  async loadInitialData() {
    this.loading = true;
    try {
      const [scales, experts, problems] = await Promise.all([
        this.request("/scales"),
        this.request("/experts"),
        this.request("/problems"),
      ]);

      runInAction(() => {
        this.scales = scales;
        this.experts = experts;
        this.problems = problems;
        if (problems.length > 0 && !this.activeProblem) {
          this.setActiveProblem(problems[0]);
        }
      });
    } catch (err: any) {
      runInAction(() => (this.error = err.message));
    } finally {
      runInAction(() => (this.loading = false));
    }
  }

  async loadProblemDetails(problemId: number) {
    this.loading = true;
    try {
      const [comps, runs] = await Promise.all([
        this.request(`/problems/${problemId}/comparisons`),
        this.request(`/problems/${problemId}/runs`),
      ]);

      runInAction(() => {
        this.comparisons = comps;
        this.runsHistory = runs;
        this.latestResult = runs.length > 0 ? runs[0] : null;
      });
    } catch (err: any) {
      runInAction(() => (this.error = err.message));
    } finally {
      runInAction(() => (this.loading = false));
    }
  }

  async createNewProblem(payload: any) {
    this.loading = true;
    this.error = null;
    try {
      const created = await this.request("/problems", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      runInAction(() => {
        this.problems.unshift(created);
        this.setActiveProblem(created);
      });
    } catch (err: any) {
      runInAction(() => (this.error = err.message));
    } finally {
      runInAction(() => (this.loading = false));
    }
  }

  async deleteProblem(problemId: number) {
    try {
      await this.request(`/problems/${problemId}`, { method: "DELETE" });
      runInAction(() => {
        this.problems = this.problems.filter((p) => p.id !== problemId);
        if (this.activeProblem?.id === problemId) {
          this.setActiveProblem(this.problems[0] || null);
        }
      });
    } catch (err: any) {
      runInAction(() => (this.error = err.message));
    }
  }

  async saveProblemComparisons(edges: IComparison[]) {
    if (!this.activeProblem) return;
    this.loading = true;
    this.error = null;
    try {
      const saved = await this.request(
        `/problems/${this.activeProblem.id}/comparisons?replace_existing=true`,
        {
          method: "POST",
          body: JSON.stringify({ comparisons: edges }),
        }
      );
      runInAction(() => (this.comparisons = saved));
    } catch (err: any) {
      runInAction(() => (this.error = err.message));
    } finally {
      runInAction(() => (this.loading = false));
    }
  }

  async executeCalculation(methodName = "combinatorial_geom", useMultithreading = true) {
    if (!this.activeProblem) return;
    this.loading = true;
    this.error = null;
    try {
      const res = await this.request(
        `/problems/${this.activeProblem.id}/calculate?method_name=${methodName}&use_multithreading=${useMultithreading}`,
        { method: "POST" }
      );
      runInAction(() => {
        this.latestResult = res;
        this.runsHistory.unshift(res);
      });
    } catch (err: any) {
      runInAction(() => (this.error = err.message));
    } finally {
      runInAction(() => (this.loading = false));
    }
  }

  async deleteCalculationRun(runId: number) {
    if (!this.activeProblem) return;
    try {
      await this.request(`/problems/${this.activeProblem.id}/runs/${runId}`, {
        method: "DELETE",
      });
      runInAction(() => {
        this.runsHistory = this.runsHistory.filter((r) => r.id !== runId);
        if (this.latestResult?.id === runId) {
          this.latestResult = this.runsHistory[0] || null;
        }
      });
    } catch (err: any) {
      runInAction(() => (this.error = err.message));
    }
  }

  async clearCalculationHistory() {
    if (!this.activeProblem) return;
    try {
      await this.request(`/problems/${this.activeProblem.id}/runs`, {
        method: "DELETE",
      });
      runInAction(() => {
        this.runsHistory = [];
        this.latestResult = null;
      });
    } catch (err: any) {
      runInAction(() => (this.error = err.message));
    }
  }

async addExpert(name: string, competence: number) {
    try {
      const exp = await this.request("/experts", {
        method: "POST",
        body: JSON.stringify({ name, competence }),
      });
      runInAction(() => {
        this.experts.push(exp);
      });
    } catch (err: any) {
      runInAction(() => (this.error = err.message));
    }
  }

  async deleteExpert(expertId: number) {
    try {
      await this.request(`/experts/${expertId}`, { method: "DELETE" });
      runInAction(() => {
        this.experts = this.experts.filter((e) => e.id !== expertId);
      });
    } catch (err: any) {
      runInAction(() => (this.error = err.message));
    }
  }
}