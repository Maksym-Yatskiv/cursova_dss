#pragma once
#include "types.hpp"
#include <vector>

bool check_connectivity_bfs(int n, const std::vector<Edge>& edges);
long long count_spanning_trees_kirchhoff(int n, const std::vector<Edge>& edges);
AggregationResult run_combinatorial_method(int n, const std::vector<Edge>& edges, bool use_multithreading);