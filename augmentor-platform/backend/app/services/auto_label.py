import shutil
import os

class AutoLabelService:

    @staticmethod
    def copy_annotation(original_xml, new_xml):
        shutil.copyfile(original_xml, new_xml)