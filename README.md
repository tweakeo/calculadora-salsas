# 🧮 Calculadora de Salsas — Chamberí Brothers

Versión **sincronizada con Notion** de la calculadora de salsas (sustituye a la
antigua hardcodeada). Escala cantidades por nº de biberones, calcula coste por
litro y por burger, food cost, y genera nº de lote `CB-AAAAMMDD-NNN` para la DB
**PRODUCCIONES**.

- **Unidad base:** 1 biberón (1 L)
- **Fuente de datos:** Notion (workspace Chamberí) → DBs **RECETAS** (Tipo = 🧂 Salsa) + **INGREDIENTES**
- Misma arquitectura que la calculadora de postres (carpeta hermana).

## 📂 Archivos
| Archivo | Qué es |
|---|---|
| `index.html` | La calculadora (HTML+CSS+JS). Lee `data.js`. |
| `data.js` | Datos generados desde Notion. No editar a mano. |
| `sync-notion.mjs` | Regenera `data.js` desde Notion. |
| `.env` | Tu `NOTION_TOKEN` (no se sube a git). |

## 🔄 Actualizar desde Notion
```bash
cp .env.example .env        # 1ª vez; pega tu NOTION_TOKEN
node sync-notion.mjs        # regenera data.js
git add data.js && git commit -m "sync salsas" && git push
```
Requiere Node 18+. El script lee RECETAS (Tipo = 🧂 Salsa) e INGREDIENTES, y
saca descripción/perfil sensorial/método del cuerpo de cada receta.

## 🌐 Publicar
La calculadora antigua vivía en `tweakeo.github.io/calculadora-salsas` (cuenta
ajena). Para esta versión, sube la carpeta a un repo propio (p. ej.
`LeonMAG/calculadora-salsas`) → Settings → Pages → branch `main`, y actualiza el
**embed** en la página de Notion *LABORATORIO DE SALSAS* a la nueva URL.

## ⚠️ Estado de los datos en Notion (a fecha del último sync)
La migración dejó las salsas con datos **incompletos**; la calculadora ya avisa
con `coste ej.` donde toca. Pendiente de arreglar en Notion:
- **Costes**: la mayoría de ingredientes no tienen coste real (falta `CANT. PACK`
  en INVENTARIO). Mientras tanto se usan los costes **validados de la calculadora
  original** (Mayonesa 0,00251 €/g, etc.) como ejemplo.
- **BBQ Ahumada**: las cantidades suman solo ~237 g/L → faltan ingredientes o
  cantidades en su receta. Revisar.
- **Precio Burger** vacío en todas; el food cost se calcula contra **PVP Salsero**
  (0,99 / 1,29 / 1,49 €).
- **Perfil sensorial / método**: las 7 salsas originales tienen perfil de respaldo;
  las 5 nuevas (Alioli, Verde Jalapeño, Kimchi, Mostaza Miel, Blue Cheese) lo
  tomarán del cuerpo de su página en Notion cuando lo tengan.

En cuanto completes esos datos en Notion y ejecutes `node sync-notion.mjs`, la
calculadora se actualiza sola con los valores reales.
