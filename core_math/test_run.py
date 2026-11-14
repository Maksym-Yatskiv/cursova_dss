import time
import random
import core_math

def generate_random_complete_graph(n):
    edges = []
    # Фіксуємо seed, щоб результати були відтворюваними при різних запусках
    random.seed(42)
    
    # Генеруємо оцінки для кожної можливої пари альтернатив (повний граф)
    for i in range(n):
        for j in range(i + 1, n):
            # Випадкова оцінка від 1 до 9 (класична шкала Сааті)
            val = random.uniform(1.0, 9.0)
            
            # З ймовірністю 50% експерт вважає, що i > j, інакше j > i
            if random.random() > 0.5:
                edges.append(core_math.Edge(i, j, val))
            else:
                edges.append(core_math.Edge(j, i, val))
                
    return edges

def run_stress_test():
    n = 9  # Для 9 альтернатив повний граф має 4,782,969 дерев
    
    print(f"Генерація повного графа для {n} альтернатив...")
    edges = generate_random_complete_graph(n)
    print(f"Кількість експертних оцінок (ребер): {len(edges)}")
    
    print("\nЗапуск C++ ядра на всіх потоках (очікуйте кілька секунд)...")
    
    start_time = time.perf_counter()
    res = core_math.run_combinatorial_method(n, edges)
    elapsed_time = time.perf_counter() - start_time
    
    print(f"\n=== РЕЗУЛЬТАТИ СТРЕС-ТЕСТУ ({n} альтернатив) ===")
    print(f"Час виконання:              {elapsed_time:.4f} секунд")
    print(f"Граф зв'язний:              {res.is_connected}")
    print(f"Дерев за Кірхгофом:         {res.spanning_trees_count:,}".replace(',', ' '))
    print(f"Фактично оброблено дерев:   {res.processed_trees_count:,}".replace(',', ' '))
    
    speed = res.processed_trees_count / elapsed_time if elapsed_time > 0 else 0
    print(f"Швидкість обробки:          {speed:,.0f} дерев/секунду".replace(',', ' '))
    print(f"Загальна неузгодженість:    {res.total_inconsistency:.6f}")
    
    # Виводимо рейтинг найкращих альтернатив
    print("\nРейтинг альтернатив (за геометричним усередненням):")
    results = [(i, res.weights_geom[i]) for i in range(n)]
    results.sort(key=lambda x: x[1], reverse=True)
    
    for i in range(n):
        idx, weight = results[i]
        print(f"{i+1} місце: Альтернатива {idx} -> {weight * 100:.2f}%")

if __name__ == "__main__":
    run_stress_test()