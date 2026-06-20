# 🧮 Calculadora de Salsas — Chamberí Brothers

Versión **sincronizada con Notion** de la calculadora de salsas (sustituye a la
antigua hardcodeada). Escala cantidades por nº de biberones, calcula coste por
litro y por burger, food cost, y genera nº de lote `CB-AAAAMMDD-NNN` para la DB
**PRODUCCIONES**.

- **Unidad base:** 1 biberón (1 L)
- **Fuente de datos:** Notion (workspace Chamberí) → DBs **RECETAS** + **INGREDIENTES**
- Misma arquitectura que la [calculadora de postres](https://tweakeo.github.io/calculadora-postres/) (carpeta hermana).

## ✅ Qué salsas aparecen en la web

Solo aparecen las recetas de la DB **RECETAS** que cumplen **las dos** condiciones:

1. `Tipo = 🧂 Salsa`
2. `ESTADO = DESARROLLADA`

Las salsas en `SIN DESARROLLO` o `DESARROLLANDO` **no se sincronizan** y no se ven
en la calculadora. Para publicar una salsa basta con ponerle `ESTADO = DESARROLLADA`
en Notion (y que tenga sus ingredientes en INGREDIENTES).

## 📂 Archivos
| Archivo | Qué es |
|---|---|
| `index.html` | La calculadora (HTML+CSS+JS). Lee `data.js`. |
| `data.js` | Datos generados desde Notion. No editar a mano. |
| `sync-notion.mjs` | Regenera `data.js` desde Notion. |
| `.github/workflows/sync-notion.yml` | Sincroniza solo en GitHub (programado + manual). |
| `.env` | Tu `NOTION_TOKEN` para correr el sync en local (no se sube a git). |

## 🔄 Cómo se actualiza la web (arquitectura)

> **La web NO consulta Notion en vivo.** GitHub Pages es estático: no puede
> guardar el token de forma segura ni saltarse el CORS de Notion. El patrón es:
> Notion es la fuente de verdad → `sync-notion.mjs` "hornea" un `data.js` →
> la web carga ese `data.js`. **Actualizar = volver a sincronizar + push.**

La sincronización es **siempre manual** (no hay ningún disparo automático). Hay
**3 formas** de lanzarla:

### 1) Botón desde GitHub (instantáneo)
GitHub → pestaña **Actions** → workflow **“Sync desde Notion”** → **Run workflow**.

### 2) Botón desde Notion (ver sección siguiente)
Un botón en Notion que dispara el mismo workflow a través de un pequeño relay.

### 3) Manual desde tu ordenador
```bash
cp .env.example .env        # 1ª vez; pega tu NOTION_TOKEN
node sync-notion.mjs        # regenera data.js
git add data.js && git commit -m "sync salsas" && git push
```
Requiere Node 18+. El secret `NOTION_TOKEN` ya está configurado en GitHub para
los botones de los modos 1 y 2.

## 🟢 Botón “Sincronizar” desde Notion (opcional, instantáneo)

Para disparar la sincronización con un botón dentro de Notion necesitas un
pequeño “relay” que llame a la API de GitHub con autenticación (Notion por sí
solo no puede mandar la cabecera `Authorization`). Endpoint a llamar:

```
POST https://api.github.com/repos/tweakeo/calculadora-salsas/dispatches
Headers: Authorization: Bearer <PAT>   ·   Accept: application/vnd.github+json
Body:    { "event_type": "sync-notion" }
```

Eso dispara el modo (3) `repository_dispatch`. Dos formas de montarlo:

### Opción A — Make.com / Zapier / Pipedream (no-code, recomendada)
1. Crea un escenario con disparador **Webhook** → copia su URL.
2. En Notion: botón (o automatización *Cuando ESTADO → DESARROLLADA → Enviar
   webhook*) que llame a esa URL.
3. En Make/Zapier: paso **HTTP → POST** al endpoint de arriba con
   `Authorization: Bearer <PAT>` y body `{"event_type":"sync-notion"}`.
4. El PAT es un **fine-grained token** de GitHub con *Contents: Read/Write*
   limitado a este repo. Guárdalo en el relay, **nunca en Notion**.

### Opción B — Cloudflare Worker (gratis, self-hosted)
El mismo worker sirve para los dos repos (detecta "salsas"/"postres" por la ruta);
ver el código en el README de la calculadora de postres. El botón de Notion abre
`https://<worker>.workers.dev/salsas?key=<SECRET>`.

> **¿Hace falta el botón de Notion?** No: ya puedes sincronizar a mano con el
> botón de GitHub (modo 1). El botón de Notion solo sirve para no salir de Notion.

## ⚠️ Estado de los datos en Notion (a fecha del último sync)
La calculadora avisa con `coste ej.` donde el coste aún no es real. Pendiente en
Notion: rellenar `CANT. PACK` en INVENTARIO (mientras tanto se usan los costes
validados de la calculadora original), revisar cantidades de **BBQ Ahumada**
(~237 g/L), y `Precio Burger` vacío (el food cost se calcula contra **PVP Salsero**).
En cuanto completes esos datos y vuelvas a sincronizar, se actualiza solo.
