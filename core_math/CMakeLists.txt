cmake_minimum_required(VERSION 3.15)
project(core_math_project)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Python3 COMPONENTS Interpreter Development REQUIRED)

message(STATUS ">>> CMake is using Python: ${Python3_EXECUTABLE} <<<")

execute_process(
    COMMAND "${Python3_EXECUTABLE}" -c "import pybind11; print(pybind11.get_cmake_dir())"
    OUTPUT_VARIABLE PYBIND11_CMAKE_DIR
    ERROR_VARIABLE PYBIND11_ERR
    OUTPUT_STRIP_TRAILING_WHITESPACE
)


if(PYBIND11_ERR MATCHES "ModuleNotFoundError")
    message(FATAL_ERROR "pybind11 не знайдено! CMake використовує інший Python (${Python3_EXECUTABLE}). Будь ласка, встановіть pybind11 для цього Python.")
endif()


file(TO_CMAKE_PATH "${PYBIND11_CMAKE_DIR}" PYBIND11_CMAKE_DIR)
message(STATUS ">>> pybind11 path fixed: ${PYBIND11_CMAKE_DIR} <<<")


list(APPEND CMAKE_PREFIX_PATH "${PYBIND11_CMAKE_DIR}")


find_package(pybind11 REQUIRED)
find_package(OpenMP REQUIRED)


pybind11_add_module(core_math src/bindings.cpp src/algorithms.cpp)
target_link_libraries(core_math PRIVATE OpenMP::OpenMP_CXX)


if(MSVC)
    target_compile_options(core_math PRIVATE /O2)
else()
    target_compile_options(core_math PRIVATE -O3 -march=native)
endif()