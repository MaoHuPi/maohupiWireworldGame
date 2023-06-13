const REL_CSS_BGI_PATH = '../image/{}.png'

const undoButton = $('#undoButton');
const redoButton = $('#redoButton');
const playButton = $('#playButton');
const cutButton = $('#cutButton');
const copyButton = $('#copyButton');
const pasteButton = $('#pasteButton');
const contentBox = $('#contentBox');
const hoverInfoBox = $('#hoverInfoBox');
const contentDividingLine = $('#contentDividingLine');
const tabButtons = $('#tabButtons');
const sideBox = $('#sideBox');

const playSpeedInput = $('#playSpeedInput');
const lineVisibilityButton = $('#lineVisibilityButton');
const lineWidthInput = $('#lineWidthInput');
const projectNameInput = $('#projectNameInput');

const exampleProjectsGithubButton = $('#exampleProjectsGithubButton');
const maohupiInfoButton = $('#maohupiInfoButton');

{
	// define
	const mouse = {
		x: 0, 
		y: 0, 
		downX: 0, 
		downY: 0, 
		flagContentDividingLine: false
	}

	// set
	$$('button[bgi]').forEach(button => {
		button.style.setProperty('--bgi', `url("${REL_CSS_BGI_PATH.replace('{}', button.getAttribute('bgi'))}")`);
	});
	[...tabButtons.children].forEach(tabButton => {
		tabButton.addEventListener('click', event => {
			sideBox.style.setProperty('--pageIndex', [...tabButtons.children].indexOf(tabButton));
		});
	});
	
	// event listener
	window.addEventListener('wheel', event => {
		if(event.target !== view){
			event.preventDefault();
		}
	}, {passive: false});
	window.addEventListener('mouseover', event => {
		hoverInfoBox.innerHTML = event.target.getAttribute('info') || '';
	});
	window.addEventListener('mousemove', event => {
		[mouse.x, mouse.y] = [event.pageX, event.pageY];
		if(mouse.flagContentDividingLine) contentBox.style.setProperty('--linePos', 
			(contentBox.getAttribute('side') || 'right') == 'right' ? 
			mouse.x / window.innerWidth : 
			1 - (mouse.x / window.innerWidth));
	});
	contentDividingLine.addEventListener('mousedown', event => {
		mouse.flagContentDividingLine = true;
		hoverInfoBox.innerHTML = event.target.getAttribute('info') || '';
	});
	contentDividingLine.addEventListener('dblclick', event => {
		// contentBox.style.setProperty('--linePos', 1 - (mouse.x / window.innerWidth));
		contentBox.setAttribute('side', (contentBox.getAttribute('side') || 'right') == 'right' ? 'left' : 'right');
	});
	window.addEventListener('mouseup', event => {
		[mouse.x, mouse.y] = [event.pageX, event.pageY];
		['flagContentDividingLine'].forEach(flag => mouse[flag] = false);
	});
}


// tool bar
// function selectButton(button){
// 	$$('button', button.parentElement).forEach(b => {b.removeAttribute('selected')});
// 	button.setAttribute('selected', '');
// }
// $$('[id^="typeSwitch-"]').forEach(button => {
// 	let index = button.id.split('-')[1];
// 	// button.style.backgroundColor = cellColor[index];
// 	button.addEventListener('click', () => {
// 		selectButton(button);
// 		edit.cellType = index;
// 	})
// });
// selectButton($(`[id="typeSwitch-${edit.cellType}"]`));
// $$('[id^="typeSwitch-"]').forEach(button => {
// 	let index = button.id.split('-')[1];
// 	button.style.backgroundColor = cellColor[index];
// 	button.addEventListener('click', () => {
// 		selectButton(button);
// 		edit.cellType = index;
// 	})
// });
// selectButton($(`[id="typeSwitch-${edit.cellType}"]`));

projectNameInput.addEventListener('change', () => {changeProjectName(projectNameInput.value);});
$('#loadImageButton').addEventListener('click', () => {importImage();});
$('#downloadImageButton').addEventListener('click', () => {exportImage(map);});

// $$(':where(input[type="text"], input[type="number"])').forEach(input => {
// 	input.addEventListener('keydown', event => {
// 		if(event.key.length === 1 && !event.ctrlKey) event.stopPropagation();
// 	});
// 	input.addEventListener('keyup', event => {
// 		if(event.key.length === 1 && !event.ctrlKey) event.stopPropagation();
// 	});
// });
// $$(':where(button, input[type="button"])').forEach(button => {
// 	button.addEventListener('focus', () => {button.blur();});
// });