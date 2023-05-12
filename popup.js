// Función para detectar deepfake en la imagen o el video

async function detectDeepfake(file) {
  try {
    document.getElementById("div_result").remove();
  } catch (error) {
    console.log(error);
  }

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
  console.log(prediction > 0.75);
  console.log(prediction);

  //se obtiene analyzedImage y se agrega el resultado de la prediccion como h5 y p al final de la pagina

  let analyzedImage;

  if (document.getElementById("analyzedImage")) {
    analyzedImage = document.getElementById("analyzedImage");
    document.getElementById("analyzedImage").remove();
  }

  let h3 = document.createElement("h5");
  let p = document.createElement("p");
  h3.innerHTML = `Resultado del análisis: ${
    prediction > 0.75 ? "Real" : "DeepFake"
  }`;
  h3.style.color = prediction > 0.75 ? "green" : "red";
  h3.id = "h3_result";
  p.id = "p_result";
  p.innerHTML = prediction;

  let div = document.createElement("div");
  div.id = "div_result";
  div.style.display = "flex";
  div.style.flexDirection = "column";
  div.style.alignItems = "center";
  div.style.justifyContent = "center";

  div.appendChild(document.createElement("br"));
  div.appendChild(analyzedImage);
  div.appendChild(h3);
  div.appendChild(p);
  div.appendChild(document.createElement("br"));

  document.body.appendChild(div);

  //se muestra una notificacion con el resultado del analisis

  notifyResult(prediction > 0.75);

  //se retorna si la imagen es DeepFake o no
  return prediction > 0.75;
}

//Funcion para generar una chrome.notification con el resultado del analisis. En caso de que el resultado sea positivo, se muestra una notificacion de deepfake, en caso contrario, se muestra una notificacion de que no es deepfake. Si no se ha subido un archivo o se ha ingresado una URL, se muestra una notificacion de error.
function notifyResult(isReal) {
  let message;
  if (isReal) {
    message = "El archivo analizado no es un deepfake";
  } else {
    message = "El archivo analizado es un deepfake";
  }
  chrome.notifications.create({
    type: "basic",
    title: "Resultado del análisis",
    message: message,
    iconUrl: "icon.png",
  });
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
  canvas.id = "analyzedImage";
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

try {
  // Manejador de eventos para el botón de "Analizar"
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
          console.log(isReal);
        }
      });
    } else {
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        // Analizar el archivo en busca de deepfake
        isReal = detectDeepfake(file);
        console.log(isReal);
      }
    }
  });
} catch (error) {
  console.log(error);
}

// Menu contextual para analizar imágenes y videos. En esta seccion se crea el menu contextual y se le asigna la funcion de analizar el archivo seleccionado.
chrome.contextMenus.create({
  title: "Analizar DeepFake",
  contexts: ["image", "video"],
  onclick: context(info),
});

function context(info) {
  alert("Analizando archivo...");
}
