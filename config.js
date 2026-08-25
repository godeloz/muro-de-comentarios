/* ============================================================
   MURO LIDERAZGO EN ESCENA · Configuración
   ------------------------------------------------------------
   Este es el ÚNICO archivo que hay que editar.
   Los títulos, la pregunta, la entradilla y el pie NO van acá:
   se editan desde el panel de administración, sin tocar código.
   ============================================================ */

window.CONFIG = {

  /* 1 · URL del proyecto de Supabase.
        Supabase → Project Settings → Data API → Project URL
        Se ve así:  https://abcdefghijk.supabase.co            */
  SUPABASE_URL: "https://eblfzdlffquhotjyxfif.supabase.co",

  /* 2 · Clave pública (Publishable key).
        Supabase → Project Settings → API Keys
                 → "Publishable and secret API keys"
                 → sección "Publishable key" → fila "default"
        Empieza con  sb_publishable_...

        Esta clave ESTÁ PENSADA para ser pública.
        La "Secret key" (sb_secret_...) NO va acá jamás.       */
  SUPABASE_ANON_KEY: "sb_publishable_k-erPXZV9wXthyyGRRW4tw_NNmCbduk",

  /* 3 · Correo del usuario administrador creado en Supabase.
        La contraseña de ese usuario es el PIN, y no se
        escribe acá: se pide en pantalla.                      */
  ADMIN_EMAIL: "godeloz@gmail.com"

};
