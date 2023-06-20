/*
 * 2023 © MaoHuPi
 * maohupiWireworldGame/fileIO.js
 * modified from MaoHuPi - textEditor
 */
let developerMod = false;
const dropMask = $('#dropMask');

function cancelEvent(event){
    event.stopPropagation();
    event.preventDefault();
}
function dragOver(event){
    cancelEvent(event);
    dropMask.setAttribute('dragover', 'true');
}
function dragLeave(event){
    cancelEvent(event);
    dropMask.setAttribute('dragover', 'false');
}
window.fileEntry = undefined;
async function dropFile(event) {
    dropMask.setAttribute('dragover', 'false');
    var dataTransfer = event.dataTransfer;
    window.fileEntry = undefined;
    try{
        if(dataTransfer.items.length > 0){
            var item = dataTransfer.items[0];
            if(item.kind === 'file'){
				cancelEvent(event);
                let entry = await item.getAsFileSystemHandle();
                if (entry.kind === 'file') {
                    let file = await entry.getFile();
                    window.fileEntry = entry;
                    loadFile(file, 'file', file.name);
                }
            }
        }
    }
    catch(error){
        if(developerMod){
            console.error(error);
        }
        if(dataTransfer.files && dataTransfer.files.length > 0){
            cancelEvent(event);
            let file = dataTransfer.files[0];
            loadFile(file, 'file', file.name);
        }
    }
}
window.addEventListener("dragenter", dragOver, false);
window.addEventListener("dragover", dragOver, false);
window.addEventListener("dragleave", dragLeave, false);
window.addEventListener("drop", dropFile, false);

function saveFile(content, fileName = 'gameMap.json'){
    let dlLink = $e('a');
    dlLink.download = fileName;
    let errorFlag = false;
    try{
        if(window.fileEntry){
            updateLocalFile(window.fileEntry, content);
        }
        else{
            errorFlag = true;
        }
    }
    catch(error){
        if(developerMod){
            console.error(error);
        }
        errorFlag = true;
    }
    if(errorFlag){
        dlLink.href = 'data:application/json;charset=utf-8,'+encodeURIComponent(content);
        dlLink.click();
    }
    alert('File Saved!');
}
async function openFile(){
    if(window.showOpenFilePicker){
        let options = {
            types: [
                {
                    description: 'Elec Game Project',
                    accept: {
                        'application/json': ['.json', '.JSON']
                    }
                }
            ], 
            startIn: 'documents'
        };
        let [entry] = await showOpenFilePicker(options);
        if(entry){
            let file = await entry.getFile();
            window.fileEntry = entry;
            loadFile(file, 'file', file.name);
        }
    }
    else{
        let input = $e('input');
        input.type = 'file';
        input.setAttribute('description', 'Elec Game Project');
        input.setAttribute('accept', 'application/json');
        input.onchange = async (event) => {
            window.fileEntry = undefined;
    
            if(input.files && input.files.length > 0){
                let file = input.files[0], 
                    reader = new FileReader();
                reader.onloadend = () => {
                    loadFile(reader.result, 'text', file.name);
                }
                reader.readAsText(file);
            }
        }
        input.click();
    }
}
async function loadFile(jsonTextOrFile, type = 'text', fileName = 'gameMap'){
	changeProjectName(fileName);
    if(type == 'file'){
        let file = jsonTextOrFile;
        try{
            let text = await file.text();
            loadFile(text, 'text', fileName);
        }
        catch(error){
            if(developerMod){
                console.error(error);
            }
            let reader = new FileReader();
            reader.onloadend = () => {
                loadFile(reader.result, 'text', fileName);
            }
            reader.readAsText(file);
        }
    }
    else if(type == 'text'){
		importProject(jsonTextOrFile);
    }
}
async function updateLocalFile(entry, text) {
    let writable = await entry.createWritable();
    await writable.write(text);
    await writable.close();
}