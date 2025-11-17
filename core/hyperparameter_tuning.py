import os, sys
# Automatically add project root to PYTHONPATH
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
import itertools
import copy
import yaml
from core import config as cfg
from backend import train

def override_config(base_cfg: dict, updates: dict) -> dict:
    """Return a modified copy of the config with updated parameters."""
    new_cfg = copy.deepcopy(base_cfg)
    new_cfg.update(updates)
    return new_cfg


def run_tuning():
    """
    Simple grid search for hyperparameter tuning.
    Creates temporary YAML configs, trains models, and logs results.
    """
    # === Define grid search space ===
    grid = {
        "LEARNING_RATE": [5e-4, 1e-4, 1e-3],
        "BATCH_SIZE": [16, 32],
        "WEIGHT_DECAY": [1e-4, 1e-5],
        "DROPOUT": [0.3, 0.5],
        "FREEZE_BACKBONE": [False, True],
    }

    keys = list(grid.keys())
    combos = list(itertools.product(*[grid[k] for k in keys]))
    print(f"🔍 Total trials: {len(combos)}")

    # === Iterate through each combination ===
    for idx, combo in enumerate(combos, start=1):
        updates = {k: v for k, v in zip(keys, combo)}

        # Create run-specific subfolder for organization
        run_name = f"run_{idx}"
        run_dir = os.path.join(cfg.OUTPUT_ROOT, "tuning", run_name)
        os.makedirs(run_dir, exist_ok=True)

        # Save temporary config file (optional, for reference)
        run_config_path = os.path.join(run_dir, "config.yaml")
        new_cfg = override_config(vars(cfg), updates)
        with open(run_config_path, "w") as f:
            yaml.safe_dump(new_cfg, f)

        print(f"\n🚀 Trial {idx}/{len(combos)} — {updates}")
        print(f"📁 Output folder: {run_dir}")

        # Run training with modified config
        train.main(run_config_path)

    print("\n✅ Tuning complete — check outputs/tuning/ for results.")


if __name__ == "__main__":
    run_tuning()
