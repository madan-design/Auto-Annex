import torch
import torch.nn as nn
import torchvision.models as models

class PatchCore(nn.Module):

    def __init__(self):
        super().__init__()
        backbone = models.resnet50(weights="DEFAULT")
        self.feature_extractor = nn.Sequential(*list(backbone.children())[:-2])

    def forward(self, x):
        return self.feature_extractor(x)