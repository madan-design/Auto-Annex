const BASE = "http://127.0.0.1:8000";

/* =====================================================
   HELPER — SAFE FETCH
===================================================== */
const safeFetch = async (url: string, options: RequestInit) => {

  const res = await fetch(url, options);

  let data: any = {};

  try {

    data = await res.json();

  }
  catch {

    data = { error: "Invalid server response" };

  }

  if (!res.ok) {

    throw new Error(

      data.error ||

      data.detail ||

      "Request failed"

    );

  }

  return data;

};


export const api = {


/* =====================================================
 GENERATE MASKS
===================================================== */

generateMasks: async (

imageFiles: File[],
xmlFiles: File[],
selectedLabel: string

)=>{

const validImages=imageFiles.filter(f=>

/\.(jpg|jpeg|png)$/i.test(f.name)

);

const validXML=xmlFiles.filter(f=>

/.xml$/i.test(f.name)

);

if(!validImages.length)
throw new Error("No valid images");

if(!validXML.length)
throw new Error("No XML");

if(!selectedLabel)
throw new Error("No label");

const form=new FormData();

validImages.forEach(f=>

form.append("image_files",f,f.name)

);

validXML.forEach(f=>

form.append("xml_files",f,f.name)

);

form.append(

"selected_label",
selectedLabel

);

return safeFetch(

`${BASE}/mask/generate_all`,

{

method:"POST",
body:form

}

);

},



/* =====================================================
 AUGMENT
===================================================== */

augmentDataset: async (

sourceFile:File,
quantity:number,
selectedLabel:string

)=>{

const form=new FormData();

form.append("source_image",sourceFile);

form.append(

"quantity",
String(quantity)

);

form.append(

"selected_label",
selectedLabel

);

return safeFetch(

`${BASE}/augment/dataset`,

{

method:"POST",
body:form

}

);

},



/* =====================================================
 TRAIN PATCHCORE (OLD — KEEP SAFE)
===================================================== */

trainModel: async (cls:string)=>{

return safeFetch(

`${BASE}/train/`,

{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

class_name:cls

})

}

);

},



/* =====================================================
 TRAIN YOLO DETECTION MODEL
===================================================== */

trainDetectionModel: async (

folders:string[],
label:string

)=>{

return safeFetch(

`${BASE}/train/detection`,

{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({

folders:folders,
label:label

})

}

);

},



/* =====================================================
 ⭐ NEW — GET TRAIN STATUS
===================================================== */

getTrainStatus: async ()=>{

return safeFetch(

`${BASE}/train/status`,

{

method:"GET"

}

);

},



/* =====================================================
 INFERENCE (PATCHCORE OLD)
===================================================== */

detectFile: async(file:File)=>{

const form=new FormData();

form.append("file",file);

return safeFetch(

`${BASE}/detect/`,

{

method:"POST",
body:form

}

);

},



/* =====================================================
 DOWNLOAD
===================================================== */

downloadAugmented:()=>{

window.open(

`${BASE}/augment/download`

);

},



/* =====================================================
 FOLDERS
===================================================== */

getAugFolders:()=>{

return safeFetch(

`${BASE}/augment/folders`,

{

method:"GET"

}

);

},



getAugImages:(folder:string)=>{

return safeFetch(

`${BASE}/augment/images/${folder}`,

{

method:"GET"

}

);

},



deleteFolder:(folder:string)=>{

return safeFetch(

`${BASE}/augment/delete/${folder}`,

{

method:"DELETE"

}

);

},



clearAllFolders:()=>{

return safeFetch(

`${BASE}/augment/delete_all`,

{

method:"DELETE"

}

);

},



/* =====================================================
⭐ GET AVAILABLE MODELS
===================================================== */

getDetectionModels:()=>{

return safeFetch(

`${BASE}/detect/models`,

{

method:"GET"

}

);

},



/* =====================================================
 RUN DETECTION ON IMAGE
===================================================== */

runDetection:async(

model:string,
file:File,
confidence:number=0.4

)=>{

const form=new FormData();
form.append("model_name",model);
form.append("file",file);
form.append("confidence",String(confidence));

return safeFetch(`${BASE}/detect/run`,{method:"POST",body:form});

},


/* =====================================================
 RUN DETECTION ON VIDEO
===================================================== */

runVideoDetection:async(

model:string,
file:File,
confidence:number=0.4

)=>{

const form=new FormData();
form.append("model_name",model);
form.append("file",file);
form.append("confidence",String(confidence));

return safeFetch(`${BASE}/detect/run_video`,{method:"POST",body:form});

},

};