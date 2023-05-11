// Función para detectar deepfake en la imagen o el video

async function detectDeepfake(file) {
  //Se carga el modelo MesoNet con TensorFlow.js
  const model = await tf.loadLayersModel("./model.json");
  // model.summary();

  //a continuacion se hace el tratamiento de file para que sea utilizable en el modelo. Recordemos que el modelo espera un tensor de dimension 256x256x3 (reescalado de la imagen original) y que el tensor debe ser de tipo float32

  tensor = await getTensor(file);

  //se imprime el tensor
  console.log("tensor:");
  console.log(tensor);

  //se hace la prediccion
  let prediction = model.predict(tensor);

  //se obtiene el valor de la prediccion
  prediction = prediction.dataSync()[0];
  console.log("prediction:");
  console.log(prediction > 0.5);
  console.log(prediction);

  //se retorna si la imagen es DeepFake o no
  return prediction > 0.5;
}

async function getTensor(file) {
  //se crea un objeto de tipo FileReader para leer el contenido del archivo
  let reader = new FileReader();

  //se lee el contenido del archivo
  reader.readAsDataURL(file);

  //se espera a que el contenido del archivo sea leido
  await new Promise((resolve) => {
    reader.onload = resolve;
  });

  //se obtiene el contenido del archivo

  let data = reader.result;

  //se crea un objeto de tipo Image para cargar la imagen

  let img = new Image();

  //se carga la imagen
  img.src = data;

  //se espera a que la imagen sea cargada
  await new Promise((resolve) => {
    img.onload = resolve;
  });

  //se crea un objeto de tipo canvas para reescalar la imagen
  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");

  //se reescala la imagen
  canvas.width = 256;
  canvas.height = 256;
  ctx.drawImage(img, 0, 0, 256, 256);
  document.body.appendChild(canvas);

  //se obtiene el tensor de la imagen
  let tensor = tf.browser.fromPixels(canvas);

  //se reescalaliza el tensor
  tensor = tensor.div(255);

  //se cambia el tipo de dato del tensor a float32
  tensor = tensor.toFloat();

  //se cambia la dimension del tensor a 1x256x256x3
  tensor = tensor.expandDims();

  //se retorna el tensor
  return tensor;
}

// Funcion para obtener un objeto de archivo a partir de una URL
async function getFileFromURL(url, fileName, defaultType = "image/png") {
  const response = await fetch(url, {
    method: "GET",
    mode: "no-cors",
  });
  const blob = await response.blob();
  const file = new File([blob], fileName, { type: blob.type || defaultType });
  return file;
}

// Manejador de eventos para el botón de "Analizar"
analyzeBtn = document.getElementById("analyze");
analyzeBtn.addEventListener("click", function () {
  let url = document.getElementById("url").value;
  let file = document.getElementById("file").files[0];
  let message;

  // Validar que se haya ingresado una URL o se haya cargado un archivo
  if (!url && !file) {
    message = "Por favor, ingrese una URL o cargue un archivo";

    // Mostrar una notificación con el resultado del análisis
    chrome.notifications.create({
      type: "basic",
      title: "Resultado del análisis // No URL or File",
      message: message,
      iconUrl: "icon.png",
    });
  }

  // Si se ingresó una URL, utilizarla para crear un objeto de archivo
  if (url) {
    let fileName = url.split("/").pop();
    file = getFileFromURL(url, fileName).then((file) => {
      // Verificar que el archivo es una imagen o un video\
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        // Analizar el archivo en busca de deepfake
        isReal = detectDeepfake(file);
        if (isReal) {
          message = "El archivo analizado no es un deepfake";
        } else {
          message = "El archivo analizado es un deepfake";
        }
      } else {
        message = "Por favor, cargue un archivo de imagen o video";
      }
      // Mostrar una notificación con el resultado del análisis
      chrome.notifications.create({
        type: "basic",
        title: "Resultado del análisis // URL",
        message: message,
        iconUrl: "icon.png",
      });
    });
  } else {
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      // Analizar el archivo en busca de deepfake
      isReal = detectDeepfake(file);
      console.log(isReal);
      if (isReal) {
        message = "El archivo analizado no es un deepfake";
      } else {
        message = "El archivo analizado es un deepfake";
      }
    } else {
      message = "Por favor, cargue un archivo de imagen o video";
    }
    chrome.notifications.create({
      type: "basic",
      title: "Resultado del análisis // File",
      message: message,
      iconUrl: "icon.png",
    });
  }
});

// Crear un menú contextual para la extensión

chrome.contextMenus.create({
  title: "Analizar imagen o video",
  contexts: ["image", "video"],
  onclick: function (info) {
    // console.log("info", info);
    var url = info.srcUrl;
    var file = { name: url.split("/").pop(), type: "" };
    // Analizar la imagen o el video en busca de deepfake
    isReal = detectDeepfake(file) > 0.5;
    if (isReal) {
      message = "La imagen o el video analizado es un deepfake";
    } else {
      message = "La imagen o el video analizado no es un deepfake";
    }
    // Mostrar una notificación con el resultado del análisis
    chrome.notifications.create({
      type: "basic",
      title: "Resultado del análisis",
      message: message,
      iconUrl: "icon.png",
    });
  },
});
