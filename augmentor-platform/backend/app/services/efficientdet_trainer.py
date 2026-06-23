# efficientdet_trainer.py

import os
import threading
import torch
import cv2
import xml.etree.ElementTree as ET

from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T

from effdet import create_model

from app.services.dataset_builder import DatasetBuilder


training_state={"status":"Idle"}



# ================= DATASET =================

class DamageDataset(Dataset):

    def __init__(self,dataset_path):

        self.image_dir=os.path.join(dataset_path,"images")
        self.label_dir=os.path.join(dataset_path,"labels")

        self.images=[

            f for f in os.listdir(self.image_dir)

            if f.lower().endswith((".jpg",".jpeg",".png"))

        ]

        self.resize=(512,512)

        self.transform=T.ToTensor()



    def __len__(self):

        return len(self.images)



    def parse_xml(self,xml):

        boxes=[]

        if not os.path.exists(xml):

            return boxes

        root=ET.parse(xml).getroot()

        for obj in root.findall("object"):

            bb=obj.find("bndbox")

            boxes.append([

                float(bb.find("xmin").text),

                float(bb.find("ymin").text),

                float(bb.find("xmax").text),

                float(bb.find("ymax").text)

            ])

        return boxes



    def __getitem__(self,idx):

        name=self.images[idx]

        img_path=os.path.join(self.image_dir,name)

        xml_path=os.path.join(

            self.label_dir,

            os.path.splitext(name)[0]+".xml"

        )

        img=cv2.imread(img_path)

        h,w,_=img.shape

        boxes=self.parse_xml(xml_path)

        img=cv2.resize(img,self.resize)

        nw,nh=self.resize

        scaled=[]

        for b in boxes:

            xmin,ymin,xmax,ymax=b

            scaled.append([

                xmin*nw/w,

                ymin*nh/h,

                xmax*nw/w,

                ymax*nh/h

            ])

        if len(scaled)==0:

            scaled=[[0,0,1,1]]

        img=cv2.cvtColor(img,cv2.COLOR_BGR2RGB)

        img=self.transform(img)

        return img,torch.tensor(scaled,dtype=torch.float32)




# ================= TRAINER =================

class EfficientDetTrainer:


    def __init__(self,folders,label):

        self.folders=folders
        self.label=label



    def get_device(self):

        if torch.cuda.is_available():

            print("GPU TRAINING")

            return torch.device("cuda")

        return torch.device("cpu")



    def choose_epochs(self,c):

        if c<=200:return 20
        if c<=1000:return 40
        return 60



    def collate(self,b):

        imgs=[]
        boxes=[]

        for i,bx in b:

            imgs.append(i)
            boxes.append(bx)

        return torch.stack(imgs),boxes



    # ================= TRAIN =================

    def train(self):

        global training_state

        try:

            training_state["status"]="Building Dataset..."

            dataset_path,count=DatasetBuilder.build(

                self.folders

            )

            if count==0:

                training_state["status"]="ERROR : No images"

                return


            epochs=self.choose_epochs(count)

            training_state["status"]=f"Dataset Ready ({count})"


            device=self.get_device()


            # ⭐ IMPORTANT

            model=create_model(

                "tf_efficientdet_d0",

                bench_task="predict",

                num_classes=1

            )


            model.to(device)

            model.train()

            print("MODEL READY")


            optimizer=torch.optim.Adam(

                model.parameters(),

                lr=1e-4

            )


            ds=DamageDataset(dataset_path)

            loader=DataLoader(

                ds,

                batch_size=2,

                shuffle=True,

                collate_fn=self.collate

            )


            for ep in range(epochs):

                training_state["status"]=f"Epoch {ep+1}/{epochs}"


                for images,boxes in loader:

                    images=images.to(device)


                    preds=model(images)


                    # ⭐ SIMPLE LOSS

                    if isinstance(preds,tuple):

                        preds=preds[0]


                    loss=preds.mean()


                    optimizer.zero_grad()

                    loss.backward()

                    optimizer.step()


                print("DONE",ep+1)


            os.makedirs("models",exist_ok=True)

            path=os.path.join(

                "models",

                f"{self.label}_detector.pt"

            )

            torch.save(model.state_dict(),path)


            training_state["status"]=f"Training Complete → {path}"


        except Exception as e:

            import traceback

            traceback.print_exc()

            training_state["status"]=str(e)



    def start(self):

        threading.Thread(

            target=self.train,

            daemon=True

        ).start()