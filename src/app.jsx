/* ============================================================
   MURO LIDERAZGO EN ESCENA · Código fuente
   ------------------------------------------------------------
   Este es el archivo legible. El navegador ejecuta app.js,
   que se genera desde acá con:   node compilar.js
   ============================================================ */

const { useState, useEffect, useLayoutEffect, useMemo, useRef } = React;

const ICONOS     = (window.DATOS && window.DATOS.ICONOS)     || [];
const COLORES    = (window.DATOS && window.DATOS.COLORES)    || [];
const REACCIONES = (window.DATOS && window.DATOS.REACCIONES) || [];
const CFG        = window.CONFIG || {};

const CLAVE_ULTIMO    = "muro-lidere:ultimo-envio";
const CLAVE_IDENTIDAD = "muro-lidere:identidad";
const CLAVE_HUELLA    = "muro-lidere:huella";
const ESPERA_MS       = 8 * 1000;
const MAX_TEXTO       = 1500;

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
               "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];


/* ------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------ */

function faltaConfigurar() {
  const u = CFG.SUPABASE_URL || "";
  const k = CFG.SUPABASE_ANON_KEY || "";
  return !u || !k || u.indexOf("PEGA_ACA") === 0 || k.indexOf("PEGA_ACA") === 0;
}

function guardar(clave, valor) {
  try { localStorage.setItem(clave, valor); } catch (e) { /* almacenamiento bloqueado */ }
}

function leer(clave) {
  try { return localStorage.getItem(clave); } catch (e) { return null; }
}

/* Identificador anónimo del navegador: sirve para saber qué reacciones
   son de quien está mirando, y para poder quitarlas. No identifica a nadie. */
function huella() {
  let h = leer(CLAVE_HUELLA);
  if (!h) {
    h = "h" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    guardar(CLAVE_HUELLA, h);
  }
  return h;
}
const HUELLA = huella();

function leerIdentidad() {
  try { return JSON.parse(leer(CLAVE_IDENTIDAD) || "{}"); }
  catch (e) { return {}; }
}

function fechaLarga(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.getDate() + " de " + MESES[d.getMonth()] + " de " + d.getFullYear();
}

function fechaSuelta(iso) {
  if (!iso) return null;
  const p = String(iso).split("-");
  if (p.length !== 3) return null;
  return { dia: Number(p[2]), mes: Number(p[1]) - 1, anio: Number(p[0]) };
}

function rangoFechas(inicio, fin) {
  const a = fechaSuelta(inicio);
  const b = fechaSuelta(fin);
  if (!a && !b) return "";
  if (a && !b) return "Desde el " + a.dia + " de " + MESES[a.mes] + " de " + a.anio;
  if (!a && b) return "Hasta el " + b.dia + " de " + MESES[b.mes] + " de " + b.anio;
  if (a.anio === b.anio) {
    return "Del " + a.dia + " de " + MESES[a.mes] +
           " al " + b.dia + " de " + MESES[b.mes] + " de " + b.anio;
  }
  return "Del " + a.dia + " de " + MESES[a.mes] + " de " + a.anio +
         " al " + b.dia + " de " + MESES[b.mes] + " de " + b.anio;
}

function plural(n, singular, pluralPalabra) {
  return n + " " + (n === 1 ? singular : pluralPalabra);
}

function promedioDe(lista) {
  const vivos = lista.filter((c) => !c.eliminado);
  if (!vivos.length) return null;
  const suma = vivos.reduce((t, c) => t + c.estrellas, 0);
  return Math.round((suma / vivos.length) * 10) / 10;
}

/* Clave para reconocer la misma película en distintos ciclos:
   título sin tildes ni mayúsculas, más el año. */
function clavePelicula(p) {
  const t = String(p.titulo || "").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]+/g, " ").trim();
  return t + "|" + (p.anio || "");
}

/* El banco son todas las películas que ya pasaron por algún ciclo,
   sin repetir. Si una película aparece varias veces, gana la ficha
   más completa (con imagen y enlace). */
function bancoDe(peliculas) {
  const mapa = {};
  const peso = (p) => (p.imagen_url ? 2 : 0) + (p.enlace_url ? 1 : 0) + (p.director ? 1 : 0);
  peliculas.forEach((p) => {
    const k = clavePelicula(p);
    if (!mapa[k] || peso(p) > peso(mapa[k])) mapa[k] = p;
  });
  return Object.keys(mapa).map((k) => mapa[k])
    .sort((a, b) => String(a.titulo).localeCompare(String(b.titulo), "es"));
}

function fichaLimpia(p) {
  return {
    titulo: p.titulo || "", director: p.director || "", anio: p.anio || "",
    imagen_url: p.imagen_url || "", enlace_url: p.enlace_url || ""
  };
}

function paletaDe(indice) {
  return COLORES[indice % COLORES.length] || COLORES[0] ||
         { vivo: "#007AFF", texto: "#0A5BC4", suave: "#E3F0FF" };
}

function exportarCSV(filas, nombreArchivo, resumen) {
  if (!filas.length) return;
  const columnas = Object.keys(filas[0]);
  const escapar = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const cuerpo = [
    columnas.join(","),
    ...filas.map((f) => columnas.map((c) => escapar(f[c])).join(","))
  ].join("\n");
  const csv = (resumen ? resumen + "\n\n" : "") + cuerpo;
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo + "-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}


/* ------------------------------------------------------------
   Piezas visuales
   ------------------------------------------------------------ */

const TRAZO_ESTRELLA =
  "M12 2.7l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.26l-5.7 3-1.09-6.35-4.62-4.5 6.38-.93z";

function Estrellas({ valor, tamano, color }) {
  const t = tamano || 18;
  return (
    <span className="estrellas" aria-label={plural(valor, "estrella", "estrellas")}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width={t} height={t} aria-hidden="true"
             className={i <= valor ? "estrella activa" : "estrella"}
             style={i <= valor && color ? { fill: color } : null}>
          <path d={TRAZO_ESTRELLA} />
        </svg>
      ))}
    </span>
  );
}

function SelectorEstrellas({ valor, onChange }) {
  const [encima, setEncima] = useState(0);
  const mostrado = encima || valor;
  return (
    <div className="selector-estrellas" role="radiogroup" aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={valor === i}
                aria-label={plural(i, "estrella", "estrellas")}
                className="boton-estrella"
                onMouseEnter={() => setEncima(i)}
                onMouseLeave={() => setEncima(0)}
                onClick={() => onChange(i)}>
          <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true"
               className={i <= mostrado ? "estrella activa" : "estrella"}>
            <path d={TRAZO_ESTRELLA} />
          </svg>
        </button>
      ))}
    </div>
  );
}

function Avatar({ icono, paleta }) {
  const contenido = ICONOS[icono % (ICONOS.length || 1)] || "";
  return (
    <span className="avatar" style={{ background: paleta.suave, color: paleta.vivo }}>
      <svg viewBox="0 0 24 24" className="ico" aria-hidden="true"
           dangerouslySetInnerHTML={{ __html: contenido }} />
    </span>
  );
}

