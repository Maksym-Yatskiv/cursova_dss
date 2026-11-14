#include <vector>
#include <queue>
#include <cmath>
#include <numeric>
#include <stdexcept>
#include <algorithm>
#include <omp.h>

#include "algorithms.hpp"

// Перевірка зв'язності графа методом обходу в ширину (BFS)
bool check_connectivity_bfs(int n, const std::vector<Edge>& edges) {
    if (n <= 1) return true;
    if (static_cast<int>(edges.size()) < n - 1) return false;

    std::vector<std::vector<int>> adj(n);
    for (const auto& e : edges) {
        adj[e.u].push_back(e.v);
        adj[e.v].push_back(e.u);
    }

    std::vector<bool> visited(n, false);
    std::queue<int> q;

    q.push(0);
    visited[0] = true;
    int visited_count = 1;

    while (!q.empty()) {
        int curr = q.front();
        q.pop();

        for (int neighbor : adj[curr]) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                visited_count++;
                q.push(neighbor);
            }
        }
    }

    return visited_count == n;
}


// Матрична теорема Кірхгофа (підрахунок кількості остовних дерев)
long long count_spanning_trees_kirchhoff(int n, const std::vector<Edge>& edges) {
    if (n <= 1) return 1;
    int m = n - 1;
    std::vector<std::vector<double>> laplacian(m, std::vector<double>(m, 0.0));

    for (const auto& e : edges) {
        if (e.u == e.v) continue;
        if (e.u < m) laplacian[e.u][e.u] += 1.0;
        if (e.v < m) laplacian[e.v][e.v] += 1.0;
        if (e.u < m && e.v < m) {
            laplacian[e.u][e.v] -= 1.0;
            laplacian[e.v][e.u] -= 1.0;
        }
    }

    // Обчислення визначника методом Гауса з вибором головного елемента
    double det = 1.0;
    for (int i = 0; i < m; ++i) {
        int pivot = i;
        for (int j = i + 1; j < m; ++j) {
            if (std::abs(laplacian[j][i]) > std::abs(laplacian[pivot][i])) {
                pivot = j;
            }
        }
        if (std::abs(laplacian[pivot][i]) < 1e-12) return 0;
        if (pivot != i) {
            std::swap(laplacian[i], laplacian[pivot]);
            det = -det;
        }
        det *= laplacian[i][i];
        for (int j = i + 1; j < m; ++j) {
            double factor = laplacian[j][i] / laplacian[i][i];
            for (int k = i + 1; k < m; ++k) {
                laplacian[j][k] -= factor * laplacian[i][k];
            }
        }
    }

    return static_cast<long long>(std::llround(std::abs(det)));
}


// Обхід одного остовного дерева (BFS) та розрахунок локальних ваг
void evaluate_spanning_tree(
    int n,
    const std::vector<int>& tree_edge_indices,
    const std::vector<Edge>& all_edges,
    std::vector<double>& local_sum,
    std::vector<double>& local_sum_sq,
    std::vector<double>& local_log_sum
) {
    // Будуємо список суміжності для конкретного дерева з (n - 1) ребер
    std::vector<std::vector<std::pair<int, double>>> adj(n);
    for (int idx : tree_edge_indices) {
        const auto& e = all_edges[idx];
        // Якщо w_u / w_v = weight, то перехід u -> v ділить на weight, а v -> u множить
        adj[e.u].push_back({ e.v, 1.0 / e.weight });
        adj[e.v].push_back({ e.u, e.weight });
    }

    std::vector<double> raw_weights(n, 0.0);
    std::vector<bool> visited(n, false);
    std::queue<int> q;

    // Беремо вершину 0 за корінь дерева з базовою вагою 1.0
    raw_weights[0] = 1.0;
    visited[0] = true;
    q.push(0);

    double total_raw_sum = 1.0;

    while (!q.empty()) {
        int curr = q.front();
        q.pop();

        for (const auto& [neighbor, multiplier] : adj[curr]) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                raw_weights[neighbor] = raw_weights[curr] * multiplier;
                total_raw_sum += raw_weights[neighbor];
                q.push(neighbor);
            }
        }
    }

    // Нормування вектора (сума = 1.0) та акумуляція в локальні буфери потоку
    for (int i = 0; i < n; ++i) {
        double normalized_w = raw_weights[i] / total_raw_sum;
        local_sum[i] += normalized_w;
        local_sum_sq[i] += normalized_w * normalized_w;
        local_log_sum[i] += std::log(normalized_w);
    }
}


// Рекурсивна генерація остовних дерев (Backtracking)
struct SearchTask {
    int next_edge_idx;
    std::vector<int> chosen_edges;
    DSU dsu;
};

void backtrack_trees(
    int n,
    int edge_idx,
    const std::vector<Edge>& all_edges,
    DSU dsu,
    std::vector<int>& current_tree,
    std::vector<double>& local_sum,
    std::vector<double>& local_sum_sq,
    std::vector<double>& local_log_sum,
    long long& local_tree_count
) {
    int needed_edges = (n - 1) - static_cast<int>(current_tree.size());
    if (needed_edges == 0) {
        evaluate_spanning_tree(n, current_tree, all_edges, local_sum, local_sum_sq, local_log_sum);
        local_tree_count++;
        return;
    }

    int remaining_edges = static_cast<int>(all_edges.size()) - edge_idx;
    if (remaining_edges < needed_edges) {
        return; 
    }

    const auto& edge = all_edges[edge_idx];

    // Гілка 1 (ВКЛЮЧЕННЯ): додаємо ребро, якщо воно не утворює цикл
    if (dsu.find(edge.u) != dsu.find(edge.v)) {
        DSU next_dsu = dsu;
        next_dsu.unite(edge.u, edge.v);
        current_tree.push_back(edge_idx);

        backtrack_trees(n, edge_idx + 1, all_edges, next_dsu, current_tree,
            local_sum, local_sum_sq, local_log_sum, local_tree_count);

        current_tree.pop_back();
    }

    // Гілка 2 (ВИКЛЮЧЕННЯ): пропускаємо поточне ребро
    backtrack_trees(n, edge_idx + 1, all_edges, dsu, current_tree,
        local_sum, local_sum_sq, local_log_sum, local_tree_count);
}


