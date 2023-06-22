// (async () => {
// 	const model = await tf.loadLayersModel('../model/output_float16.tflite');
// })();

let predictTypes = ['component', 'element'];
let modelTest;

{
	let predictWidth = 640;
	let modelData = {};

	async function loadModel(type){
		var yaml = await fetch(`componentDetect/datasets/${type}/${type}.yml`).then(r => r.text());
		var yamlData = jsyaml.load(yaml);
		model = await tflite.loadTFLiteModel(`componentDetect/datasets/${type}/best-fp16.tflite`);
		modelData[type] = {
			yaml: yamlData, 
			model: model
		};
	}

	modelTest = async function (type){
		if(modelData[type] === undefined){
			await loadModel(type);
		}
		let url = await new Promise(function (resolve, reject){
			exportImage(false, true, url => {resolve(url);});
		});
		let boxList = await predictMapFromUrl(url, type, 0.2);
		clearNameRect();
		let mapEdge = recomputeEdge();
		boxList.forEach(box => {addNameRect(mapEdge[0] + box[0], mapEdge[1] + box[1], mapEdge[0] + box[2], mapEdge[1] + box[3], box[4]);});
	}
	
	async function predictMapFromUrl(url, type, conf){
		async function imagePredict(imgElement, conf = 0.5){
			const outputTensor = tf.tidy(() => {
				const img = tf.browser.fromPixels(imgElement);
				const input = tf.sub(tf.div(tf.expandDims(img), 127.5), 1);
				let outputTensor = modelData[type].model.predict(input);
				return(outputTensor);
			});
			let data = await outputTensor.data();
			boxList = [];
			for(let i = 0; i < outputTensor.shape[1]; i++){
				let boxDataWholeArray = data.slice(outputTensor.shape[2] * i, outputTensor.shape[2] * (i+1));
				let boxData = {
					box: boxDataWholeArray.slice(0, 4), 
					score: boxDataWholeArray.slice(4, 5), 
					classes: boxDataWholeArray.slice(5)
				};
				if(boxData.score >= conf){
					boxList.push(boxData);
				};
			}
			// console.log(outputTensor, data);
			return(boxList);
		}
		let splitWidth = 50;
		let oriImg = await loadImageFromUrl(url);
		let rectCvs = $e('canvas'), 
			rectCtx = rectCvs.getContext('2d'),
			rectUrl,
			rectImage, 
			boxList, 
			newBoxList = [];
		rectCvs.width = rectCvs.height = predictWidth;
		for(let ci = 0; ci < Math.ceil(oriImg.width/splitWidth); ci++){
			for(let ri = 0; ri < Math.ceil(oriImg.height/splitWidth); ri++){
				rectCtx.clearRect(0, 0, predictWidth, predictWidth);
				rectCtx.drawImage(oriImg, ci * splitWidth, ri * splitWidth, splitWidth, splitWidth, 0, 0, predictWidth, predictWidth);
				rectUrl = rectCvs.toDataURL();
				rectImage = await loadImageFromUrl(rectUrl);
				// $('#sideBoxPages div:nth-child(1)').appendChild(rectImage);
				boxList = await imagePredict(rectImage, conf);
				boxList.forEach(boxData => {
					boxData.box = boxData.box.map(n => n * splitWidth);
					newBoxList.push([
						... new Array(4).fill(0).map((_, i) => Math.round([ci, ri][i%2] * splitWidth + boxData.box[i%2] + (i-2 < 0 ? -1 : 1)*(boxData.box[2]/2))), 
						modelData[type].yaml.names[boxData.classes.indexOf(Math.max(...boxData.classes))]
					]);
				});
			}
		}
		return(newBoxList);
	}
}