/*
 * 2023 © MaoHuPi
 * maohupiWireworldGame/main.js
 */

/*
 * TODO
 */

{
	// basic
	const view = $('#view'), 
	viewCtx = view.getContext('2d');

	const contextmenu = $('#contextmenu');

	// settings
	let flagRun = false;
	const edit = {
		cellType: 0, 
		downCellType: 0, 
		editMode: 'draw', 
		playSpeed: 10, 
		projectName: 'gameMap'
	}
	const mouse = {
		x: 0, 
		y: 0, 
		downX: 0, 
		downY: 0, 
		flagTranslate: false, 
		flagDraw: false, 
		flagSelect: false, 
		flagMove: false, 
		focusRect: undefined
	}
	const cellColor = {
		0: '#FFC107', // y
		1: '#2196F3', // b
		2: '#F44336' // r
	}
	let map = {};
	let nameData = {};
	const transform = {
		scaleZ: 10, 
		translateX: 0, 
		translateY: 0, 
		downTranslateX: 0, 
		downTranslateY: 0
	}
	const lines = {
		color: '#ffffff22', 
		visible: true, 
		width: 2
	}
	let backupList = [];
	let backupIndex = 0;
	function backup(){
		backupList.splice(backupIndex, backupList.length - backupIndex);
		backupList.push(deepCopy({
			map: map, 
			nameData: nameData, 
			selectRect: selectRect.dump(), 
			componentRect: componentRect.dump(), 
		}));
		backupIndex = backupList.length;
	}
	function undo(){
		if(backupIndex > 0){
			if(backupIndex == backupList.length){
				backup();
				backupIndex--;
			}
			playStatusChange(false);
			backupIndex--;
			map = backupList[backupIndex].map;
			nameData = backupList[backupIndex].nameData;
			selectRect.load(backupList[backupIndex].selectRect);
			componentRect.load(backupList[backupIndex].componentRect);
		}
		else alert('Can\'t undo to previous step!');
	}
	function redo(){
		if(backupList.length > backupIndex+1){
			playStatusChange(false);
			backupIndex++;
			map = backupList[backupIndex].map;
			nameData = backupList[backupIndex].nameData;
			Object.entries(backupList[backupIndex].selectRect).forEach(pair => selectRect[pair[0]] = pair[1]);
			Object.entries(backupList[backupIndex].componentRect).forEach(pair => componentRect[pair[0]] = pair[1]);
		}
		else alert('Can\'t redo to next step!');
	}
	function clearBackup(){
		backupList = [];
		backupIndex = 0;
	}

	// range
	class RangeData{
		constructor(settings){
			var defaultSettings = {
				map: {}, 
				nameData: {}, 
				x: 0, 
				y: 0, 
				endX: 0, 
				endY: 0
			};
			settings = {...defaultSettings, ...settings};
			for(let key in defaultSettings){
				this[key] = settings[key];
			}
		}
	}

	// rect
	class RectElement{
		constructor(settings){
			var defaultSettings = {
				x: 0, 
				y: 0, 
				endX: 1, 
				endY: 1, 
				downX: 1, 
				downY: 1, 
				oriX: 1, 
				oriY: 1, 
				visible: false, 
				fillColor: '#8bc34a55', 
				strokeColor: '#4CAF50', 
				contextmenuData: {}, 
				mapValue: {}
			};
			settings = {...defaultSettings, ...settings};
			for(let key in defaultSettings){
				this[key] = settings[key];
			}
		}
		static getRectMap(rect){
			let rectMap = {};
			for(let cell in map){
				let pos = parsePos(cell);
				if(
					pos[0] >= rect[0] && pos[0] < rect[2] && 
					pos[1] >= rect[1] && pos[1] < rect[3]
				){
					rectMap[cell] = map[cell];
					continue;
				}
			}
			return(rectMap);
		}
		getOriRect(){
			return([
				this.oriX, 
				this.oriY, 
				this.endX - this.x + this.oriX, 
				this.endY - this.y + this.oriY
			]);
		}
		setData(rangeData){
			this.mapValue = rangeData.map;
			[this.x, this.y, this.endX, this.endY] = [rangeData.x, rangeData.y, rangeData.endX, rangeData.endY];
			[this.oriX, this.oriY] = [this.x, this.y];
		}
		getRangeData(){
			var oriRect = this.getOriRect();
			return(new RangeData(this.visible ? {
				map: this.mapValue, 
				x: oriRect[0], 
				y: oriRect[1], 
				endX: oriRect[2], 
				endY: oriRect[3]
			} : {}));
		}
		getDrawFunction(){
			if(this.visible){
				let posStart = posMap2View([this.x, this.y]);
				let posEnd = posMap2View([this.endX, this.endY]);
				let rect = [...posStart, posEnd[0] - posStart[0] - lines.width, posEnd[1] - posStart[1] - lines.width];
				return([
					() => {
						viewCtx.fillStyle = this.fillColor;
						viewCtx.fillRect(...rect);
					}, 
					() => {
						viewCtx.strokeStyle = this.strokeColor;
						viewCtx.lineWidth = lines.width;
						viewCtx.strokeRect(rect[0] - lines.width/2, rect[1] - lines.width/2, rect[2] + lines.width, rect[3] + lines.width);
						viewCtx.fillStyle = this.strokeColor;
						viewCtx.font = '20px Zpix';
						viewCtx.fillText(
							`${Math.abs(this.endX-this.x)}, ${Math.abs(this.endY-this.y)}`, 
							Math.min(rect[0], rect[0] + rect[2]), 
							Math.min(rect[1], rect[1] + rect[3]) - 10 - lines.width
						);
					}
				]);
			}
			return([() => {}, () => {}]);
		}
		drawCells(){
			if(this.visible){
				let rectMap = this.getRangeData().map;
				for(let cell in rectMap){
					let pos = parsePos(cell);
					pos[0] += -this.oriX + this.x;
					pos[1] += -this.oriY + this.y;
					pos = posMap2View(pos);
					if(
						pos[0]+transform.scaleZ > 0 && pos[0] < view.width && 
						pos[1]+transform.scaleZ > 0 && pos[1] < view.height
					){
						viewCtx.fillStyle = cellColor[rectMap[cell]];
						viewCtx.fillRect(
							...pos, 
							1*transform.scaleZ, 
							1*transform.scaleZ
						);
					}
				}
			}
		}
		move(){
			let posMouseNow = posView2Map([mouse.x, mouse.y]);
			let posMouseDown = posView2Map([mouse.downX, mouse.downY]);
			[this.endX, this.endY] = [this.endX - this.x, this.endY - this.y];
			[this.x, this.y] = [this.downX + posMouseNow[0] - posMouseDown[0], this.downY + posMouseNow[1] - posMouseDown[1]];
			[this.endX, this.endY] = [this.endX + this.x, this.endY + this.y];
		}
		moveDone(){
			let tempMap = {};
			let rectMap = this.getRangeData().map;
			for(let cell in rectMap){
				let pos = parsePos(cell);
				pos[0] += -this.oriX + this.x;
				pos[1] += -this.oriY + this.y;
				let value = rectMap[cell];
				tempMap[`${pos[0]},${pos[1]}`] = value;
			}
			map = {...map, ...tempMap};
		}
		resetRect(){
			['x', 'y', 'endX', 'endY', 'downX', 'downY', 'oriX', 'oriY'].forEach(attr => {
				this[attr] = 0;
			});
		}
		regularizeRect(){
			let xRange = [this.x, this.endX].sort((a, b) => a - b);
			let yRange = [this.y, this.endY].sort((a, b) => a - b);
			[this.x, this.y, this.endX, this.endY] = [xRange[0], yRange[0], xRange[1], yRange[1]];
		}
		selectDone(){
			this.mapValue = RectElement.getRectMap(this.getOriRect());
			for(let cell in this.mapValue){
				delete map[cell];
			}
		}
		yellowAll(){
			for(let cell in this.mapValue){
				this.mapValue[cell] = 0;
			}
		}
		clearRect(){
			for(let cell in this.mapValue){
				delete this.mapValue[cell];
			}
		}
		static dumpKeys = ['oriX', 'oriY', 'downX', 'downY', 'x', 'y', 'endX', 'endY', 'mapValue', 'visible'];
		dump(){
			return(Object.fromEntries(RectElement.dumpKeys.map(key => [key, this[key]])));
		}
		load(settings){
			RectElement.dumpKeys.map(key => {
				this[key] = settings[key];
			});
		}
	}
	const selectRect = new RectElement({
		fillColor: '#8bc34a55', 
		strokeColor: '#4CAF50', 
		contextmenuData: {
			yellowAll: ['Make selection yellow', () => {selectRect.yellowAll();}], 
			exportImage: ['Export selection to image', () => {exportImage(selectRect.getRangeData(), false);}], 
			nameSelection: ['Name selection', () => {nameRect([selectRect.x, selectRect.y, selectRect.endX, selectRect.endY])}], 
			cancelSelection: ['Cancel selection', cancelSelection]
		}
	});
	const componentRect = new RectElement({
		fillColor: '#ffc10755', 
		strokeColor: '#ff9800', 
		contextmenuData: {
			yellowAll: ['Make component yellow', () => {componentRect.yellowAll();}], 
			cancelSelection: ['Drop component here', cancelSelection]
		}
	});

	// control function
	function playStatusChange(targetValue){
		if(targetValue) backup();
		flagRun = targetValue;
		playButton.setAttribute('status', flagRun ? 'play' : 'pause');
	}
	function lineVisibilityChange(){
		lines.visible = !lines.visible;
		lineVisibilityButton.innerText = lines.visible ? 'visible' : 'hidden';
	}
	let flagEditModeUpdate = false;
	function changeEditMode(mode){
		if(edit.editMode !== mode){
			edit.editMode = mode;
			view.setAttribute('info', 
				view.getAttribute('info-template')?.replace('{editMode}', mode)
			);
			flagEditModeUpdate = true;
		}
	}
	view.addEventListener('mousemove', () => {
		if(flagEditModeUpdate){
			flagEditModeUpdate = false;
			hoverInfoBox.innerHTML = view.getAttribute('info') || '';
		}
	});
	function changeProjectName(newName){
		newName = newName.replaceAll('.json', '');
		edit.projectName = newName;
		projectNameInput.value = newName;
	}

	// interface default value
	changeEditMode(edit.editMode);
	playSpeedInput.value = edit.playSpeed;
	playStatusChange(false);
	lineWidthInput.value = lines.width;
	lineVisibilityButton.innerText = lines.visible ? 'visible' : 'hidden';
	projectNameInput.value = edit.projectName;

	// game
	function gameUpdate(){
		let newMap = {};
		if(flagRun & edit.playSpeed > 0){
			let R = 1;
			for(let cell in map){
				let pos = cell.split(',');
				if(map[cell] == 1) newMap[cell] = 2;
				else if(map[cell] == 2) newMap[cell] = 0;
				else if(map[cell] == 0){
					let bCount = 0;
					for(let rd = -R; rd < R+1; rd++){
						for(let cd = -R; cd < R+1; cd++){
							if(!(rd === 0 && cd === 0)){
								let neighbor = map[`${parseInt(pos[0]) + rd},${parseInt(pos[1]) + cd}`];
								if(neighbor == 1) bCount ++;
							}
						}
					}
					if(bCount == 1 || bCount == 2) newMap[cell] = 1;
					else newMap[cell] = 0;
				}
			}
			map = newMap;
			setTimeout(gameUpdate, 1e3/edit.playSpeed);
		}
		else{
			setTimeout(gameUpdate, 30);
		}
	}
	gameUpdate();

	// view
	function posView2Map(pos){
		const scaleZ = transform.scaleZ + lines.width;
		pos = pos.map(n => parseInt(n));
		pos = [(pos[0] - transform.translateX)/scaleZ, (pos[1] - transform.translateY)/scaleZ];
		pos = pos.map(n => Math.floor(n));
		return pos;
	}
	function posMap2View(pos){
		const scaleZ = transform.scaleZ + lines.width;
		pos = pos.map(n => parseInt(n));
		var pos = [
			lines.width + pos[0]*scaleZ + transform.translateX, 
			lines.width + pos[1]*scaleZ + transform.translateY
		]
		return pos;
	}
	function parsePos(cellPosText){
		return(cellPosText.split(',').map(n => parseInt(n)));
	}
	function drawLines(){
		if(lines.visible){
			viewCtx.fillStyle = lines.color;
			const scaleZ = transform.scaleZ + lines.width;
			for(let ri = 0; ri <= view.height/scaleZ+1; ri++){
				viewCtx.fillRect(0, ri*scaleZ + transform.translateY%scaleZ, view.width, lines.width);
			}
			for(let ci = 0; ci <= view.width/scaleZ+1; ci++){
				viewCtx.fillRect(ci*scaleZ + transform.translateX%scaleZ, 0, lines.width, view.height);
			}
		}
	}
	function cancelSelection(){
		mouse.focusRect.moveDone();
		mouse.focusRect.visible = false;
		mouse.focusRect.resetRect();
	}
	function drawCells(){
		for(let cell in map){
			let pos = parsePos(cell);
			pos = posMap2View(pos);
			if(
				pos[0]+transform.scaleZ > 0 && pos[0] < view.width && 
				pos[1]+transform.scaleZ > 0 && pos[1] < view.height
			){
				viewCtx.fillStyle = cellColor[map[cell]];
				viewCtx.fillRect(
					...pos, 
					1*transform.scaleZ, 
					1*transform.scaleZ
				);
			}
		}
		if(selectRect.visible && !mouse.flagSelect) selectRect.drawCells();
		if(componentRect.visible) componentRect.drawCells();
	}
	function drawComponent(){}
	function getNamedRectsDrawFunction(){
		let drawList = [];
		for(let range in nameData){
			let pos = parsePos(range);
			pos = pos.map(n => parseInt(n));
			var posStart = posMap2View([pos[0], pos[1]]);
			var posEnd = posMap2View([pos[2], pos[3]]);
			if(
				posStart[0] - lines.width <= view.width && 
				posStart[1] - lines.width <= view.height && 
				posEnd[0] >= 0 && 
				posEnd[1] >= 0
			){
				let rect = [...posStart, posEnd[0] - posStart[0] - lines.width, posEnd[1] - posStart[1] - lines.width];
				drawList.push([range, rect]);
			}
		}
		return([
			() => {
				viewCtx.fillStyle = '#9e9e9e55';
				for(let [range, rect] of drawList){
					viewCtx.fillRect(...rect);
				}
			}, 
			() => {
				viewCtx.strokeStyle = '#ffffff';
				viewCtx.lineWidth = lines.width;
				viewCtx.fillStyle = '#ffffff';
				viewCtx.font = '20px Zpix';
				for(let [range, rect] of drawList){
					viewCtx.strokeRect(rect[0] - lines.width/2, rect[1] - lines.width/2, rect[2] + lines.width, rect[3] + lines.width);
					viewCtx.fillText(
						nameData[range], 
						Math.min(rect[0], rect[0] + rect[2]), 
						Math.min(rect[1], rect[1] + rect[3]) - 10 - lines.width
					);
				}
			}
		]);
	}
	function viewUpdate(){
		view.width = view.offsetWidth;
		view.height = view.offsetHeight;
		var [namedRectFront, namedRectBack] = getNamedRectsDrawFunction();
		var [selectRectFront, selectRectBack] = selectRect.getDrawFunction();
		var [componentRectFront, componentRectBack] = componentRect.getDrawFunction();
		drawLines();
		drawCells();
		namedRectBack();
		namedRectFront();
		selectRectBack();
		selectRectFront();
		componentRectBack();
		componentRectFront();
		setTimeout(viewUpdate, 30);
	}
	viewUpdate();

	// edit
	function translate(){
		[transform.translateX, transform.translateY] = [transform.downTranslateX + mouse.x - mouse.downX, transform.downTranslateY + mouse.y - mouse.downY];
	}
	function draw(){
		let pos = posView2Map([mouse.x, mouse.y]);
		// let xRange = [selectRect.x, selectRect.endX].sort((a, b) => a - b);
		// let yRange = [selectRect.y, selectRect.endY].sort((a, b) => a - b);
		// if(pos[0] > xRange[0] && pos[0] < xRange[1] && pos[1] > yRange[0] && pos[1] < yRange[1]){
		// 	mouse.x
		// 	mouse.y
		// }
		// else{
			if(edit.cellType == -1){
				delete map[`${pos[0]},${pos[1]}`];
			}
			else{
				map[`${pos[0]},${pos[1]}`] = edit.cellType;
			}
		// }
	}
	function select(){
		[selectRect.endX, selectRect.endY] = posView2Map([mouse.x, mouse.y]);
		[selectRect.x, selectRect.y] = [selectRect.downX, selectRect.downY];
		if(selectRect.endX - selectRect.x >= 0) selectRect.endX += 1;
		else selectRect.x = selectRect.downX+1;
		if(selectRect.endY - selectRect.y >= 0) selectRect.endY += 1;
		else selectRect.y = selectRect.downY+1;
	}
	function centered(processFunc, centerPos = [view.width/2, view.height/2]){
		var centerPosMap = posView2Map(centerPos);
		processFunc();
		var newCenterPos = posMap2View(centerPosMap);
		transform.translateX += (centerPos[0] - newCenterPos[0]);
		transform.translateY += (centerPos[1] - newCenterPos[1]);
	}
	function scale(rate, centerPos = [view.width/2, view.height/2]){
		centered(() => {
			transform.scaleZ += rate;
			transform.scaleZ = Math.max(1, Math.min(transform.scaleZ, 100));
		}, centerPos);
	}

	// event listener
	window.addEventListener('mousemove', event => {
		[mouse.x, mouse.y] = [event.pageX - view.offsetLeft, event.pageY - view.offsetTop];
		if(event.button === 0 || event.button === 2){
			if(mouse.flagTranslate) translate();
			else if(mouse.flagDraw) draw();
			else if(mouse.flagSelect) select();
			else if(mouse.flagMove) mouse.focusRect.move();
		}
	});
	view.addEventListener('mousedown', event => {
		contextmenuHide();
		[mouse.x, mouse.y] = [event.pageX - view.offsetLeft, event.pageY - view.offsetTop];
		[mouse.downX, mouse.downY] = [mouse.x, mouse.y];
		if(event.ctrlKey){
			if(event.button === 0 || event.button == 2){
				[transform.downTranslateX, transform.downTranslateY] = [transform.translateX, transform.translateY];
				mouse.flagTranslate = true;
				changeEditMode('translate');
			}
		}
		else if(event.shiftKey){
			backup();
			selectRect.moveDone();
			selectRect.resetRect();
			[selectRect.x, selectRect.y] = posView2Map([mouse.downX, mouse.downY]);
			[selectRect.downX, selectRect.downY] = [selectRect.x, selectRect.y];
			[selectRect.endX, selectRect.endY] = [selectRect.x, selectRect.y];
			selectRect.visible = true;
			mouse.flagSelect = true;
			mouse.focusRect = selectRect;
			changeEditMode('select');
		}
		else{
			backup();
			let pos = posView2Map([mouse.downX, mouse.downY]);
			selectRect.regularizeRect();
			let flagTouchedRect = false;
			for(let rect of [componentRect, selectRect]){
				if(
					pos[0] >= rect.x && pos[0] < rect.endX && 
					pos[1] >= rect.y && pos[1] < rect.endY
				){
					mouse.focusRect = rect;
					if(event.button === 2){
						setContextmenu(mouse.focusRect.contextmenuData);
						contextmenuShow();
					}
					else{
						[rect.downX, rect.downY] = [rect.x, rect.y];
						mouse.flagMove = true;
						changeEditMode('move');
						mouse.focusRect.move;
					}
					flagTouchedRect = true;
					break;
				}
			}
			if(!flagTouchedRect){
				mouse.flagDraw = true;
				edit.downCellType = edit.cellType;
				if(event.button === 2) edit.cellType = -1;
				changeEditMode(event.button === 2 ? 'erase' : 'draw');
				draw();
			}
		}
	});
	window.addEventListener('mouseup', event => {
		[mouse.x, mouse.y] = [event.pageX - view.offsetLeft, event.pageY - view.offsetTop];
		if(mouse.flagSelect){
			selectRect.regularizeRect();
			[selectRect.oriX, selectRect.oriY] = [selectRect.x, selectRect.y];
			selectRect.selectDone();
		}
		for(let rectElement of [selectRect, componentRect]){
			[rectElement.downX, rectElement.downY] = [0, 0];
		}
		['flagTranslate', 'flagDraw', 'flagSelect', 'flagMove'].forEach(flag => mouse[flag] = false);
		edit.cellType = edit.downCellType;
		changeEditMode('draw');
	});
	view.addEventListener('wheel', event => {
		[mouse.x, mouse.y] = [event.pageX - view.offsetLeft, event.pageY - view.offsetTop];
		event.preventDefault();
		// console.log(JSON.stringify(['wheelDeltaX', 'wheelDeltaY', 'composed', 'ctrlKey'].map(k => event[k])));
		// if(Math.abs(event.wheelDeltaY) == 120){
		if(event.ctrlKey){
			scale(event.deltaY * -0.1, [mouse.x, mouse.y]);
		}
		else{
			transform.translateX += event.deltaX * -0.5;
			transform.translateY += event.deltaY * -0.5;
		}
	}, {passive: false});
	window.addEventListener('keydown', event => {
		let keyValue = event.key.length == 1 ? event.key.toLowerCase() : event.key;
		// console.log(keyValue);
		if(event.ctrlKey){
			if(['t', 'n', 'l', 'a', 'w'].indexOf(keyValue) == -1) event.preventDefault();
		}
		if(event.target.tagName.toLowerCase() == 'input') return;
		if(event.ctrlKey){
			switch(keyValue){
				case 'a':
					selectRect.moveDone();
					[selectRect.x, selectRect.y, selectRect.endX, selectRect.endY] = recomputeEdge(map);
					selectRect.regularizeRect();
					[selectRect.oriX, selectRect.oriY] = [selectRect.x, selectRect.y];
					selectRect.visible = true;
					selectRect.selectDone();
					break;
				case 's':
					downloadExport(); break;
				case 'o':
					loadImport(); break;
				case '0':
					transform.scaleZ = 10; break;
				case '=':
					if(transform.scaleZ < 100) scale(1); break;
				case '-':
					if(transform.scaleZ > 1) scale(-1); break;
				case 'r':
					backup(); yellowAll(); break;
				case 'c':
					copy();
					break;
				case 'x':
					cut(); break;
				case 'v':
					paste(); break;
				case 'z':
					if(event.shiftKey) redo();
					else undo();
					break;
				case 'y':
					redo(); break;
			}
		}
		else{
			let targetType = ['y' , 'b', 'r'].indexOf(keyValue);
			if(targetType > -1){
				edit.downCellType = targetType;
				if(edit.cellType !== -1) edit.cellType = targetType;
				// selectButton($(`[id="typeSwitch-${targetType}"]`));
			}
			else if(keyValue == 'n') window.open(location.href, '_blank');
			else{
				// console.log(keyValue);
				if(!(contextmenu.getAttribute('show') !== null && keyValue == 'Escape')){
					switch(keyValue){
						case 'Enter':
						case 'Escape':
							if(mouse.focusRect){
								backup();
								cancelSelection();
							}
							break;
						case 'Delete':
						case 'Backspace':
							if(mouse.focusRect?.clearRect){
								backup();
								mouse.focusRect.clearRect();
							}
							break;
						case 'ArrowRight':
						case 'ArrowLeft':
						case 'ArrowUp':
						case 'ArrowDown':
							if(mouse.focusRect?.x){
								backup();
								deltaX = {'ArrowRight': 1, 'ArrowLeft': -1}[keyValue] || 0;
								deltaY = {'ArrowDown': 1, 'ArrowUp': -1}[keyValue] || 0;
								mouse.focusRect.x += deltaX;
								mouse.focusRect.y += deltaY;
								mouse.focusRect.endX += deltaX;
								mouse.focusRect.endY += deltaY;
							}
							break;
					}
				}
				contextmenuHide();
			}
		}
	});
	window.addEventListener('keyup', event => {
		if(event.key == ' '){
			playStatusChange(!flagRun);
		}
	})
	window.addEventListener('contextmenu', event => {
		event.preventDefault();
	});

	// import and export map
	function importProject(text){
		var projectData = JSON.parse(text);
		if(projectData.map)	map = projectData.map;
		else nameData = {};
		if(projectData.nameData) nameData = projectData.nameData;
		else nameData = {};
		clearBackup();
		selectRect.resetRect();
		componentRect.resetRect();
	}
	function exportProject(){
		return(JSON.stringify({
			map: map, 
			nameData: nameData
		}));
	}

	function loadImport(){
		openFile();
	}
	$('#loadImportButton').addEventListener('click', loadImport);
	function downloadExport(){
		saveFile(exportProject(), `${edit.projectName}.json`);
	}
	$('#downloadExportButton').addEventListener('click', downloadExport);

	// import and export image
	function loadMapAsImageUrl(url, callback = m => {console.log(m);}){
		let img = $e('img');
		img.onload = () => {
			let cvs = $e('canvas'), 
				ctx = cvs.getContext('2d');
			[cvs.width, cvs.height] = [img.width, img.height];
			ctx.drawImage(img, 0, 0);
			let imgData = ctx.getImageData(0, 0, cvs.width, cvs.height), 
				data = imgData.data;
			let newMap = {};
			for(let i = 0; i < data.length; i += 4){
				if(data[i+3] !== 0){
					let cellType = -1;
					let [r, g, b] = data.slice(i, i+3);
					if(r >= 200 && b <= 200){
						if(g >= 180) cellType = 0;
						else cellType = 2;
					}
					else if(r <= 200 && g <= 200 && b >= 200) cellType = 1;
					if(cellType !== -1){
						newMap[`${parseInt(Math.round(i/4)%cvs.width)},${parseInt(Math.floor((i/4)/cvs.width))}`] = cellType;
					}
				}
			}
			callback(new RangeData({x: 0, y: 0, endX: img.width, endY: img.height, map: newMap}));
		};
		img.src = url;
	};
	function importImage(){
		let input = $e('input');
		input.type = 'file';
		input.onchange = () => {
			if(input.files.length > 0){
				var file = input.files[0];
				let reader = new FileReader();
				reader.onloadend = () => {
					loadMapAsImageUrl(reader.result, rangeData => {
						map = rangeData.map;
					});
				};
				reader.readAsDataURL(file);
			}
		};
		input.click();
	}
	function recomputeEdge(map){
		var poss = Object.keys(map).map(cell => cell.split(',').map(n => parseInt(n)));
		let xs = poss.map(l => l[0]), 
			ys = poss.map(l => l[1]);
		return([Math.min(...xs), Math.min(...ys), Math.max(...xs) + 1, Math.max(...ys) + 1]);
	}
	function exportImage(rectOrMap = [0, 0, 1, 1], edgeRecomputing = true, processFunc = false){
		let processMap = {};
		let startX, startY, endX, endY;
		if(rectOrMap){
			if(rectOrMap.constructor.name == 'RangeData'){
				processMap = rectOrMap.map;
				[startX, startY, endX, endY] = [rectOrMap.x, rectOrMap.y, rectOrMap.endX, rectOrMap.endY];
			}
			else if(rectOrMap?.length === undefined){
				processMap = rectOrMap;
			}
			else{
				processMap = RectElement.getRectMap(rectOrMap);
				[startX, startY, endX, endY] = rectOrMap;
			}
		}
		else{
			processMap = {...map};
			edgeRecomputing = true;
		}
		if(edgeRecomputing) [startX, startY, endX, endY] = recomputeEdge(processMap);
		let cvs = $e('canvas'), 
			ctx = cvs.getContext('2d'), 
			dlLink = $e('a');
		cvs.width = endX - startX;
		cvs.height = endY - startY;
		for(let cell in processMap){
			let pos = cell.split(',');
			pos = pos.map(n => parseInt(n));
			pos[0] -= startX;
			pos[1] -= startY;
			ctx.fillStyle = cellColor[processMap[cell]];
			ctx.fillRect(...pos, 1, 1);
		}
		var url = cvs.toDataURL();
		if(processFunc){
			processFunc(url);
		}
		else{
			dlLink.href = url;
			dlLink.download = 'mapImage.png';
			dlLink.click();
		}
	}
	// pro
	function yellowAll(...rect){
		if(rect.length >= 4){
			for(let cell in RectElement.getRectMap(rect)){
				map[cell] = 0;
			}
		}
		else{
			let newMap = {};
			for(let cell in map){
				newMap[cell] = 0;
			}
			map = newMap;
		}
	}
	function hideLines(){
		lines.width = 0;
		lines.visible = false;
	}
	function nameRect(...rect){
		if(rect.length === 1 && typeof(rect[0]) == 'object') rect = rect[0];
		if(rect.length !== 4) return;
		var x = [rect[0], rect[2]], 
			y = [rect[1], rect[3]];
		var range = `${Math.min(...x)},${Math.min(...y)},${Math.max(...x)},${Math.max(...y)}`;
		let name = prompt('Please enter the name of the rect.', nameData[range] ? nameData[range] : '');
		if(name === null) return;
		else if(name === '') delete nameData[range];
		else nameData[range] = name;
	}

	// contextmenu
	function contextmenuShow(){
		var [absMouseX, absMouseY] = [mouse.x + view.offsetLeft, mouse.y + view.offsetTop];
		contextmenu.style.left = `${absMouseX > view.width/2 ? absMouseX - contextmenu.offsetWidth : absMouseX}px`;
		contextmenu.style.top = `${absMouseY < view.height/2 ? absMouseY : absMouseY - contextmenu.offsetHeight}px`;
		contextmenu.setAttribute('show', '');
	}
	function contextmenuHide(){
		contextmenu.removeAttribute('show');
	}
	function setContextmenu(data){
		if(contextmenu.lastData !== data){
			contextmenu.innerHTML = '';
			contextmenu.lastData = data;
			for(let method in data){
				let button = $e('button');
				button.innerText = data[method][0];
				button.addEventListener('click', () => {
					data[method][1]();
					contextmenuHide();
				});
				contextmenu.appendChild(button);
			}
		}
	}

	// copy 

	let copyMap = {};
	function copySelection(type = 'text'){
		if(type == 'text'){
			let selectRangeData = selectRect.getRangeData();
			for(let cell in selectRangeData.map){
				let pos = parsePos(cell);
				pos = pos.map((n, i) => i%2 == 0 ? n - selectRangeData.x : n - selectRangeData.y);
				copyMap[pos.join(',')] = selectRangeData.map[cell];
			}
			selectRangeData.endX -= selectRangeData.x;
			selectRangeData.endY -= selectRangeData.y;
			selectRangeData.x = selectRangeData.y = 0;
			navigator.clipboard.writeText(JSON.stringify(selectRangeData));
		}
		else if(type == 'image'){
			exportImage(selectRect.getRangeData(), false, url => {
				fetch(url)
				.then(r => r.blob())
				.then(blob => {
					navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
				});
			});
		}
	}

	function pasteClipboard(){
		function _(rangeData){
			componentRect.moveDone();
			componentRect.setData(rangeData);
			let pos = posView2Map([view.width/2, view.height/2]);
			pos[0] -= Math.floor((componentRect.endX - componentRect.x)/2);
			pos[1] -= Math.floor((componentRect.endY - componentRect.y)/2);
			componentRect.endX += pos[0] - componentRect.x;
			componentRect.endY += pos[1] - componentRect.y;
			[componentRect.x, componentRect.y] = pos;
			componentRect.visible = true;
		}
		navigator.clipboard.read()
		.then(content => {
			for(let item of content){
				if(item.types.includes('text/plain')){
					item.getType('text/plain')
					.then(blob => blob.text())
					.then(text => {
						let rangeData = false;
						try{
							rangeData = JSON.parse(text);
						}
						catch(error){alert('Paste formatting error!');}
						if(rangeData !== false) _(rangeData);
					});
				}
				else if(item.types.includes('image/png')){
					item.getType('image/png')
					.then(blob => {
						var url = URL.createObjectURL(blob);
						loadMapAsImageUrl(url, _);
					});
				}
			}
		});
	}
	function cut(){
		if(selectRect.visible){
			copySelection('image');
			selectRect.clearRect();
			selectRect.moveDone();
			selectRect.resetRect();
		}
	}
	function copy(){
		if(selectRect.visible) copySelection('image');
	}
	function paste(){
		backup();
		pasteClipboard();
		mouse.focusRect = componentRect;
	}

	playButton.addEventListener('click', () => {playStatusChange(!flagRun);});
	undoButton.addEventListener('click', undo);
	redoButton.addEventListener('click', redo);
	cutButton.addEventListener('click', cut);
	copyButton.addEventListener('click', copy);
	pasteButton.addEventListener('click', paste);
	playSpeedInput.addEventListener('change', function (){
		let value = parseInt(this.value);
		if(value < 0 || value > 1e3){
			value = Math.max(0, Math.min(value, 1e3));
			this.value = value;
		}
		edit.playSpeed = value;
	});
	lineWidthInput.addEventListener('change', function (){
		let value = parseInt(this.value);
		if(value < 0){
			value = 0;
			this.value = value;
		}
		else if(value > 10){
			value = 10;
			this.value = value;
		}
		centered(() => {lines.width = parseInt(value);});
	});
	lineVisibilityButton.addEventListener('click', lineVisibilityChange);
	exampleProjectsGithubButton.addEventListener('click', () => {
		window.open('https://github.com/MaoHuPi/maohupiWireworldGame/tree/main/exampleProject', '_blank');
	});
	maohupiInfoButton.addEventListener('click', () => {
		window.open('https://github.com/MaoHuPi', '_blank');
	});
}
