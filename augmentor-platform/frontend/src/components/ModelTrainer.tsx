import React, { useState, useRef, useEffect } from "react";
import { api } from "../services/api";

import startIcon from "../assets/icons/startaug.png";
import trainIcon from "../assets/icons/train.png";

import fileIcon from "../assets/icons/file.png";
import uploadIcon from "../assets/icons/upload.png";

const BASE = "http://127.0.0.1:8000";

const ModelTrainer = () => {

const [dataFiles,setDataFiles]=useState<File[]>([]);
const [xmlFiles,setXmlFiles]=useState<File[]>([]);
const [sourceFile,setSourceFile]=useState<File|null>(null);
const [testFileObj,setTestFileObj]=useState<File|null>(null);

const [dataPath,setDataPath]=useState("");
const [xmlPath,setXmlPath]=useState("");
const [sourceImage,setSourceImage]=useState("");
const [testFile,setTestFile]=useState("");

const [labels,setLabels]=useState<string[]>([]);
const [selectedLabel,setSelectedLabel]=useState("");

const [quantity,setQuantity]=useState(50);
const [logs,setLogs]=useState<string[]>([]);
const [augImages,setAugImages]=useState<string[]>([]);
const [result,setResult]=useState<any>(null);

const [folders,setFolders]=useState<any[]>([]);
const [selectedFolder,setSelectedFolder]=useState("");

const [trainFolders,setTrainFolders]=useState<string[]>([]);
const [modelName,setModelName]=useState("my_model");
const [training,setTraining]=useState(false);
const [trainStatus,setTrainStatus]=useState("Idle");

const [previewIndex,setPreviewIndex]=useState<number|null>(null);

const logEndRef=useRef<HTMLDivElement>(null);

const dataInputRef=useRef<HTMLInputElement>(null);
const xmlInputRef=useRef<HTMLInputElement>(null);
const sourceInputRef=useRef<HTMLInputElement>(null);
const testInputRef=useRef<HTMLInputElement>(null);

const addLog=(msg:string)=>
setLogs(prev=>[...prev,msg]);

useEffect(()=>{

logEndRef.current?.scrollIntoView({behavior:"smooth"});

},[logs]);


/* ================= TRAIN STATUS POLLING ================= */

useEffect(()=>{

if(!training) return;

const id=setInterval(async()=>{

try{

const res=await api.getTrainStatus();

if(res?.status){

setTrainStatus(res.status);

if(res.status.includes("Complete")||
res.status.includes("ERROR"))

setTraining(false);

}

}catch{}

},2000);

return()=>clearInterval(id);

},[training]);


/* LOAD FOLDERS */

const loadFolders=async()=>{

try{

const res=await api.getAugFolders();

if(res?.folders){

setFolders(res.folders);

}

}catch(e:any){

addLog("❌ "+e.message);

}

};

useEffect(()=>{

loadFolders();

},[]);


/* ⭐ TRAIN SELECT TOGGLE */

const toggleTrainFolder=(folder:string)=>{

setTrainFolders(prev=>{

if(prev.includes(folder))

return prev.filter(f=>f!==folder);

return [...prev,folder];

});

};


/* DELETE ONE */

const deleteFolder=async(folder:string)=>{

if(!window.confirm(`Delete ${folder}?`))
return;

try{

await api.deleteFolder(folder);

addLog(`Deleted ${folder}`);

if(selectedFolder===folder){

setAugImages([]);
setSelectedFolder("");

}

loadFolders();

}catch(e:any){

addLog("❌ "+e.message);

}

};


/* CLEAR ALL */

const clearAllFolders=async()=>{

if(!window.confirm("Delete ALL augmentation folders ?"))
return;

try{

await api.clearAllFolders();

addLog("All folders deleted.");

setAugImages([]);
setSelectedFolder("");

loadFolders();

}catch(e:any){

addLog("❌ "+e.message);

}

};


/* OPEN */

const openFolder=async(folder:string)=>{

try{

setSelectedFolder(folder);

const res=await api.getAugImages(folder);

if(res?.images){

const urls=res.images.map(

(img:string)=>

`${BASE}/augment/output/${img}`

);

setAugImages(urls);

}

}catch(e:any){

addLog("❌ "+e.message);

}

};


/* LABEL EXTRACTION */

const extractLabels=async(files:File[])=>{

const set=new Set<string>();

for(const f of files){

if(!f.name.endsWith(".xml"))continue;

const txt=await f.text();

const matches=[...txt.matchAll(/<name>(.*?)<\/name>/g)];

matches.forEach(m=>set.add(m[1]));

}

const arr=Array.from(set);

setLabels(arr);

if(arr.length)setSelectedLabel(arr[0]);

};


/* AUGMENT */

const startAugmentation=async()=>{

try{

if(!dataFiles.length||!xmlFiles.length||!sourceFile){

addLog("❌ Please select images, XML files and source image");
return;

}

addLog("Generating masks...");

await api.generateMasks(dataFiles,xmlFiles,selectedLabel);

addLog("Masks generated successfully.");
addLog("Starting augmentation...");

const res=await api.augmentDataset(sourceFile,quantity,selectedLabel);

if(res?.augmented){

const urls=res.augmented.map(

(name:string)=>`${BASE}/augment/output/${name}`

);

setAugImages(urls);

addLog(`Augmentation completed (${urls.length} images).`);

loadFolders();

}else{

addLog("⚠ No augmented images returned");

}

}catch(err:any){

addLog("❌ "+err.message);

}

};


const trainModel=async()=>{

if(trainFolders.length===0){
addLog("❌ Select at least one folder");
return;
}

if(!modelName.trim()){
addLog("❌ Enter a model name");
return;
}

try{
addLog(`Starting YOLOv8 training → model: ${modelName}`);
setTraining(true);
await api.trainDetectionModel(trainFolders, modelName.trim());
}catch(e:any){
addLog("❌ "+e.message);
setTraining(false);
}

};


/* DETECT */

const detect=async()=>{

try{

if(!testFileObj)return;

addLog("Running detection...");

const res=await api.detectFile(testFileObj);

setResult(res);

addLog("Detection complete.");

}catch(e:any){

addLog("❌ "+e.message);

}

};


/* PREVIEW */

useEffect(()=>{

const handler=(e:KeyboardEvent)=>{

if(previewIndex===null)return;

if(e.key==="ArrowRight")

setPreviewIndex((previewIndex+1)%augImages.length);

if(e.key==="ArrowLeft")

setPreviewIndex((previewIndex-1+augImages.length)%augImages.length);

if(e.key==="Escape")

setPreviewIndex(null);

};

window.addEventListener("keydown",handler);

return()=>window.removeEventListener("keydown",handler);

},[previewIndex,augImages]);


return(

<div style={styles.page}>

<div style={styles.topPanel}>

<div style={styles.pathColumn}>

<PathRow label="Data Path:" value={dataPath} onBrowse={()=>dataInputRef.current?.click()}/>

<PathRow label="XML Folder:" value={xmlPath} onBrowse={()=>xmlInputRef.current?.click()}/>

<div style={{display:"flex",gap:8}}>

<PathRow label="Source Image:" value={sourceImage} onBrowse={()=>sourceInputRef.current?.click()}/>

<select style={styles.dropdown} value={selectedLabel} onChange={(e)=>setSelectedLabel(e.target.value)}>
{labels.map(l=><option key={l}>{l}</option>)}
</select>

<input type="number" value={quantity} onChange={(e)=>setQuantity(Number(e.target.value))} style={styles.qty}/>

</div>

<div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
<label style={{width:100}}>Model Name:</label>
<input
  value={modelName}
  onChange={e=>setModelName(e.target.value)}
  placeholder="e.g. scratch_detector"
  style={{flex:1,padding:"4px 8px",border:"1px solid #aaa",borderRadius:4}}
/>
</div>

</div>

<div style={styles.buttonRow}>

<IconBtn icon={startIcon} text="Start" onClick={startAugmentation}/>
<IconBtn icon={trainIcon} text="Train" onClick={trainModel}/>

</div>

</div>


{/* TRAIN STATUS */}

{training &&(

<div style={{
background:"#222",
color:"#fff",
padding:10,
marginTop:6
}}>

Training Status : {trainStatus}

</div>

)}


{/* TEST */}

<div style={styles.testBar}>

<div style={styles.testInputWrap}>

<img src={fileIcon} style={{width:18}}/>

<input value={testFile} readOnly style={styles.testInput} onClick={()=>testInputRef.current?.click()}/>

<img src={uploadIcon} style={{width:18}}/>

</div>

<button style={styles.detectBtn} onClick={detect}>DETECT</button>

</div>


{/* CENTER */}

<div style={styles.centerArea}>

<div style={styles.leftPanel}>

<h3>Folders:</h3>

<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>

<h4>Augmentation Runs</h4>

<button onClick={clearAllFolders}>Clear All</button>

</div>

<div style={styles.folderBox}>

{folders.map((folder:any)=>

<div key={folder.name} style={styles.folderItemWrap}>

<input

type="checkbox"

checked={trainFolders.includes(folder.name)}

onChange={()=>toggleTrainFolder(folder.name)}

/>

<div
style={{
...styles.folderItem,
background:selectedFolder===folder.name?"#b5b5ff":"#fff"
}}
onClick={()=>openFolder(folder.name)}
>

{folder.name} ({folder.count} images)

</div>

<button
style={styles.deleteBtn}
onClick={()=>deleteFolder(folder.name)}
>

Delete

</button>

</div>

)}

</div>

{result&&<pre>{JSON.stringify(result,null,2)}</pre>}

</div>


<div style={styles.rightPanel}>

<h3>Opened Folder:</h3>

<div style={styles.augContainer}>

<div style={styles.grid}>

{augImages.map((img,i)=>

<img key={i} src={img} style={styles.thumb} onClick={()=>setPreviewIndex(i)}/>

)}

</div>

</div>

</div>

</div>


{/* LOG */}

<div style={styles.logSection}>

<h3>Log</h3>

<div style={styles.logBox}>

{logs.map((l,i)=><div key={i}>{l}</div>)}

<div ref={logEndRef}></div>

</div>

</div>


{/* PREVIEW */}

{previewIndex!==null&&(

<div style={styles.modal} onClick={()=>setPreviewIndex(null)}>

<img src={augImages[previewIndex]} style={styles.previewImg} onClick={(e)=>e.stopPropagation()}/>

</div>

)}


<input ref={dataInputRef} type="file" multiple webkitdirectory="" directory="" style={{display:"none"}}
onChange={(e:any)=>{

const files=Array.from(e.target.files||[]);
setDataFiles(files);
setDataPath(`${files.length} files selected`);

}}
/>

<input ref={xmlInputRef} type="file" multiple webkitdirectory="" directory="" style={{display:"none"}}
onChange={async(e:any)=>{

const files=Array.from(e.target.files||[]);
setXmlFiles(files);
setXmlPath(`${files.length} xml files`);
await extractLabels(files);

}}
/>

<input ref={sourceInputRef} type="file" style={{display:"none"}}
onChange={(e:any)=>{

const f=e.target.files?.[0];
if(f){setSourceFile(f);setSourceImage(f.name);}

}}
/>

<input ref={testInputRef} type="file" style={{display:"none"}}
onChange={(e:any)=>{

const f=e.target.files?.[0];
if(f){setTestFileObj(f);setTestFile(f.name);}

}}
/>

</div>

);

};

