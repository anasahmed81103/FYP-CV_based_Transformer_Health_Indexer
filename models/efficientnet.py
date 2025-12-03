import torch
import torch.nn as nn
import torchvision.models as models
from core.config import PRETRAINED, DROPOUT, FREEZE_BACKBONE

class EfficientNet13(nn.Module):
    def __init__(self, model_name="efficientnet_b0"):
        """
        EfficientNet backbone for multi-output regression of 13 parameters (0-6 range)
        """
        super().__init__()

        # ---- Pretrained EfficientNet backbone ----
        pretrained_weights = {
            "efficientnet_b0": models.EfficientNet_B0_Weights.IMAGENET1K_V1,
            "efficientnet_b1": models.EfficientNet_B1_Weights.IMAGENET1K_V1,
            "efficientnet_b2": models.EfficientNet_B2_Weights.IMAGENET1K_V1,
            "efficientnet_b3": models.EfficientNet_B3_Weights.IMAGENET1K_V1,
        }

        if PRETRAINED:
            weights = pretrained_weights.get(model_name, None)
            self.cnn = getattr(models, model_name)(weights=weights)
        else:
            self.cnn = getattr(models, model_name)(weights=None)

        # Freeze backbone if needed
        if FREEZE_BACKBONE:
            for param in self.cnn.features.parameters():
                param.requires_grad = False

        # Remove original classifier
        in_features = self.cnn.classifier[1].in_features
        self.cnn.classifier = nn.Identity()

        # Regression head for 13 outputs
        self.fc = nn.Sequential(
            nn.Dropout(DROPOUT),
            nn.Linear(in_features, 13)  # 13 regression outputs, raw 0–6 values
            # Remove nn.Sigmoid()
        )

    def forward(self, x):
        x = self.cnn(x)
        x = self.fc(x)
        return x


# -----------------------------------------------------------
# Helper for train.py
# -----------------------------------------------------------
def build_efficientnet(model_name="efficientnet_b0"):
    return EfficientNet13(model_name=model_name)
