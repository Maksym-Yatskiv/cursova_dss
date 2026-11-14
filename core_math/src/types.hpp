#pragma once
#include <vector>
#include <numeric>
#include <algorithm>

// Ребро графа
struct Edge {
    int u;
    int v;
    double weight;
};

// Вихідна структура
struct AggregationResult {
    bool is_connected;
    long long spanning_trees_count;
    long long processed_trees_count;
    std::vector<double> weights_arithm;
    std::vector<double> weights_geom;
    std::vector<double> variances;
    double total_inconsistency;
};

// Система неперетинних множин (DSU) для миттєвої перевірки циклів
struct DSU {
    std::vector<int> parent;
    std::vector<int> rank;
    int components;

    DSU(int n) : parent(n), rank(n, 0), components(n) {
        std::iota(parent.begin(), parent.end(), 0);
    }

    int find(int i) {
        while (i != parent[i]) {
            parent[i] = parent[parent[i]];
            i = parent[i];
        }
        return i;
    }

    bool unite(int i, int j) {
        int root_i = find(i);
        int root_j = find(j);
        if (root_i != root_j) {
            if (rank[root_i] < rank[root_j]) std::swap(root_i, root_j);
            parent[root_j] = root_i;
            if (rank[root_i] == rank[root_j]) rank[root_i]++;
            components--;
            return true;
        }
        return false; // Вершини вже в одній компоненті -> ребро утворить цикл
    }
};