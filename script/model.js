// (async () => {
// 	const model = await tf.loadLayersModel('../model/output_float16.tflite');
// })();

let tfliteModel;

let predictWidth = 224;

async function modelTest(){
	if(tfliteModel === undefined){
		tfliteModel = await tflite.loadTFLiteModel('model/output_float16.tflite');
	}
	let url = await new Promise(function (resolve, reject){
		exportImage(false, true, url => {resolve(url);});
	});
	predictMapFromUrl(url);
}

async function imagePredict(imgElement){
	const outputTensor = tf.tidy(() => {
		const img = tf.browser.fromPixels(imgElement);
		const input = tf.sub(tf.div(tf.expandDims(img), 127.5), 1);
		let outputTensor = tfliteModel.predict(input);
		return(outputTensor);
		// await outputTensor
		// return tf.mul(tf.add(outputTensor, 1), 127.5)
	});
	data = await outputTensor.data();
	console.log(outputTensor, data);
}

async function predictMapFromUrl(url){
	let splitWidth = 50;
	let oriImg = await loadImageFromUrl(url);
	let rectCvs = $e('canvas'), 
		rectCtx = rectCvs.getContext('2d'),
		rectUrl,
		rectImage;
	rectCvs.width = rectCvs.height = predictWidth;
	for(let ci = 0; ci < Math.ceil(oriImg.width/splitWidth); ci++){
		for(let ri = 0; ri < Math.ceil(oriImg.height/splitWidth); ri++){
			rectCtx.clearRect(0, 0, predictWidth, predictWidth);
			rectCtx.drawImage(oriImg, ci * splitWidth, ri * splitWidth, splitWidth, splitWidth, 0, 0, predictWidth, predictWidth);
			rectUrl = rectCvs.toDataURL();
			rectImage = await loadImageFromUrl(rectUrl);
			$('#sideBoxPages div:nth-child(1)').appendChild(rectImage);
			await imagePredict(rectImage);
		}
	}
}