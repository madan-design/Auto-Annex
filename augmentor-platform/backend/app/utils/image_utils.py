import cv2
import numpy as np

class ImageUtils:

    @staticmethod
    def draw_boxes(image_path, boxes, output_path):
        image = cv2.imread(image_path)

        for box in boxes:
            x1, y1, x2, y2 = box["bbox"]
            label = box["label"]

            cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(
                image,
                label,
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 0),
                2
            )

        cv2.imwrite(output_path, image)
        return output_path

    @staticmethod
    def resize_image(image_path, size=(512, 512)):
        image = cv2.imread(image_path)
        resized = cv2.resize(image, size)
        return resized