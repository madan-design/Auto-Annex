import cv2
import numpy as np
import random


class PoissonBlender:

    @staticmethod
    def blend(source_img, target_img, mask, debug=False):

        if len(mask.shape) == 3:
            mask = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)

        # ensure source and target are always 3-channel BGR
        if len(source_img.shape) == 2:
            source_img = cv2.cvtColor(source_img, cv2.COLOR_GRAY2BGR)
        elif source_img.shape[2] == 4:
            source_img = cv2.cvtColor(source_img, cv2.COLOR_BGRA2BGR)

        if len(target_img.shape) == 2:
            target_img = cv2.cvtColor(target_img, cv2.COLOR_GRAY2BGR)
        elif target_img.shape[2] == 4:
            target_img = cv2.cvtColor(target_img, cv2.COLOR_BGRA2BGR)

        _, mask = cv2.threshold(
            mask,
            10,
            255,
            cv2.THRESH_BINARY
        )

        ys, xs = np.where(mask > 0)

        if len(xs) == 0:

            print("EMPTY MASK")

            # return image + no bbox
            return target_img, None

        x1, x2 = xs.min(), xs.max()
        y1, y2 = ys.min(), ys.max()

        defect = source_img[
            y1:y2,
            x1:x2
        ]

        defect_mask = mask[
            y1:y2,
            x1:x2
        ]

        if defect.size == 0:

            print("EMPTY DEFECT")

            return target_img, None

        dh, dw = defect.shape[:2]

        th, tw = target_img.shape[:2]

        if dh < 5 or dw < 5:

            print("DEFECT TOO SMALL")

            return target_img, None

        # random placement
        cx = random.randint(
            dw // 2,
            tw - dw // 2
        )

        cy = random.randint(
            dh // 2,
            th - dh // 2
        )

        # direct masked paste — no color grading, no blending
        try:
            output = target_img.copy()

            paste_y1 = cy - dh // 2
            paste_x1 = cx - dw // 2
            paste_y2 = paste_y1 + dh
            paste_x2 = paste_x1 + dw

            # clamp to target bounds
            paste_y1 = max(0, paste_y1)
            paste_x1 = max(0, paste_x1)
            paste_y2 = min(th, paste_y2)
            paste_x2 = min(tw, paste_x2)

            # matching crop on defect and mask
            src_y2 = paste_y2 - paste_y1
            src_x2 = paste_x2 - paste_x1

            defect_crop = defect[:src_y2, :src_x2]
            mask_crop   = defect_mask[:src_y2, :src_x2]

            mask_3ch = cv2.merge([mask_crop, mask_crop, mask_crop])
            mask_bool = mask_3ch > 0

            output[paste_y1:paste_y2, paste_x1:paste_x2][mask_bool] = \
                defect_crop[mask_bool]

        except Exception as e:
            print("PASTE ERROR:", e)
            return target_img, None

        diff = np.mean(

            cv2.absdiff(
                output,
                target_img
            )

        )

        print("PIXEL DIFF:", diff)

        # ============================================
        # ⭐ NEW — COMPUTE BOUNDING BOX
        # ============================================

        xmin = int(cx - dw // 2)
        ymin = int(cy - dh // 2)

        xmax = int(cx + dw // 2)
        ymax = int(cy + dh // 2)

        # clamp bounds

        xmin = max(0, xmin)
        ymin = max(0, ymin)

        xmax = min(tw - 1, xmax)
        ymax = min(th - 1, ymax)

        bbox = [

            xmin,
            ymin,
            xmax,
            ymax

        ]

        # return both

        return output, bbox