export default ModelTrainer;


/* HELPERS */

const PathRow=({label,value,onBrowse}:any)=>(

<div style={{display:"flex",alignItems:"center"}}>

<label style={{width:100}}>{label}</label>

<div style={styles.pathBox}>

<img src={fileIcon} style={{width:16}}/>

<input value={value} readOnly style={styles.pathInput}/>

<img src={uploadIcon} style={{width:16,cursor:"pointer"}} onClick={onBrowse}/>

</div>

</div>

);

const IconBtn=({icon,text,onClick}:any)=>(

<button style={styles.iconBtn} onClick={onClick}>

<img src={icon} style={{width:26}}/>
<span>{text}</span>

</button>

);

const styles:any={

page:{padding:12,background:"#d9d9dd"},

topPanel:{display:"flex",background:"#cbc8f0",padding:12},

pathColumn:{flex:1,display:"flex",flexDirection:"column",gap:10},

pathBox:{display:"flex",background:"white",flex:1,padding:4},

pathInput:{border:"none",flex:1},

buttonRow:{display:"flex",gap:8,alignItems:"center"},

iconBtn:{width:90,height:70,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},

dropdown:{width:120},

qty:{width:70},

testBar:{display:"flex",background:"#2f3fe0",padding:8},

testInputWrap:{display:"flex",flex:1,background:"white"},

testInput:{flex:1,border:"none"},

detectBtn:{width:220,background:"red",color:"white"},

centerArea:{display:"flex",marginTop:10,gap:20},

leftPanel:{flex:1},

rightPanel:{flex:1},

folderBox:{height:220,overflowY:"auto",background:"#ececec",padding:6},

folderItemWrap:{display:"flex",gap:6,marginBottom:4,alignItems:"center"},

folderItem:{padding:6,cursor:"pointer",borderRadius:4,flex:1},

deleteBtn:{background:"red",color:"white",border:"none",cursor:"pointer",borderRadius:4,padding:"4px 8px"},

augContainer:{height:420,overflowY:"auto",background:"#cfcfd3",padding:8},

grid:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8},

thumb:{width:"100%",cursor:"pointer",borderRadius:4},

logSection:{marginTop:20},

logBox:{background:"#eee",padding:10,height:200,overflowY:"auto"},

modal:{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999},

previewImg:{maxWidth:"90vw",maxHeight:"90vh"}

};