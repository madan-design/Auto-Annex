import os
import shutil
from pathlib import Path


class DatasetBuilder:


    BASE_DIR = Path(__file__).resolve().parents[2]

    OUTPUT_ROOT = BASE_DIR / "augmented_output"

    TRAIN_DATASET = BASE_DIR / "training_dataset"



    @staticmethod
    def build(selected_folders:list):

        """
        Combine selected augmentation folders into
        single training dataset.

        Returns:

        dataset_path,
        image_count
        """

        dataset_path = Path(

            DatasetBuilder.TRAIN_DATASET

        )


        # ===========================
        # RESET OLD DATASET
        # ===========================

        if dataset_path.exists():

            shutil.rmtree(dataset_path)


        images_dir = dataset_path / "images"
        labels_dir = dataset_path / "labels"

        images_dir.mkdir(

            parents=True,
            exist_ok=True

        )

        labels_dir.mkdir(

            parents=True,
            exist_ok=True

        )


        total_images = 0


        # ===========================
        # COPY SELECTED FOLDERS
        # ===========================

        for folder in selected_folders:

            folder_path = (

                DatasetBuilder.OUTPUT_ROOT

                / folder

            )


            print("CHECK PATH:", folder_path)


            if not folder_path.exists():

                print("Missing Folder:",folder)

                continue


            print("ADDING FOLDER:",folder)


            # ⭐ NEW IMAGE DIRECTORY
            image_source_dir = folder_path / "images"

            if not image_source_dir.exists():

                print(

                    "Images folder missing:",
                    image_source_dir

                )

                continue


            # ======================
            # COPY IMAGES
            # ======================

            for file in os.listdir(image_source_dir):

                if not file.lower().endswith(

                    (".jpg",".jpeg",".png")

                ):

                    continue


                src_image = image_source_dir / file


                if not src_image.exists():

                    print("IMAGE NOT FOUND:",src_image)

                    continue


                dst_image = images_dir / (

                    folder + "_" + file

                )


                shutil.copy(

                    src_image,
                    dst_image

                )


                # =======================
                # XML LABEL
                # =======================

                xml_name = file.replace(

                    ".jpg",".xml"

                ).replace(

                    ".jpeg",".xml"

                ).replace(

                    ".png",".xml"

                )


                src_xml = (

                    folder_path

                    / "labels"

                    / xml_name

                )


                if src_xml.exists():

                    dst_xml = labels_dir / (

                        folder + "_" + xml_name

                    )

                    shutil.copy(

                        src_xml,
                        dst_xml

                    )

                    total_images += 1

                else:

                    print(

                        "XML NOT FOUND:",
                        src_xml

                    )


        print(

            "TOTAL TRAIN IMAGES:",
            total_images

        )

        print(

            "OUTPUT ROOT:",
            DatasetBuilder.OUTPUT_ROOT

        )


        return (

            str(dataset_path),
            total_images

        )