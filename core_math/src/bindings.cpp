#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include "types.hpp"
#include "algorithms.hpp"

namespace py = pybind11;

PYBIND11_MODULE(core_math, m) {
    m.doc() = "C++ OpenMP Core for Combinatorial Method";

    py::class_<Edge>(m, "Edge")
        .def(py::init<int, int, double>(), py::arg("u"), py::arg("v"), py::arg("weight"))
        .def_readwrite("u", &Edge::u)
        .def_readwrite("v", &Edge::v)
        .def_readwrite("weight", &Edge::weight);

    py::class_<AggregationResult>(m, "AggregationResult")
        .def_readonly("is_connected", &AggregationResult::is_connected)
        .def_readonly("spanning_trees_count", &AggregationResult::spanning_trees_count)
        .def_readonly("processed_trees_count", &AggregationResult::processed_trees_count)
        .def_readonly("weights_arithm", &AggregationResult::weights_arithm)
        .def_readonly("weights_geom", &AggregationResult::weights_geom)
        .def_readonly("variances", &AggregationResult::variances)
        .def_readonly("total_inconsistency", &AggregationResult::total_inconsistency);

    m.def("run_combinatorial_method", &run_combinatorial_method,
        py::arg("n"), py::arg("edges"),
        "Виконує повний цикл комбінаторного методу на всіх потоках OpenMP");
}