import os
import torch
import cv2

from effdet import create_model


MODEL_DIR = "models"
OUTPUT_DIR = "detect_results"

os.makedirs(OUTPUT_DIR,exist_ok=True)


class EfficientDetInference:


    def __init__(self,model_name):

        self.device="cuda" if torch.cuda.is_available() else "cpu"


        model_path=os.path.join(

            MODEL_DIR,
            model_name

        )


        self.model=create_model(

            "tf_efficientdet_d0",
            bench_task="predict",
            num_classes=1

        )


        self.model.load_state_dict(

            torch.load(

                model_path,

                map_location=self.device

            )

        )


        self.model.to(self.device)

        self.model.eval()



    def detect(self,image_path):

        img=cv2.imread(image_path)

        h,w=img.shape[:2]


        resized=cv2.resize(

            img,

            (512,512)

        )


        tensor=torch.from_numpy(

            resized.transpose(2,0,1)

        ).float().unsqueeze(0)/255.


        tensor=tensor.to(self.device)


        with torch.no_grad():

            output=self.model(tensor)



        # prediction format
        boxes=output[0]["boxes"].cpu().numpy()
        scores=output[0]["scores"].cpu().numpy()


        for box,score in zip(boxes,scores):

            if score<0.4:

                continue


            x1,y1,x2,y2=box.astype(int)


            cv2.rectangle(

                img,

                (x1,y1),

                (x2,y2),

                (0,255,0),

                3

            )


        out_path=os.path.join(

            OUTPUT_DIR,

            os.path.basename(image_path)

        )


        cv2.imwrite(out_path,img)


        return "/detect/results/"+os.path.basename(image_path)