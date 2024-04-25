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
  var i = path.join(__dirname, "../helpers/constants/Silkscreen/Silkscreen-Regular.ttf"), [ i ] = await Promise.all([ fs.readFile(i) ]), a = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml"
  }[t.slice(2 + (t.lastIndexOf(".") - 1 >>> 0))] || "image/png";
  let n;
  try {
    n = await Promise.race([ convertImageToBase64(t, a), new Promise((e, t) => setTimeout(() => t(new Error("Timeout after 4 seconds")), 4e3)) ]);
  } catch (e) {
    console.error(e), n = "";
  }
  t = n ? [ {
    type: "img",
    props: {
      src: n,
      style: {
        width: "100%",
        height: "100%",
        objectFit: "cover"
      }
    }
  } ] : [], a = await satori({
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
      data: i,
      weight: 400,
      style: "normal"
    } ]
  });
  let o, g;
  return g = "png" === r ? (o = await getPngFromSvg(a), "image/png") : (o = await getJpgFromSvg(a), 
  "image/jpeg"), {
    imageBuffer: o,
    imageType: g
  };
};

module.exports = {
  generateImageWithText: generateImageWithText
};