// Точка входу
AggregationResult run_combinatorial_method(int n, const std::vector<Edge>& edges) {
    if (n <= 0) throw std::invalid_argument("Кількість альтернатив має бути додатною.");
    for (const auto& e : edges) {
        if (e.u < 0 || e.u >= n || e.v < 0 || e.v >= n)
            throw std::invalid_argument("Індекси вершин виходять за межі [0, n-1].");
        if (e.weight <= 0.0)
            throw std::invalid_argument("Вага ребра у мультиплікативній шкалі має бути > 0.");
    }


    AggregationResult result;
    result.is_connected = check_connectivity_bfs(n, edges);
    if (!result.is_connected) {
        result.spanning_trees_count = 0;
        result.processed_trees_count = 0;
        result.total_inconsistency = 0.0;
        return result;
    }

    result.spanning_trees_count = count_spanning_trees_kirchhoff(n, edges);

    // Розщеплюємо початок пошуку на незалежні задачі для завантаження всіх потоків OpenMP
    std::vector<SearchTask> tasks;
    tasks.push_back({ 0,{}, DSU(n) });

    const size_t TARGET_TASKS = 512;
    while (!tasks.empty() && tasks.size() < TARGET_TASKS) {
        bool any_expanded = false;
        std::vector<SearchTask> next_level;

        for (auto& task : tasks) {
            int needed = (n - 1) - static_cast<int>(task.chosen_edges.size());
            int rem = static_cast<int>(edges.size()) - task.next_edge_idx;

            if (needed == 0 || task.next_edge_idx >= static_cast<int>(edges.size())) {
                next_level.push_back(task);
                continue;
            }
            if (rem < needed) continue; // Відсікаємо мертву гілку

            any_expanded = true;
            const auto& edge = edges[task.next_edge_idx];

            // Гілка з включенням ребра
            if (task.dsu.find(edge.u) != task.dsu.find(edge.v)) {
                SearchTask incl_task = task;
                incl_task.next_edge_idx++;
                incl_task.dsu.unite(edge.u, edge.v);
                incl_task.chosen_edges.push_back(task.next_edge_idx);
                next_level.push_back(std::move(incl_task));
            }

            // Гілка з виключенням ребра
            SearchTask excl_task = task;
            excl_task.next_edge_idx++;
            next_level.push_back(std::move(excl_task));
        }
        tasks = std::move(next_level);
        if (!any_expanded) break;
    }

    std::vector<double> global_sum(n, 0.0);
    std::vector<double> global_sum_sq(n, 0.0);
    std::vector<double> global_log_sum(n, 0.0);
    long long total_processed = 0;

    // Паралельне виконання на всіх ядрах процесора
#pragma omp parallel
    {
        std::vector<double> local_sum(n, 0.0);
        std::vector<double> local_sum_sq(n, 0.0);
        std::vector<double> local_log_sum(n, 0.0);
        long long local_count = 0;

#pragma omp for schedule(dynamic) nowait
        for (int i = 0; i < static_cast<int>(tasks.size()); ++i) {
            std::vector<int> current_tree = tasks[i].chosen_edges;
            backtrack_trees(
                n, tasks[i].next_edge_idx, edges, tasks[i].dsu,
                current_tree, local_sum, local_sum_sq, local_log_sum, local_count
            );
        }

        // Редукція локальних результатів у глобальні масиви
#pragma omp critical
        {
            for (int j = 0; j < n; ++j) {
                global_sum[j] += local_sum[j];
                global_sum_sq[j] += local_sum_sq[j];
                global_log_sum[j] += local_log_sum[j];
            }
            total_processed += local_count;
        }
    }

    result.processed_trees_count = total_processed;
    result.weights_arithm.resize(n, 0.0);
    result.weights_geom.resize(n, 0.0);
    result.variances.resize(n, 0.0);
    result.total_inconsistency = 0.0;

    // Глобальна агрегація та оцінка узгодженості
    if (total_processed > 0) {
        double inv_S = 1.0 / static_cast<double>(total_processed);
        double geom_norm_sum = 0.0;

        for (int i = 0; i < n; ++i) {
            // Середнє арифметичне
            double mean = global_sum[i] * inv_S;
            result.weights_arithm[i] = mean;

            // Дисперсія: E[X^2] - (E[X])^2
            double var = (global_sum_sq[i] * inv_S) - (mean * mean);
            if (var < 0.0) var = 0.0;
            result.variances[i] = var;
            result.total_inconsistency += var;

            // Середнє геометричне (через експоненту середнього логарифма)
            result.weights_geom[i] = std::exp(global_log_sum[i] * inv_S);
            geom_norm_sum += result.weights_geom[i];
        }

        // Повторне нормування геометричних ваг, щоб їхня сума точно дорівнювала 1.0
        for (int i = 0; i < n; ++i) {
            result.weights_geom[i] /= geom_norm_sum;
        }
    }

    return result;
}