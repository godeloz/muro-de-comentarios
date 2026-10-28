const babel = require("@babel/core");
const fs = require("fs");

const entrada = fs.readFileSync("src/app.jsx", "utf8");
try {
  const salida = babel.transformSync(entrada, {
    presets: [["@babel/preset-react", { runtime: "classic" }]],
    filename: "app.jsx",
    compact: false,
    comments: true
  });
  fs.writeFileSync("app.js", salida.code);
  console.log("Compilado OK");
} catch (e) {
  console.error("ERROR DE SINTAXIS:\n", e.message);
  process.exit(1);
}
