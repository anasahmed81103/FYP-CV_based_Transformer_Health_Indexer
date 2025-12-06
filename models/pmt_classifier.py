import torch
import torch.nn as nn
import torchvision.models as models

# import config flags
from core.config import PRETRAINED, DROPOUT, FREEZE_BACKBONE, MODEL_NAME


class EfficientNetClassifier(nn.Module):
    """
    EfficientNet-based binary classifier for PMT vs Non-PMT.

    Example:
        model = EfficientNetClassifier(model_name="efficientnet_b0_classifier_model")
        OR use default MODEL_NAME from config.py
    """

    def __init__(self, model_name: str = None, num_classes: int = 2):
        super().__init__()

        # Use passed model name OR fallback to config
        model_name = model_name or MODEL_NAME

        # Remove classifier suffix: efficientnet_b0_classifier_model → efficientnet_b0
        base = model_name.replace("_classifier_model", "")

        # Pretrained weight sets
        pretrained_weights = {
            "efficientnet_b0": models.EfficientNet_B0_Weights.IMAGENET1K_V1,
            "efficientnet_b1": models.EfficientNet_B1_Weights.IMAGENET1K_V1,
            "efficientnet_b2": models.EfficientNet_B2_Weights.IMAGENET1K_V1,
            "efficientnet_b3": models.EfficientNet_B3_Weights.IMAGENET1K_V1,
        }

        # Load backbone with or without pretrained weights
        weights = pretrained_weights.get(base) if PRETRAINED else None

        try:
            self.cnn = getattr(models, base)(weights=weights)
        except Exception as e:
            raise ValueError(f"Backbone '{base}' not found in torchvision: {e}")

        # Freeze feature extractor if required
        if FREEZE_BACKBONE:
            if hasattr(self.cnn, "features"):
                for p in self.cnn.features.parameters():
                    p.requires_grad = False
            else:
                for p in self.cnn.parameters():
                    p.requires_grad = False

        # Extract in_features from original EfficientNet classifier
        clf = self.cnn.classifier
        if isinstance(clf, nn.Sequential) and len(clf) >= 2:
            in_features = clf[1].in_features
        elif isinstance(clf, nn.Linear):
            in_features = clf.in_features
        else:
            # fallback: find last linear layer
            in_features = None
            for m in reversed(list(clf.modules())):
                if isinstance(m, nn.Linear):
                    in_features = m.in_features
                    break

        if in_features is None:
            raise RuntimeError("Could not determine in_features in EfficientNet classifier.")

        # Replace EfficientNet classifier with Identity
        self.cnn.classifier = nn.Identity()

        # New classifier head (binary => 2 logits)
        self.fc = nn.Sequential(
            nn.Dropout(DROPOUT),
            nn.Linear(in_features, num_classes)
        )

    def forward(self, x):
        x = self.cnn(x)
        x = self.fc(x)
        return x


# Helper builder
def build_pmt_classifier(model_name: str = None, num_classes: int = 2) -> EfficientNetClassifier:
    return EfficientNetClassifier(model_name=model_name, num_classes=num_classes)


if __name__ == "__main__":
    m = build_pmt_classifier()
    x = torch.randn(1, 3, 224, 224)
    out = m(x)
    print("Model OK. Output:", out.shape)
