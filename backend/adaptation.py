# backend/adaptation.py

import numpy as np


class AdaptiveLayer:
    def __init__(self, num_params=13, max_memory=100):
        self.num_params = num_params
        self.memory = []  # stores past cases
        self.max_memory = max_memory

    def _feature_distance(self, f1, f2):
        """
        Compute distance between two feature dicts
        """
        try:
            # Color distance (large vector)
            c1 = np.array(f1["color"])
            c2 = np.array(f2["color"])
            color_dist = np.linalg.norm(c1 - c2)

            # Shape distance
            s1 = np.array(f1["shape"])
            s2 = np.array(f2["shape"])
            shape_dist = np.linalg.norm(s1 - s2)

            # Hash similarity (Hamming distance approximation)
            hash_dist = sum(ch1 != ch2 for ch1, ch2 in zip(f1["imageHash"], f2["imageHash"]))

            # Weighted sum (tune weights if needed)
            return color_dist * 0.6 + shape_dist * 0.3 + hash_dist * 0.1

        except Exception:
            return float("inf")

    def update(self, predicted_params, corrected_params, features):
        """
        Store a feedback case
        """
        diff = corrected_params - predicted_params

        case = {
            "features": features,
            "diff": diff
        }

        self.memory.append(case)

        # limit memory size
        if len(self.memory) > self.max_memory:
            self.memory.pop(0)

    def adjust(self, predicted_params, features):
        """
        Adjust prediction based on most similar past case
        """
        if not self.memory:
            return predicted_params  # no learning yet

        # find closest case
        best_case = None
        best_dist = float("inf")

        for case in self.memory:
            dist = self._feature_distance(features, case["features"])
            if dist < best_dist:
                best_dist = dist
                best_case = case

        if best_case is None:
            return predicted_params

        # apply correction
        adjusted = predicted_params + best_case["diff"]

        # clamp values
        adjusted = np.clip(adjusted, 0.0, 6.0)

        return adjusted


# global instance
adaptive_layer = AdaptiveLayer()
