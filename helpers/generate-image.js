const satori = require("satori").default, sharp = require("sharp"), fetch = require("node-fetch"), fs = require("fs").promises, path = require("path");

async function convertImageToBase64(e, t) {
  e = await (await fetch(e)).arrayBuffer(), e = Buffer.from(e);
  if (!e || !e.length) throw new Error("Unable to fetch image");
  if (t || t.length || t[0]) return `data:${t};base64,` + e.toString("base64");
  throw new Error("Unsupported image type");
}

async function getPngFromSvg(e) {
  try {
    return await sharp(Buffer.from(e)).png().toBuffer();
  } catch (e) {
    throw console.error("Error converting SVG to PNG with sharp:", e), e;
  }
}

async function getJpgFromSvg(e) {
  try {
    return await sharp(Buffer.from(e)).jpeg().toBuffer();
  } catch (e) {
    throw console.error("Error converting SVG Jpeg PNG with sharp:", e), e;
  }
}

const generateImageWithText = async ({
  text: e,
  image: t,
  type: r = "png"
}) => {
  var a = path.join(__dirname, "../helpers/constants/Silkscreen/Silkscreen-Regular.ttf"), [ a ] = await Promise.all([ fs.readFile(a) ]), t = [ {
    type: "img",
    props: {
      src: await convertImageToBase64(t, {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml"
      }[path.extname(t).toLowerCase()] || "application/octet-stream"),
      style: {
        width: 400,
        height: 400
      }
    }
  } ], t = await satori({
    type: "div",
    props: {
      children: [ ...t, {
        type: "div",
        props: {
          children: [ {
            type: "text",
            props: {
              children: e,
              style: {
                color: "#0D0009",
                fontSize: 72,
                fontWeight: 400,
                fontFamily: "Silkscreen",
                textAlign: "center"
              }
            }
          } ],
          style: {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            width: 400,
            height: 200,
            backgroundColor: "white",
            fontFamily: "Silkscreen",
            position: "absolute",
            opacity: .9
          }
        }
      } ],
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: 400,
        height: 400,
        backgroundColor: "#0D0009"
      }
    }
  }, {
    width: 400,
    height: 400,
    fonts: [ {
      name: "Silkscreen",
      data: a,
      weight: 400,
      style: "normal"
    } ]
  });
  let i, n;
  return n = "png" === r ? (i = await getPngFromSvg(t), "image/png") : (i = await getJpgFromSvg(t), 
  "image/jpeg"), {
    imageBuffer: i,
    imageType: n
  };
};

module.exports = {
  generateImageWithText: generateImageWithText
};