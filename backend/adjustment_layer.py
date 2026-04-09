def apply_adjustments(params_scores, learned_adjustments):
    adjusted = {}

    for param, score in params_scores.items():
        adjustment = learned_adjustments.get(param, 0)
        adjusted[param] = max(0, min(6, score + adjustment))

    return adjusted
