import torch
import torchvision.transforms as T
from PIL import Image
from app.core.patchcore_model import PatchCore

class FeatureExtractor:

    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = PatchCore().to(self.device)
        self.model.eval()

        self.transform = T.Compose([
            T.Resize((256, 256)),
            T.ToTensor(),
            T.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

    def extract(self, image_path: str):
        img = Image.open(image_path).convert("RGB")
        img_tensor = self.transform(img).unsqueeze(0).to(self.device)

        with torch.no_grad():
            features = self.model(img_tensor)

        return features.cpu().numpy().reshape(-1, features.shape[1])