function Caratula({ pelicula }) {
  const [rota, setRota] = useState(false);
  const paleta = paletaDe((pelicula.titulo || "").length + (pelicula.anio || 0));
  const cuerpo = pelicula.imagen_url && !rota
    ? <img src={pelicula.imagen_url} alt="" loading="lazy" onError={() => setRota(true)} />
    : <span className="caratula-vacia" style={{ background: paleta.suave, color: paleta.texto }}>
        {pelicula.titulo}
      </span>;
  return (
    <div className="pelicula">
      {pelicula.enlace_url
        ? <a href={pelicula.enlace_url} target="_blank" rel="noopener noreferrer" className="caratula">{cuerpo}</a>
        : <span className="caratula">{cuerpo}</span>}
      <p className="pelicula-titulo">
        {pelicula.enlace_url
          ? <a href={pelicula.enlace_url} target="_blank" rel="noopener noreferrer">{pelicula.titulo}</a>
          : pelicula.titulo}
      </p>
      <p className="pelicula-ficha">
        {[pelicula.director, pelicula.anio].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}

function TiraPeliculas({ peliculas }) {
  if (!peliculas.length) return null;
  return (
    <div className="tira" role="list">
      {peliculas.map((p) => <div role="listitem" key={p.id}><Caratula pelicula={p} /></div>)}
    </div>
  );
}

function Nota({ promedio, votos, color }) {
  if (!votos) return <span className="nota nota-sin">Todavía sin calificar</span>;
  return (
    <span className="nota">
      <Estrellas valor={Math.round(promedio)} tamano={16} color={color} />
      <strong>{promedio.toFixed(1)}</strong>
      <span className="nota-votos">{plural(votos, "voz", "voces")}</span>
    </span>
  );
}


/* ------------------------------------------------------------
   Reacciones
   ------------------------------------------------------------ */

function Reacciones({ lista, paleta, onAlternar }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => {
      if (caja.current && !caja.current.contains(e.target)) setAbierto(false);
    };
    const escape = (e) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  const grupos = REACCIONES
    .map((e) => ({
      emoji: e,
      total: lista.filter((r) => r.emoji === e).length,
      mia: lista.some((r) => r.emoji === e && r.huella === HUELLA)
    }))
    .filter((g) => g.total > 0);

  return (
    <div className="reacciones" ref={caja}>
      {grupos.map((g) => (
        <button key={g.emoji} type="button"
                className={g.mia ? "pastilla mia" : "pastilla"}
                style={g.mia ? { background: paleta.suave, borderColor: paleta.vivo } : null}
                aria-pressed={g.mia}
                aria-label={g.emoji + " · " + plural(g.total, "reacción", "reacciones")}
                onClick={() => onAlternar(g.emoji)}>
          <span className="pastilla-emoji">{g.emoji}</span>
          <span className="pastilla-cuenta">{g.total}</span>
        </button>
      ))}

      <button type="button" className="pastilla pastilla-mas"
              aria-label="Reaccionar a este comentario"
              aria-expanded={abierto}
              onClick={() => setAbierto(!abierto)}>+</button>

      {abierto && (
        <div className="paleta-emojis" role="menu">
          {REACCIONES.map((e) => (
            <button key={e} type="button" role="menuitem" className="emoji-opcion"
                    aria-label={"Reaccionar con " + e}
                    onClick={() => { onAlternar(e); setAbierto(false); }}>{e}</button>
          ))}
        </div>
      )}
    </div>
  );
}


/* ------------------------------------------------------------
   Tarjetas y divisores
   ------------------------------------------------------------ */

/* Texto de la tarjeta. En el carrusel se recorta a unas líneas
   y aparece "Leer completo" solo si de verdad hay más texto. */
function TextoTarjeta({ texto, recortar }) {
  const caja = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [sobra, setSobra] = useState(false);
  useLayoutEffect(() => {
    if (!recortar || abierto || !caja.current) return;
    setSobra(caja.current.scrollHeight > caja.current.clientHeight + 2);
  }, [texto, recortar, abierto]);
  const recortado = recortar && !abierto;
  return (
    <div>
      <p ref={caja} className={recortado ? "tarjeta-texto recortado" : "tarjeta-texto"}>{texto}</p>
      {recortar && (sobra || abierto) && (
        <button type="button" className="leer-mas" onClick={() => setAbierto(!abierto)}>
          {abierto ? "Leer menos" : "Leer completo"}
        </button>
      )}
    </div>
  );
}

function Tarjeta({ comentario, reacciones, esAdmin, onPapelera, onEditar, onReaccion, recortar }) {
  const paleta = paletaDe(comentario.color);
  return (
    <article className="tarjeta" style={{ borderColor: paleta.vivo }}>
      <span className="tarjeta-cinta" style={{ background: paleta.vivo }} aria-hidden="true" />
      <header className="tarjeta-cabeza">
        <Avatar icono={comentario.icono} paleta={paleta} />
        <div className="tarjeta-quien">
          <p className="tarjeta-nombre" style={{ color: paleta.texto }}>{comentario.nombre}</p>
          <p className="tarjeta-rol">{comentario.cargo}</p>
          <p className="tarjeta-org">{comentario.organizacion}</p>
        </div>
      </header>
      <Estrellas valor={comentario.estrellas} tamano={21} color={paleta.vivo} />
      <TextoTarjeta texto={comentario.texto} recortar={recortar} />
      <Reacciones lista={reacciones} paleta={paleta}
                  onAlternar={(e) => onReaccion(comentario.id, e)} />
      <footer className="tarjeta-pie">
        <time dateTime={comentario.creado_en}>{fechaLarga(comentario.creado_en)}</time>
        {esAdmin && (
          <span className="tarjeta-acciones">
            <button type="button" className="mini" onClick={() => onEditar(comentario)}>Editar</button>
            <button type="button" className="mini" onClick={() => onPapelera(comentario)}>A la papelera</button>
          </span>
        )}
      </footer>
    </article>
  );
}

/* Carrusel horizontal de un ciclo cerrado: se desliza con el dedo,
   con la rueda del ratón o con las flechas. */
function Carrusel({ comentarios, porComentario, esAdmin, onPapelera, onEditar, onReaccion }) {
  const pista = useRef(null);
  const [bordes, setBordes] = useState({ inicio: true, fin: true });

  function medir() {
    const p = pista.current;
    if (!p) return;
    setBordes({
      inicio: p.scrollLeft <= 4,
      fin: p.scrollLeft + p.clientWidth >= p.scrollWidth - 4
    });
  }

  useEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [comentarios.length]);

  function mover(sentido) {
    const p = pista.current;
    if (!p) return;
    p.scrollBy({ left: sentido * p.clientWidth * 0.85, behavior: "smooth" });
  }

  const sinFlechas = bordes.inicio && bordes.fin;

  return (
    <div className="carrusel">
      {!sinFlechas && (
        <button type="button" className="carrusel-flecha izquierda" disabled={bordes.inicio}
                aria-label="Comentarios anteriores" onClick={() => mover(-1)}>‹</button>
      )}
      <div className="carrusel-pista" ref={pista} onScroll={medir} tabIndex="0"
           aria-label={plural(comentarios.length, "comentario", "comentarios") + " en carrusel"}>
        {comentarios.map((c) => (
          <div className="carrusel-item" key={c.id}>
            <Tarjeta comentario={c} esAdmin={esAdmin} recortar={true}
                     reacciones={porComentario[c.id] || []}
                     onPapelera={onPapelera} onEditar={onEditar} onReaccion={onReaccion} />
          </div>
        ))}
      </div>
      {!sinFlechas && (
        <button type="button" className="carrusel-flecha derecha" disabled={bordes.fin}
                aria-label="Comentarios siguientes" onClick={() => mover(1)}>›</button>
      )}
    </div>
  );
}

function Divisor({ etiqueta, nombre, ciclo, peliculas, comentarios, enMuro, onCambiarVista }) {
  const prom = promedioDe(comentarios);
  const votos = comentarios.filter((c) => !c.eliminado).length;
  const rango = ciclo ? rangoFechas(ciclo.fecha_inicio, ciclo.fecha_fin) : "";
  const descripcion = ciclo ? ciclo.descripcion : "";
  return (
    <section className="divisor">
      <div className="arcoiris" aria-hidden="true" />
      <div className="divisor-cuerpo">
        <p className="divisor-etiqueta">{etiqueta}</p>
        <h2 className="divisor-nombre">{nombre}</h2>
        {rango && <p className="divisor-fechas">{rango}</p>}
        {descripcion && <p className="divisor-desc">{descripcion}</p>}
        <TiraPeliculas peliculas={peliculas || []} />
        <div className="divisor-datos">
          <Nota promedio={prom} votos={votos} />
          {votos > 1 && (
            <button type="button" className="plegar" onClick={onCambiarVista}>
              {enMuro
                ? "Volver al carrusel"
                : "Ver los " + votos + " comentarios en muro"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* Un ciclo cerrado completo: divisor + comentarios en carrusel o en muro */
function BloqueCerrado({ id, etiqueta, nombre, ciclo, peliculas, comentarios, vacio,
                         enMuro, onCambiarVista, porComentario, esAdmin,
                         onPapelera, onEditar, onReaccion }) {
  const comunes = { porComentario, esAdmin, onPapelera, onEditar, onReaccion };
  return (
    <div className="bloque-cerrado" id={id}>
      <Divisor etiqueta={etiqueta} nombre={nombre} ciclo={ciclo} peliculas={peliculas}
               comentarios={comentarios} enMuro={enMuro} onCambiarVista={onCambiarVista} />
      {!comentarios.length
        ? (vacio ? <p className="vacio">{vacio}</p> : null)
        : enMuro
          ? <Rejilla comentarios={comentarios} vacio="" {...comunes} />
          : <Carrusel comentarios={comentarios} {...comunes} />}
    </div>
  );
}

function Rejilla({ comentarios, porComentario, esAdmin, onPapelera, onEditar, onReaccion, vacio }) {
  if (!comentarios.length) return <p className="vacio">{vacio}</p>;
  return (
    <div className="rejilla">
      {comentarios.map((c) => (
        <Tarjeta key={c.id} comentario={c} esAdmin={esAdmin}
                 reacciones={porComentario[c.id] || []}
                 onPapelera={onPapelera} onEditar={onEditar} onReaccion={onReaccion} />
      ))}
    </div>
  );
}


/* ------------------------------------------------------------
   Línea de tiempo de ciclos
   En pantallas anchas es una columna fija a la izquierda;
   en pantallas angostas, una franja horizontal pegada arriba.
   ------------------------------------------------------------ */

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun",
                      "jul", "ago", "sep", "oct", "nov", "dic"];

function mesDe(ciclo) {
  const f = fechaSuelta(ciclo.fecha_inicio);
  if (f) return MESES_CORTOS[f.mes] + " " + f.anio;
  if (ciclo.creado_en) {
    const d = new Date(ciclo.creado_en);
    return MESES_CORTOS[d.getMonth()] + " " + d.getFullYear();
  }
  return "";
}

function LineaTiempo({ tramos }) {
  const [actual, setActual] = useState(tramos.length ? tramos[0].id : null);
  const franja = useRef(null);

  /* Resalta el ciclo que está a la vista */
  useEffect(() => {
    let pendiente = false;
    function revisar() {
      pendiente = false;
      const limite = window.innerHeight * 0.35;
      let elegido = tramos.length ? tramos[0].id : null;
      tramos.forEach((t) => {
        const el = document.getElementById(t.id);
        if (el && el.getBoundingClientRect().top <= limite) elegido = t.id;
      });
      /* al llegar al final de la página gana el último */
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 && tramos.length) {
        elegido = tramos[tramos.length - 1].id;
      }
      setActual(elegido);
    }
    function alDesplazar() {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(revisar);
    }
    revisar();
    window.addEventListener("scroll", alDesplazar, { passive: true });
    window.addEventListener("resize", alDesplazar);
    return () => {
      window.removeEventListener("scroll", alDesplazar);
      window.removeEventListener("resize", alDesplazar);
    };
  }, [tramos.map((t) => t.id).join(",")]);

  /* En la franja horizontal, mantiene a la vista el ciclo resaltado */
  useEffect(() => {
    const f = franja.current;
    if (!f || f.scrollWidth <= f.clientWidth) return;
    const boton = f.querySelector('[data-tramo="' + actual + '"]');
    if (!boton) return;
    const destino = boton.offsetLeft - (f.clientWidth - boton.offsetWidth) / 2;
    f.scrollTo({ left: Math.max(0, destino), behavior: "smooth" });
  }, [actual]);

  function ir(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActual(id);
  }

  return (
    <nav className="linea-tiempo" aria-label="Ciclos">
      <p className="linea-titulo">Ciclos</p>
      <ol className="linea-lista" ref={franja}>
        {tramos.map((t) => (
          <li key={t.id}>
            <button type="button" data-tramo={t.id}
                    className={"tramo" + (t.id === actual ? " actual" : "") + (t.activo ? " vivo" : "")}
                    aria-current={t.id === actual ? "true" : undefined}
                    title={t.nombre}
                    onClick={() => ir(t.id)}>
              <span className="tramo-punto" aria-hidden="true" />
              <span className="tramo-texto">
                <span className="tramo-cuando">{t.cuando}</span>
                <span className="tramo-nombre">{t.nombre}</span>
                <span className="tramo-corto">{t.corto || t.nombre}</span>
                <span className="tramo-voces">{plural(t.voces, "voz", "voces")}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}


/* ------------------------------------------------------------
   Formulario
   ------------------------------------------------------------ */

function Formulario({ ciclo, onPublicar, recienPublicado }) {
  const guardada = leerIdentidad();
  const [estrellas, setEstrellas] = useState(0);
  const [texto, setTexto] = useState("");
  const [nombre, setNombre] = useState(guardada.nombre || "");
  const [cargo, setCargo] = useState(guardada.cargo || "");
  const [organizacion, setOrganizacion] = useState(guardada.organizacion || ciclo.organizacion_sugerida || "");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");
  const trampa = useRef(null);

  useEffect(() => {
    if (!organizacion) setOrganizacion(ciclo.organizacion_sugerida || "");
  }, [ciclo.id]);

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    if (trampa.current && trampa.current.value) return;

    const ultimo = Number(leer(CLAVE_ULTIMO) || 0);
    if (Date.now() - ultimo < ESPERA_MS) {
      setAviso("Espera unos segundos antes de enviar otro comentario.");
      return;
    }
    if (!estrellas)           return setAviso("Falta la calificación con estrellas.");
    if (!texto.trim())        return setAviso("Falta tu comentario.");
    if (!nombre.trim())       return setAviso("Falta tu nombre.");
    if (!cargo.trim())        return setAviso("Falta tu cargo.");
    if (!organizacion.trim()) return setAviso("Falta tu organización.");

    setAviso("");
    setEnviando(true);
    try {
      await onPublicar({
        p_nombre: nombre, p_cargo: cargo, p_organizacion: organizacion,
        p_texto: texto, p_estrellas: estrellas
      });
      guardar(CLAVE_IDENTIDAD, JSON.stringify({ nombre: nombre, cargo: cargo, organizacion: organizacion }));
      guardar(CLAVE_ULTIMO, String(Date.now()));
      setTexto("");
      setEstrellas(0);
    } catch (err) {
      setAviso(err.message || "No pudimos publicar tu comentario. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const restantes = MAX_TEXTO - texto.length;

  return (
    <form className="formulario" onSubmit={enviar}>
      {recienPublicado && (
        <p className="exito" role="status">
          Listo, tu comentario ya está en el muro. Puedes dejar otro cuando quieras.
        </p>
      )}

      <div className="campo">
        <label>Tu calificación</label>
        <SelectorEstrellas valor={estrellas} onChange={setEstrellas} />
      </div>

      <div className="campo">
        <label htmlFor="f-texto">Tu comentario</label>
        <textarea id="f-texto" rows="5" maxLength={MAX_TEXTO} value={texto}
                  placeholder="Escribe aquí lo que te llevas del taller"
                  onChange={(e) => setTexto(e.target.value)} />
        {texto.length > MAX_TEXTO - 300 && (
          <p className="contador">{plural(restantes, "carácter", "caracteres")} restantes</p>
        )}
      </div>

      <div className="campos-fila">
        <div className="campo">
          <label htmlFor="f-nombre">Nombre</label>
          <input id="f-nombre" type="text" maxLength="60" value={nombre}
                 autoComplete="name" onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="f-cargo">Cargo</label>
          <input id="f-cargo" type="text" maxLength="80" value={cargo}
                 autoComplete="organization-title" onChange={(e) => setCargo(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="f-org">Organización</label>
          <input id="f-org" type="text" maxLength="100" value={organizacion}
                 autoComplete="organization" onChange={(e) => setOrganizacion(e.target.value)} />
        </div>
      </div>

      <input ref={trampa} type="text" name="sitio_web" tabIndex="-1" autoComplete="off"
             aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />

      {aviso && <p className="aviso" role="alert">{aviso}</p>}

      <button type="submit" className="boton-principal" disabled={enviando}>
        {enviando ? "Publicando…" : "Publicar mi comentario"}
      </button>
      <p className="letra-chica">Tu comentario será visible para todo el que abra este enlace.</p>
    </form>
  );
}


/* ------------------------------------------------------------
   Acceso de administrador
   ------------------------------------------------------------ */

function ModalPin({ onEntrar, onCerrar }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (entrando) return;
    setEntrando(true);
    setError("");
    try {
      await onEntrar(pin);
    } catch (err) {
      setError("Ese PIN no es. Vuelve a intentarlo.");
      setEntrando(false);
    }
  }

  return (
    <div className="capa" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Modo administrador</h2>
        <p className="modal-texto">Este muro lo cuida una sola persona. Si eres tú, escribe el PIN.</p>
        <form onSubmit={enviar}>
          <input type="password" inputMode="numeric" autoFocus value={pin}
                 aria-label="PIN de administrador"
                 onChange={(e) => setPin(e.target.value)} />
          {error && <p className="aviso" role="alert">{error}</p>}
          <div className="modal-botones">
            <button type="button" className="boton-suave" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="boton-principal" disabled={entrando}>
              {entrando ? "Entrando…" : "Entrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


/* ------------------------------------------------------------
   Panel de administración
   ------------------------------------------------------------ */

/* Buscador del banco: todas las películas que ya pasaron por algún ciclo.
   Las que ya están en la lista actual no aparecen. */
function BuscadorBanco({ banco, yaEstan, onElegir }) {
  const [q, setQ] = useState("");
  const presentes = {};
  yaEstan.forEach((p) => { presentes[clavePelicula(p)] = true; });
  const disponibles = banco.filter((p) => !presentes[clavePelicula(p)]);
  const buscar = q.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const resultados = disponibles.filter((p) => {
    if (!buscar) return true;
    const pajar = [p.titulo, p.director, p.anio].join(" ").toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "");
    return pajar.indexOf(buscar) !== -1;
  });

  if (!banco.length) {
    return <p className="letra-chica">El banco está vacío. Cada película que agregues queda guardada acá para los próximos ciclos.</p>;
  }

  return (
    <div className="banco">
      <div className="campo">
        <label>Buscar en el banco ({plural(disponibles.length, "película disponible", "películas disponibles")})</label>
        <input type="search" value={q} placeholder="Título, director o año"
               onChange={(e) => setQ(e.target.value)} />
      </div>
      <ul className="banco-lista">
        {resultados.map((p) => (
          <li key={clavePelicula(p)}>
            <span className="banco-miniatura">
              {p.imagen_url ? <img src={p.imagen_url} alt="" loading="lazy" /> : null}
            </span>
            <span className="banco-datos">
              <strong>{p.titulo}</strong>
              <span>{[p.director, p.anio].filter(Boolean).join(" · ")}</span>
            </span>
            <button type="button" className="boton-suave chico" onClick={() => onElegir(fichaLimpia(p))}>
              Agregar
            </button>
          </li>
        ))}
        {!resultados.length && <li className="banco-nada">Nada coincide con esa búsqueda.</li>}
      </ul>
    </div>
  );
}

/* Formulario para una película que todavía no está en el banco */
function FormularioPelicula({ onAgregar }) {
  const vacia = { titulo: "", director: "", anio: "", imagen_url: "", enlace_url: "" };
  const [peli, setPeli] = useState(vacia);
  const setP = (k) => (e) => setPeli(Object.assign({}, peli, { [k]: e.target.value }));
  return (
    <details className="pelicula-nueva">
      <summary>Agregar una película que no está en el banco</summary>
      <div className="campos-fila">
        <div className="campo"><label>Título</label>
          <input type="text" value={peli.titulo} onChange={setP("titulo")} /></div>
        <div className="campo"><label>Director</label>
          <input type="text" value={peli.director} onChange={setP("director")} /></div>
        <div className="campo"><label>Año</label>
          <input type="number" value={peli.anio} onChange={setP("anio")} /></div>
      </div>
      <div className="campos-fila">
        <div className="campo"><label>URL de la imagen</label>
          <input type="url" value={peli.imagen_url} onChange={setP("imagen_url")} /></div>
        <div className="campo"><label>Enlace de la película</label>
          <input type="url" value={peli.enlace_url} onChange={setP("enlace_url")} /></div>
      </div>
      <button type="button" className="boton-suave"
              onClick={async () => {
                if (!peli.titulo.trim()) return;
                const ok = await onAgregar(peli);
                if (ok !== false) setPeli(vacia);
              }}>Agregar película</button>
      <p className="letra-chica">Queda guardada en el banco para los próximos ciclos.</p>
    </details>
  );
}

function CajonCiclo({ ciclos, peliculasTodas, banco, onAbrir, onCancelar }) {
  const vacio = { nombre: "", inicio: "", fin: "", descripcion: "", organizacion: "" };
  const [d, setD] = useState(vacio);
  const [origen, setOrigen] = useState("");
  const [pelis, setPelis] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const set = (k) => (e) => setD(Object.assign({}, d, { [k]: e.target.value }));

  const ordenados = ciclos.slice().sort((a, b) =>
    String(b.creado_en || "").localeCompare(String(a.creado_en || "")));

  function clonarDe(id) {
    setOrigen(id);
    if (!id) { setD(vacio); setPelis([]); return; }
    const c = ciclos.filter((x) => x.id === id)[0];
    if (!c) return;
    setD({
      nombre: c.nombre, inicio: "", fin: "",
      descripcion: c.descripcion || "", organizacion: c.organizacion_sugerida || ""
    });
    setPelis(peliculasTodas.filter((p) => p.ciclo_id === id).map(fichaLimpia));
  }

  async function enviar(e) {
    e.preventDefault();
    if (enviando || !d.nombre.trim()) return;
    setEnviando(true);
    try { await onAbrir(d, pelis); } finally { setEnviando(false); }
  }

  return (
    <form className="cajon" onSubmit={enviar}>
      <p className="cajon-aviso">
        Al confirmar, el ciclo que esté abierto se cierra y aparece su divisor en el muro.
        Los comentarios nuevos empiezan a colgar del ciclo que estás creando.
      </p>
      {ciclos.length > 0 && (
        <div className="campo clonar">
          <label>Partir de un ciclo existente</label>
          <select value={origen} onChange={(e) => clonarDe(e.target.value)}>
            <option value="">Empezar en blanco</option>
            {ordenados.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}{c.fecha_inicio ? " · " + rangoFechas(c.fecha_inicio, c.fecha_fin) : ""}
              </option>
            ))}
          </select>
          {origen && (
            <p className="letra-chica">
              Se copiaron el nombre, la descripción, la organización y las películas.
              Las fechas quedan en blanco para que pongas las del ciclo nuevo.
              Los comentarios no se copian.
            </p>
          )}
        </div>
      )}
      <div className="campo">
        <label>Nombre del ciclo</label>
        <input type="text" value={d.nombre} onChange={set("nombre")} maxLength="120" />
      </div>
      <div className="campos-fila">
        <div className="campo">
          <label>Fecha de inicio</label>
          <input type="date" value={d.inicio} onChange={set("inicio")} />
        </div>
        <div className="campo">
          <label>Fecha de finalización</label>
          <input type="date" value={d.fin} onChange={set("fin")} />
        </div>
      </div>
      <div className="campo">
        <label>Descripción (una línea, opcional)</label>
        <input type="text" value={d.descripcion} onChange={set("descripcion")} maxLength="200" />
      </div>
      <div className="campo">
        <label>Organización sugerida</label>
        <input type="text" value={d.organizacion} onChange={set("organizacion")} maxLength="100" />
        <p className="letra-chica">Llega prellenada en el formulario. Cada persona puede cambiarla.</p>
      </div>

      <h4 className="sub">Películas del ciclo nuevo</h4>
      {pelis.length === 0 && <p className="letra-chica">Todavía sin películas. Puedes agregarlas ahora o después.</p>}
      <ul className="lista-peliculas">
        {pelis.map((p, i) => (
          <li key={clavePelicula(p) + i}>
            <span>{p.titulo}{p.anio ? " (" + p.anio + ")" : ""}{p.director ? " · " + p.director : ""}</span>
            <button type="button" className="mini"
                    onClick={() => setPelis(pelis.filter((_, j) => j !== i))}>Quitar</button>
          </li>
        ))}
      </ul>
      <BuscadorBanco banco={banco} yaEstan={pelis}
                     onElegir={(p) => setPelis(pelis.concat([p]))} />
      <FormularioPelicula onAgregar={async (p) => setPelis(pelis.concat([fichaLimpia(p)]))} />

      <div className="modal-botones">
        <button type="button" className="boton-suave" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="boton-principal" disabled={enviando}>
          {enviando ? "Abriendo…" : "Empezar el ciclo"}
        </button>
      </div>
    </form>
  );
}

function FichaCiclo({ ciclo, peliculas, banco, cantidad, esActivo, api }) {
  const [d, setD] = useState({
    nombre: ciclo.nombre,
    fecha_inicio: ciclo.fecha_inicio || "",
    fecha_fin: ciclo.fecha_fin || "",
    descripcion: ciclo.descripcion || "",
    organizacion_sugerida: ciclo.organizacion_sugerida || ""
  });
  const set = (k) => (e) => setD(Object.assign({}, d, { [k]: e.target.value }));

  return (
    <div className={"ficha" + (esActivo ? " ficha-activa" : "")}>
      <p className="ficha-estado">
        {esActivo ? "Ciclo activo" : "Ciclo cerrado"} · {plural(cantidad, "comentario", "comentarios")}
      </p>
      <div className="campo">
        <label>Nombre</label>
        <input type="text" value={d.nombre} onChange={set("nombre")} />
      </div>
      <div className="campos-fila">
        <div className="campo">
          <label>Inicio</label>
          <input type="date" value={d.fecha_inicio} onChange={set("fecha_inicio")} />
        </div>
        <div className="campo">
          <label>Finalización</label>
          <input type="date" value={d.fecha_fin} onChange={set("fecha_fin")} />
        </div>
      </div>
      <div className="campo">
        <label>Descripción</label>
        <input type="text" value={d.descripcion} onChange={set("descripcion")} />
      </div>
      <div className="campo">
        <label>Organización sugerida</label>
        <input type="text" value={d.organizacion_sugerida} onChange={set("organizacion_sugerida")} />
      </div>
      <button type="button" className="boton-principal"
              onClick={() => api.guardarCiclo(ciclo.id, d)}>Guardar cambios</button>

      <h4 className="sub">Películas del ciclo</h4>
      {peliculas.length === 0 && <p className="letra-chica">Todavía sin películas.</p>}
      <ul className="lista-peliculas">
        {peliculas.map((p) => (
          <li key={p.id}>
            <span>{p.titulo}{p.anio ? " (" + p.anio + ")" : ""}{p.director ? " · " + p.director : ""}</span>
            <button type="button" className="mini" onClick={() => api.borrarPelicula(p.id)}>Quitar</button>
          </li>
        ))}
      </ul>
      <BuscadorBanco banco={banco} yaEstan={peliculas}
                     onElegir={(p) => api.agregarPelicula(ciclo.id, p, peliculas.length)} />
      <FormularioPelicula onAgregar={(p) => api.agregarPelicula(ciclo.id, p, peliculas.length)} />

      {!esActivo && (
        <button type="button" className="mini peligro"
                onClick={() => api.borrarCiclo(ciclo, cantidad)}>Eliminar este ciclo</button>
      )}
    </div>
  );
}

function EditorComentario({ comentario, onGuardar, onCancelar }) {
  const [d, setD] = useState({
    nombre: comentario.nombre, cargo: comentario.cargo,
    organizacion: comentario.organizacion, texto: comentario.texto
  });
  const set = (k) => (e) => setD(Object.assign({}, d, { [k]: e.target.value }));
  return (
    <div>
      <div className="campos-fila">
        <div className="campo"><label>Nombre</label><input type="text" value={d.nombre} onChange={set("nombre")} /></div>
        <div className="campo"><label>Cargo</label><input type="text" value={d.cargo} onChange={set("cargo")} /></div>
        <div className="campo"><label>Organización</label><input type="text" value={d.organizacion} onChange={set("organizacion")} /></div>
      </div>
      <div className="campo"><label>Comentario</label>
        <textarea rows="4" value={d.texto} onChange={set("texto")} /></div>
      <p className="letra-chica">La calificación con estrellas no se edita: si el comentario no debería estar, va a la papelera.</p>
      <p className="fila-acciones">
        <button type="button" className="boton-suave" onClick={onCancelar}>Cancelar</button>
        <button type="button" className="boton-principal" onClick={() => onGuardar(d)}>Guardar</button>
      </p>
    </div>
  );
}

function Panel({ estado, api, onSalir, onCerrarPanel }) {
  const [pestana, setPestana] = useState("ciclos");
  const [cajon, setCajon] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [editando, setEditando] = useState(null);
  const [cfg, setCfg] = useState(estado.config);

  useEffect(() => { setCfg(estado.config); }, [estado.config]);

  const vivos = estado.comentarios.filter((c) => !c.eliminado);
  const banco = useMemo(() => bancoDe(estado.peliculas), [estado.peliculas]);
  const papelera = estado.comentarios.filter((c) => c.eliminado);
  const listaFiltrada = filtro === "todos"
    ? vivos
    : vivos.filter((c) => (c.ciclo_id || "sin") === filtro);

  const pestanas = [
    ["ciclos", "Ciclos"],
    ["comentarios", "Comentarios"],
    ["papelera", "Papelera (" + papelera.length + ")"],
    ["encabezado", "Encabezado"],
    ["exportar", "Exportar"]
  ];

  return (
    <div className="capa capa-panel">
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-cabeza">
          <h2>Administración</h2>
          <div>
            <button type="button" className="boton-suave" onClick={onSalir}>Salir del modo administrador</button>
            <button type="button" className="boton-suave" onClick={onCerrarPanel}>Ver el muro</button>
          </div>
        </header>

        <nav className="pestanas">
          {pestanas.map(([id, texto]) => (
            <button key={id} type="button"
                    className={pestana === id ? "pestana activa" : "pestana"}
                    onClick={() => setPestana(id)}>{texto}</button>
          ))}
        </nav>

        <div className="panel-cuerpo">

          {pestana === "ciclos" && (
            <div>
              {!cajon && (
                <button type="button" className="boton-principal grande"
                        onClick={() => setCajon(true)}>Empezar nuevo ciclo</button>
              )}
              {cajon && (
                <CajonCiclo ciclos={estado.ciclos} peliculasTodas={estado.peliculas} banco={banco}
                            onCancelar={() => setCajon(false)}
                            onAbrir={async (d, pelis) => {
                              if (await api.abrirCiclo(d, pelis)) setCajon(false);
                            }} />
              )}

              {estado.config.ciclo_activo_id && (
                <button type="button" className="mini peligro"
                        onClick={api.cerrarCiclo}>Cerrar la recepción sin abrir otro ciclo</button>
              )}

              {estado.ciclos.map((c) => (
                <FichaCiclo key={c.id} ciclo={c} api={api} banco={banco}
                            esActivo={c.id === estado.config.ciclo_activo_id}
                            cantidad={vivos.filter((x) => x.ciclo_id === c.id).length}
                            peliculas={estado.peliculas.filter((p) => p.ciclo_id === c.id)} />
              ))}
              {!estado.ciclos.length && (
                <p className="letra-chica">Todavía no hay ciclos. El primero abre el muro.</p>
              )}
            </div>
          )}

          {pestana === "comentarios" && (
            <div>
              <div className="campo">
                <label>Filtrar por ciclo</label>
                <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                  <option value="todos">Todos los ciclos</option>
                  {estado.ciclos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  <option value="sin">Sin ciclo</option>
                </select>
              </div>
              {listaFiltrada.map((c) => (
                <div className="fila-admin" key={c.id}>
                  {editando === c.id ? (
                    <EditorComentario comentario={c}
                                      onCancelar={() => setEditando(null)}
                                      onGuardar={async (d) => { await api.guardarComentario(c.id, d); setEditando(null); }} />
                  ) : (
                    <div>
                      <p className="fila-quien">
                        <strong>{c.nombre}</strong> · {c.cargo} · {c.organizacion}
                        <span className="fila-estrellas"><Estrellas valor={c.estrellas} tamano={14} /></span>
                      </p>
                      <p className="fila-texto">{c.texto}</p>
                      <p className="fila-acciones">
                        <button type="button" className="mini" onClick={() => setEditando(c.id)}>Editar</button>
                        <button type="button" className="mini" onClick={() => api.aPapelera(c)}>A la papelera</button>
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {!listaFiltrada.length && <p className="letra-chica">Nada por acá.</p>}
            </div>
          )}

          {pestana === "papelera" && (
            <div>
              <p className="letra-chica">Lo que está en la papelera no se ve en el muro ni cuenta para los promedios.</p>
              {papelera.map((c) => (
                <div className="fila-admin" key={c.id}>
                  <p className="fila-quien"><strong>{c.nombre}</strong> · {c.cargo} · {c.organizacion}</p>
                  <p className="fila-texto">{c.texto}</p>
                  <p className="fila-acciones">
                    <button type="button" className="mini" onClick={() => api.restaurar(c)}>Restaurar</button>
                    <button type="button" className="mini peligro" onClick={() => api.borrarDefinitivo(c)}>Eliminar definitivamente</button>
                  </p>
                </div>
              ))}
              {!papelera.length && <p className="letra-chica">La papelera está vacía.</p>}
            </div>
          )}

          {pestana === "encabezado" && (
            <div>
              <div className="campo"><label>Título del muro</label>
                <input type="text" value={cfg.titulo_muro}
                       onChange={(e) => setCfg(Object.assign({}, cfg, { titulo_muro: e.target.value }))} /></div>
              <div className="campo"><label>Pregunta destacada</label>
                <input type="text" value={cfg.pregunta}
                       onChange={(e) => setCfg(Object.assign({}, cfg, { pregunta: e.target.value }))} /></div>
              <div className="campo"><label>Entradilla</label>
                <textarea rows="4" value={cfg.entradilla}
                          onChange={(e) => setCfg(Object.assign({}, cfg, { entradilla: e.target.value }))} /></div>
              <div className="campo"><label>Pie del muro</label>
                <input type="text" value={cfg.pie}
                       onChange={(e) => setCfg(Object.assign({}, cfg, { pie: e.target.value }))} /></div>
              <button type="button" className="boton-principal"
                      onClick={() => api.guardarConfig(cfg)}>Guardar el encabezado</button>
            </div>
          )}

          {pestana === "exportar" && (
            <div>
              <p className="letra-chica">
                El archivo se abre en Excel con las tildes correctas. Arriba lleva el resumen del ciclo:
                promedio, cantidad de voces y distribución de estrellas.
              </p>
              <div className="campo">
                <label>Ciclo a exportar</label>
                <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                  <option value="todos">Todos los ciclos</option>
                  {estado.ciclos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <button type="button" className="boton-principal"
                      onClick={() => api.exportar(filtro)}>Descargar CSV</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


/* ------------------------------------------------------------
   Aplicación
   ------------------------------------------------------------ */

function App() {
  const db = useMemo(() => {
    if (faltaConfigurar()) return null;
    return supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  }, []);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [config, setConfig] = useState(null);
  const [ciclos, setCiclos] = useState([]);
  const [peliculas, setPeliculas] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [reacciones, setReacciones] = useState([]);
  const [sesion, setSesion] = useState(false);
  const [pidiendoPin, setPidiendoPin] = useState(false);
  const [verPanel, setVerPanel] = useState(false);
  /* Vista de cada ciclo cerrado: carrusel (por defecto) o muro */
  const [vistas, setVistas] = useState({});
  const alternarVista = (id) =>
    setVistas(Object.assign({}, vistas, { [id]: vistas[id] === "muro" ? "carrusel" : "muro" }));
  const [recienPublicado, setRecienPublicado] = useState(false);

  async function cargar() {
    setError("");
    try {
      const [rc, rci, rp, rcom, rre] = await Promise.all([
        db.from("configuracion").select("*").eq("id", 1).single(),
        db.from("ciclos").select("*"),
        db.from("peliculas").select("*").order("orden", { ascending: true }),
        db.from("comentarios").select("*").order("creado_en", { ascending: false }),
        db.from("reacciones").select("*")
      ]);
      if (rc.error) throw rc.error;
      setConfig(rc.data);
      setCiclos(rci.data || []);
      setPeliculas(rp.data || []);
      setComentarios(rcom.data || []);
      setReacciones(rre.data || []);
    } catch (e) {
      setError("No pudimos cargar el muro. Revisa la conexión y vuelve a intentarlo.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (!db) { setCargando(false); return; }
    db.auth.getSession().then(({ data }) => {
      setSesion(!!(data && data.session));
      cargar();
    });
    if (window.location.hash === "#admin") setPidiendoPin(true);
    const alCambiarHash = () => {
      if (window.location.hash === "#admin") setPidiendoPin(true);
    };
    window.addEventListener("hashchange", alCambiarHash);
    return () => window.removeEventListener("hashchange", alCambiarHash);
  }, []);

  const cicloActivo = config && config.ciclo_activo_id
    ? ciclos.filter((c) => c.id === config.ciclo_activo_id)[0]
    : null;

  const cerrados = useMemo(() => {
    const activo = config ? config.ciclo_activo_id : null;
    return ciclos
      .filter((c) => c.id !== activo)
      .sort((a, b) => {
        const fa = a.cerrado_en || a.fecha_fin || a.creado_en;
        const fb = b.cerrado_en || b.fecha_fin || b.creado_en;
        return String(fb).localeCompare(String(fa));
      });
  }, [ciclos, config]);

  const porComentario = useMemo(() => {
    const mapa = {};
    reacciones.forEach((r) => {
      if (!mapa[r.comentario_id]) mapa[r.comentario_id] = [];
      mapa[r.comentario_id].push(r);
    });
    return mapa;
  }, [reacciones]);

  const visibles = comentarios.filter((c) => !c.eliminado);
  const sinCiclo = visibles.filter((c) => !c.ciclo_id);

  /* --- acciones --- */

  async function publicar(datos) {
    const { data, error: err } = await db.rpc("crear_comentario", datos);
    if (err) throw new Error(err.message);
    setComentarios([data].concat(comentarios));
    setRecienPublicado(true);
  }

  async function alternarReaccion(comentarioId, emoji) {
    const mia = reacciones.some(
      (r) => r.comentario_id === comentarioId && r.emoji === emoji && r.huella === HUELLA);

    /* Respuesta inmediata; si el servidor falla, se revierte */
    const antes = reacciones;
    setReacciones(mia
      ? reacciones.filter((r) => !(r.comentario_id === comentarioId && r.emoji === emoji && r.huella === HUELLA))
      : reacciones.concat([{ id: "temp-" + Date.now(), comentario_id: comentarioId, emoji: emoji, huella: HUELLA }]));

    const { error: err } = await db.rpc("alternar_reaccion", {
      p_comentario: comentarioId, p_emoji: emoji, p_huella: HUELLA
    });
    if (err) setReacciones(antes);
  }

  async function entrar(pin) {
    const { error: err } = await db.auth.signInWithPassword({
      email: CFG.ADMIN_EMAIL, password: pin
    });
    if (err) throw err;
    setSesion(true);
    setPidiendoPin(false);
    setVerPanel(true);
    await cargar();
  }

  async function salir() {
    await db.auth.signOut();
    setSesion(false);
    setVerPanel(false);
    if (window.location.hash === "#admin") window.location.hash = "";
    await cargar();
  }

  const api = {
    abrirCiclo: async (d, pelis) => {
      const { data: nuevo, error: err } = await db.rpc("abrir_ciclo", {
        p_nombre: d.nombre,
        p_fecha_inicio: d.inicio || null,
        p_fecha_fin: d.fin || null,
        p_descripcion: d.descripcion || "",
        p_organizacion: d.organizacion || ""
      });
      if (err) { alert("No se pudo abrir el ciclo: " + err.message); return false; }
      const nuevoId = nuevo && (nuevo.id || (nuevo[0] && nuevo[0].id));
      if (nuevoId && pelis && pelis.length) {
        const { error: errP } = await db.from("peliculas").insert(pelis.map((p, i) => ({
          ciclo_id: nuevoId, titulo: p.titulo, director: p.director || "",
          anio: p.anio ? Number(p.anio) : null,
          imagen_url: p.imagen_url || "", enlace_url: p.enlace_url || "", orden: i
        })));
        if (errP) alert("El ciclo quedó abierto, pero no se pudieron copiar las películas: " + errP.message +
                        "\nPuedes agregarlas desde su ficha.");
      }
      await cargar();
      return true;
    },
    cerrarCiclo: async () => {
      if (!confirm("El muro deja de recibir comentarios hasta que abras otro ciclo. ¿Continuamos?")) return;
      const { error: err } = await db.rpc("cerrar_ciclo_actual");
      if (err) return alert("No se pudo cerrar: " + err.message);
      await cargar();
    },
    guardarCiclo: async (id, d) => {
      const { error: err } = await db.from("ciclos").update({
        nombre: d.nombre,
        fecha_inicio: d.fecha_inicio || null,
        fecha_fin: d.fecha_fin || null,
        descripcion: d.descripcion,
        organizacion_sugerida: d.organizacion_sugerida
      }).eq("id", id);
      if (err) return alert("No se pudo guardar: " + err.message);
      await cargar();
    },
    borrarCiclo: async (ciclo, cantidad) => {
      const aviso = cantidad
        ? "Este ciclo tiene " + plural(cantidad, "comentario", "comentarios") +
          ". No se borran: quedan al fondo del muro, sin ciclo. Esto no se puede deshacer."
        : "Se elimina el ciclo y sus películas. Esto no se puede deshacer.";
      if (!confirm(aviso)) return;
      const { error: err } = await db.from("ciclos").delete().eq("id", ciclo.id);
      if (err) return alert("No se pudo eliminar: " + err.message);
      await cargar();
    },
    agregarPelicula: async (cicloId, p, orden) => {
      const { error: err } = await db.from("peliculas").insert({
        ciclo_id: cicloId, titulo: p.titulo, director: p.director,
        anio: p.anio ? Number(p.anio) : null,
        imagen_url: p.imagen_url, enlace_url: p.enlace_url, orden: orden
      });
      if (err) { alert("No se pudo agregar: " + err.message); return false; }
      await cargar();
      return true;
    },
    borrarPelicula: async (id) => {
      if (!confirm("¿Quitar esta película del ciclo?")) return;
      await db.from("peliculas").delete().eq("id", id);
      await cargar();
    },
    guardarComentario: async (id, d) => {
      const { error: err } = await db.from("comentarios").update({
        nombre: d.nombre, cargo: d.cargo, organizacion: d.organizacion, texto: d.texto
      }).eq("id", id);
      if (err) return alert("No se pudo guardar: " + err.message);
      await cargar();
    },
    aPapelera: async (c) => {
      await db.from("comentarios").update({ eliminado: true }).eq("id", c.id);
      await cargar();
    },
    restaurar: async (c) => {
      await db.from("comentarios").update({ eliminado: false }).eq("id", c.id);
      await cargar();
    },
    borrarDefinitivo: async (c) => {
      if (!confirm("Se elimina para siempre el comentario de " + c.nombre + ". Esto no se puede deshacer.")) return;
      await db.from("comentarios").delete().eq("id", c.id);
      await cargar();
    },
    guardarConfig: async (c) => {
      const { error: err } = await db.from("configuracion").update({
        titulo_muro: c.titulo_muro, pregunta: c.pregunta,
        entradilla: c.entradilla, pie: c.pie
      }).eq("id", 1);
      if (err) return alert("No se pudo guardar: " + err.message);
      await cargar();
    },
    exportar: (filtro) => {
      const lista = comentarios.filter((c) => !c.eliminado &&
        (filtro === "todos" || c.ciclo_id === filtro));
      if (!lista.length) return alert("No hay comentarios para exportar.");
      const nombreCiclo = filtro === "todos"
        ? "Todos los ciclos"
        : (ciclos.filter((c) => c.id === filtro)[0] || {}).nombre;
      const prom = promedioDe(lista);
      const dist = [1, 2, 3, 4, 5].map((n) =>
        n + " estrella" + (n === 1 ? "" : "s") + ": " + lista.filter((c) => c.estrellas === n).length);
      const resumen = [
        "Muro Liderazgo en Escena",
        "Ciclo," + nombreCiclo,
        "Promedio," + (prom === null ? "sin datos" : prom.toFixed(1)),
        "Voces," + lista.length,
        "Distribución," + dist.join(" | ")
      ].join("\n");
      const filas = lista.map((c) => ({
        ciclo: (ciclos.filter((x) => x.id === c.ciclo_id)[0] || {}).nombre || "",
        fecha: fechaLarga(c.creado_en),
        nombre: c.nombre, cargo: c.cargo, organizacion: c.organizacion,
        estrellas: c.estrellas,
        reacciones: (porComentario[c.id] || []).length,
        comentario: c.texto
      }));
      exportarCSV(filas, "muro-liderazgo-en-escena", resumen);
    }
  };

  /* --- estados de pantalla --- */

  if (!db) {
    return (
      <div className="mensaje-central">
        <h1>Falta un paso de configuración</h1>
        <p>El archivo <code>config.js</code> todavía tiene los valores de ejemplo.
           Ábrelo y pega la dirección del proyecto de Supabase y la clave Publishable.</p>
      </div>
    );
  }

  if (cargando) return <div className="mensaje-central"><p className="cargando">Abriendo el muro…</p></div>;

  if (error) {
    return (
      <div className="mensaje-central">
        <h1>No pudimos cargar el muro</h1>
        <p>{error}</p>
        <button type="button" className="boton-principal" onClick={() => { setCargando(true); cargar(); }}>
          Volver a intentar
        </button>
      </div>
    );
  }

  const totalVoces = visibles.length;
  const promGeneral = promedioDe(visibles);

  /* Tramos de la línea de tiempo, en el mismo orden que el muro */
  const tramos = []
    .concat(cicloActivo ? [{
      id: "ciclo-" + cicloActivo.id, activo: true, cuando: "Ciclo actual",
      nombre: cicloActivo.nombre, corto: cicloActivo.organizacion_sugerida,
      voces: visibles.filter((c) => c.ciclo_id === cicloActivo.id).length
    }] : [])
    .concat(cerrados.map((c) => ({
      id: "ciclo-" + c.id, activo: false, cuando: mesDe(c), nombre: c.nombre,
      corto: c.organizacion_sugerida,
      voces: visibles.filter((x) => x.ciclo_id === c.id).length
    })))
    .concat(sinCiclo.length ? [{
      id: "ciclo-sin", activo: false, cuando: "Antes", nombre: "Comentarios sin ciclo", corto: "Sin ciclo",
      voces: sinCiclo.length
    }] : []);
  const hayLinea = tramos.length > 1;

  return (
    <div className={"envoltura" + (hayLinea ? " con-linea" : "")}>
      {hayLinea && <LineaTiempo tramos={tramos} />}
      <div className="contenido">

      <header className="encabezado">
        <p className="marca">{config.titulo_muro}</p>
        <h1 className="pregunta">{config.pregunta}</h1>
        <div className="confeti" aria-hidden="true">
          {COLORES.map((c, i) => <span key={i} style={{ background: c.vivo }} />)}
        </div>
        <p className="entradilla">{config.entradilla}</p>

        {cicloActivo && (
          <div className="ciclo-actual" id={"ciclo-" + cicloActivo.id}>
            <p className="ciclo-etiqueta">Ciclo actual</p>
            <h2 className="ciclo-nombre">{cicloActivo.nombre}</h2>
            {rangoFechas(cicloActivo.fecha_inicio, cicloActivo.fecha_fin) &&
              <p className="ciclo-fechas">{rangoFechas(cicloActivo.fecha_inicio, cicloActivo.fecha_fin)}</p>}
            {cicloActivo.descripcion && <p className="ciclo-desc">{cicloActivo.descripcion}</p>}
            <TiraPeliculas peliculas={peliculas.filter((p) => p.ciclo_id === cicloActivo.id)} />
          </div>
        )}

        {totalVoces > 0 && (
          <p className="resumen-general">
            <Nota promedio={promGeneral} votos={totalVoces} />
          </p>
        )}
      </header>

      <main>
        {cicloActivo ? (
          <Formulario ciclo={cicloActivo} onPublicar={publicar} recienPublicado={recienPublicado} />
        ) : (
          <p className="gracias">
            La recepción está cerrada por ahora. Puedes seguir leyendo lo que dejaron los ciclos anteriores.
          </p>
        )}

        {cicloActivo && (
          <Rejilla comentarios={visibles.filter((c) => c.ciclo_id === cicloActivo.id)}
                   porComentario={porComentario} esAdmin={sesion}
                   onPapelera={api.aPapelera} onEditar={() => setVerPanel(true)}
                   onReaccion={alternarReaccion}
                   vacio="Todavía no hay comentarios en este ciclo. El primero abre la conversación." />
        )}

        {cerrados.map((c) => (
          <BloqueCerrado key={c.id} id={"ciclo-" + c.id} etiqueta="Ciclo cerrado" nombre={c.nombre} ciclo={c}
                         peliculas={peliculas.filter((p) => p.ciclo_id === c.id)}
                         comentarios={visibles.filter((x) => x.ciclo_id === c.id)}
                         vacio="Este ciclo cerró sin comentarios."
                         enMuro={vistas[c.id] === "muro"}
                         onCambiarVista={() => alternarVista(c.id)}
                         porComentario={porComentario} esAdmin={sesion}
                         onPapelera={api.aPapelera} onEditar={() => setVerPanel(true)}
                         onReaccion={alternarReaccion} />
        ))}

        {sinCiclo.length > 0 && (
          <BloqueCerrado id="ciclo-sin" etiqueta="Sin ciclo" nombre="Comentarios anteriores"
                         ciclo={{ descripcion: plural(sinCiclo.length, "comentario", "comentarios") +
                                               " que quedaron fuera de un ciclo." }}
                         comentarios={sinCiclo} vacio=""
                         enMuro={vistas.sin === "muro"}
                         onCambiarVista={() => alternarVista("sin")}
                         porComentario={porComentario} esAdmin={sesion}
                         onPapelera={api.aPapelera} onEditar={() => setVerPanel(true)}
                         onReaccion={alternarReaccion} />
        )}
      </main>

      <footer className="pie">
        <p>{config.pie}</p>
        {sesion ? (
          <button type="button" className="engranaje" onClick={() => setVerPanel(true)}
                  aria-label="Abrir el panel de administración">Administrar</button>
        ) : (
          <button type="button" className="engranaje" onClick={() => setPidiendoPin(true)}
                  title="Acceso de administrador"
                  aria-label="Acceso de administrador">
            <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" className="ico">
              <circle cx="12" cy="12" r="3.1"/>
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1.1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.11A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.11A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.09a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.49 1.03z"/>
            </svg>
          </button>
        )}
      </footer>
      </div>

      {pidiendoPin && <ModalPin onEntrar={entrar} onCerrar={() => setPidiendoPin(false)} />}

      {sesion && verPanel && (
        <Panel estado={{ config, ciclos, peliculas, comentarios }} api={api}
               onSalir={salir} onCerrarPanel={() => setVerPanel(false)} />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("raiz")).render(<App />);
