/* ============================================================
   MURO LIDERAZGO EN ESCENA · Recursos incrustados
   ------------------------------------------------------------
   Doce íconos de trazo, doce colores y diez reacciones.

   Los íconos y los colores se reparten en dos barajas
   independientes: 144 combinaciones antes de repetir una tarjeta.
   Las estrellas de cada tarjeta toman el color de su tarjeta,
   así que el muro lleno se ve como una fiesta y no como un
   formulario.
   ============================================================ */

window.DATOS = {

  /* Íconos 0 a 11 · contenido interno de un <svg viewBox="0 0 24 24"> */
  ICONOS: [

    /* 00 · Claqueta */
    '<rect x="3" y="10" width="18" height="10" rx="1.6"/>' +
    '<path d="M3.3 10.2 4.6 5.6 20.9 4 19.8 8.7Z"/>' +
    '<path d="M8.7 5.2 7.2 9.8M13.7 4.7 12.2 9.3M18.6 4.2 17.1 8.8"/>',

    /* 01 · Proyector */
    '<rect x="2.5" y="11.5" width="14" height="6.5" rx="1.6"/>' +
    '<circle cx="7" cy="7.5" r="3.2"/>' +
    '<circle cx="14" cy="9" r="2.1"/>' +
    '<path d="M16.5 13 21 11v6l-4.5-2Z"/>' +
    '<path d="M5 18v2M14 18v2"/>',

    /* 02 · Bobina */
    '<circle cx="12" cy="12" r="8.2"/>' +
    '<circle cx="12" cy="12" r="1.5"/>' +
    '<circle cx="12" cy="7.2" r="1.5"/>' +
    '<circle cx="12" cy="16.8" r="1.5"/>' +
    '<circle cx="7.2" cy="12" r="1.5"/>' +
    '<circle cx="16.8" cy="12" r="1.5"/>',

    /* 03 · Butaca */
    '<path d="M7 12V7.2A2.2 2.2 0 0 1 9.2 5h5.6A2.2 2.2 0 0 1 17 7.2V12"/>' +
    '<rect x="4" y="12" width="16" height="5.2" rx="1.6"/>' +
    '<path d="M7 17.2v3M17 17.2v3"/>',

    /* 04 · Foco */
    '<circle cx="9" cy="10.5" r="5"/>' +
    '<path d="M14.4 10.5H20M13.6 7 18.4 4.6M13.6 14l4.8 2.4"/>' +
    '<path d="M9 15.5V20M6 20h6"/>',

    /* 05 · Boleto */
    '<path d="M4 7h16a1 1 0 0 1 1 1v2.4a1.6 1.6 0 0 0 0 3.2V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2.4a1.6 1.6 0 0 0 0-3.2V8a1 1 0 0 1 1-1Z"/>' +
    '<path d="M14.5 8.4v1.8M14.5 13.8v1.8"/>',

    /* 06 · Megáfono */
    '<path d="M4 10.2 13.5 6.4v11.2L4 13.8Z"/>' +
    '<path d="M6.4 14.7v3.4a1.6 1.6 0 0 0 3.2 0v-2.2"/>' +
    '<path d="M16.6 9.6a4.2 4.2 0 0 1 0 4.8M19.2 7.4a7.4 7.4 0 0 1 0 9.2"/>',

    /* 07 · Pantalla */
    '<rect x="2.6" y="4.6" width="18.8" height="11.2" rx="1.2"/>' +
    '<path d="M5.4 7.4h13.2"/>' +
    '<path d="M12 15.8v3.4M8.4 19.2h7.2"/>',

    /* 08 · Guion */
    '<path d="M6 3.4h8.4L19 8v12.6H6Z"/>' +
    '<path d="M14.4 3.4V8H19"/>' +
    '<path d="M9 12.4h7M9 15.4h7M9 18.4h4"/>',

    /* 09 · Palomitas */
    '<path d="M6.4 9.4 8 20.4h8l1.6-11"/>' +
    '<path d="M7 13.4h10"/>' +
    '<circle cx="8.6" cy="6.8" r="2.3"/>' +
    '<circle cx="12" cy="5.4" r="2.5"/>' +
    '<circle cx="15.6" cy="7" r="2.2"/>',

    /* 10 · Silla de director */
    '<path d="M5.4 5h13.2"/>' +
    '<path d="M6.6 5 9 12.8h6L17.4 5"/>' +
    '<path d="M7.8 9.4h8.4"/>' +
    '<path d="M9 12.8 6 20.4M15 12.8l3 7.6"/>' +
    '<path d="M7.5 16.8h9"/>',

    /* 11 · Telón */
    '<path d="M3 4.2h18"/>' +
    '<path d="M6.4 4.2c0 6-2.4 8.4-2.4 16h5.2c1-8 1-10.4 1-16"/>' +
    '<path d="M17.6 4.2c0 6 2.4 8.4 2.4 16h-5.2c-1-8-1-10.4-1-16"/>'
  ],

  /* Colores 0 a 11
     vivo   · marco de la tarjeta, estrellas, ícono del avatar
     texto  · nombre y datos duros (contraste alto sobre blanco)
     suave  · fondo del avatar y de las reacciones marcadas       */
  COLORES: [
    { vivo: "#FF3B30", texto: "#C1271D", suave: "#FFE9E7" }, /* 00 rojo     */
    { vivo: "#FF9500", texto: "#A85E00", suave: "#FFF1DE" }, /* 01 naranja  */
    { vivo: "#FFC300", texto: "#8A6600", suave: "#FFF7D9" }, /* 02 amarillo */
    { vivo: "#34C759", texto: "#1B7A38", suave: "#E4F8EA" }, /* 03 verde    */
    { vivo: "#00C7BE", texto: "#00736D", suave: "#DCF7F5" }, /* 04 menta    */
    { vivo: "#30B0C7", texto: "#146B7D", suave: "#E0F3F7" }, /* 05 turquesa */
    { vivo: "#32ADE6", texto: "#146A93", suave: "#E1F2FB" }, /* 06 cielo    */
    { vivo: "#007AFF", texto: "#0A5BC4", suave: "#E3F0FF" }, /* 07 azul     */
    { vivo: "#5856D6", texto: "#3B39A6", suave: "#EAE9FB" }, /* 08 índigo   */
    { vivo: "#AF52DE", texto: "#7B2FA0", suave: "#F5E8FC" }, /* 09 violeta  */
    { vivo: "#FF2D78", texto: "#C0164F", suave: "#FFE6EE" }, /* 10 rosa     */
    { vivo: "#FF6482", texto: "#C03050", suave: "#FFE9ED" }  /* 11 coral    */
  ],

  /* Reacciones disponibles. Si cambias esta lista, cambia también
     la lista equivalente dentro de alternar_reaccion() en el SQL:
     el servidor rechaza cualquier emoji que no esté en las dos. */
  REACCIONES: ["💡", "❤️", "😂", "😢", "🙌", "👍", "😮", "🤔", "😍", "🥹"]

};
