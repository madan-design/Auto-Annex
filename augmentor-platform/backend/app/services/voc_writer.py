import os
import xml.etree.ElementTree as ET


class VOCWriter:

    @staticmethod
    def save_xml(

        save_path,
        image_name,
        width,
        height,
        label,
        bbox

    ):

        xmin, ymin, xmax, ymax = bbox

        annotation = ET.Element("annotation")

        ET.SubElement(
            annotation,
            "filename"
        ).text = image_name

        size = ET.SubElement(
            annotation,
            "size"
        )

        ET.SubElement(size, "width").text = str(width)
        ET.SubElement(size, "height").text = str(height)
        ET.SubElement(size, "depth").text = "3"

        obj = ET.SubElement(
            annotation,
            "object"
        )

        ET.SubElement(
            obj,
            "name"
        ).text = label

        bbox_xml = ET.SubElement(
            obj,
            "bndbox"
        )

        ET.SubElement(
            bbox_xml,
            "xmin"
        ).text = str(xmin)

        ET.SubElement(
            bbox_xml,
            "ymin"
        ).text = str(ymin)

        ET.SubElement(
            bbox_xml,
            "xmax"
        ).text = str(xmax)

        ET.SubElement(
            bbox_xml,
            "ymax"
        ).text = str(ymax)

        tree = ET.ElementTree(annotation)

        tree.write(save_path)