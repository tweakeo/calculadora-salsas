#!/usr/bin/env node
/* ============================================================================
 * sync-notion.mjs — Genera data.js de la CALCULADORA DE SALSAS desde Notion
 * ----------------------------------------------------------------------------
 * Lee RECETAS (Tipo = 🧂 Salsa) + INGREDIENTES del workspace Chamberí y vuelca
 * a ./data.js (lo que consume index.html). Notion = fuente de verdad.
 *
 * Uso:  1) .env con NOTION_TOKEN=ntn_xxx   2) node sync-notion.mjs   3) push
 *
 * Costes: usa "Coste €/unidad" de Notion. Si falta (no hay CANT. PACK en
 * INVENTARIO), aplica el coste VALIDADO de la calculadora original (tabla
 * COSTES_EJEMPLO) y marca el ingrediente con ejemplo:true.
 * Unidad base de la calculadora = 1 biberón (1 L).
 * ========================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NOTION_VERSION = "2025-09-03";
const DS_RECETAS      = "92d2b49c-982b-4b55-8bdb-3a92ccbe41e8";
const DS_INGREDIENTES = "19ea5166-9933-43cb-979b-a14902ead83f";
const LOTE_PREFIX = "CB";   // Chamberí Brothers

// Costes VALIDADOS por ingrediente (€/g o €/ml) — respaldo mientras falten en
// Notion. Tomados de la calculadora original de salsas (datos ya probados).
const COSTES_EJEMPLO = {
  "Mayonesa":0.00251,"Ketchup":0.00160,"Mostaza":0.00300,"Vinagre":0.00200,
  "Azúcar":0.00100,"Azúcar moreno":0.00150,"Limón en polvo":0.01000,
  "Lima en polvo":0.01200,"Ajo en polvo":0.01000,"Cebolla en polvo":0.00800,
  "Mostaza en polvo":0.01200,"Perejil seco":0.04000,"Pimienta negra":0.01600,
  "Glutamato":0.00600,"Agua":0.00000,"Suero de leche":0.00000,"Crema agria":0.00300,
  "Pimentón ahumado":0.00300,"Humo líquido":0.04000,"Cayena en polvo":0.00800,
  "Sriracha":0.00500,"Chipotle en polvo":0.01200,"Aceite de trufa":0.06000,"Sal":0.00050,
};
const COSTE_EJEMPLO_DEFECTO = 0.005;

// Perfil sensorial de respaldo (0–8) para las salsas que aún no lo tengan en el
// cuerpo de su página en Notion. Clave = nombre en MAYÚSCULAS.
const SENSORIAL_EJEMPLO = {
  "PALETOS DELUXE":{Dulzor:2,Acidez:4,Picante:1,Ahumado:0,Umami:3},
  "RANCH CLÁSICA":{Dulzor:1,Acidez:3,Picante:1,Ahumado:0,Umami:2},
  "BBQ AHUMADA":{Dulzor:5,Acidez:3,Picante:1,Ahumado:7,Umami:5},
  "BUFFALO MAYO":{Dulzor:1,Acidez:5,Picante:6,Ahumado:0,Umami:2},
  "SRIRACHA MAYO":{Dulzor:2,Acidez:3,Picante:5,Ahumado:0,Umami:3},
  "CHIPOTLE DELUXE":{Dulzor:2,Acidez:2,Picante:4,Ahumado:6,Umami:5},
  "TRUFADITA":{Dulzor:1,Acidez:1,Picante:0,Ahumado:0,Umami:8},
};

function loadToken(){
  if (process.env.NOTION_TOKEN) return process.env.NOTION_TOKEN;
  const p = path.join(__dirname,".env");
  if (fs.existsSync(p)){ const l=fs.readFileSync(p,"utf8").split("\n").find(x=>x.startsWith("NOTION_TOKEN=")); if(l) return l.slice(13).trim().replace(/^["']|["']$/g,""); }
  console.error("✖ Falta NOTION_TOKEN (.env o variable de entorno)."); process.exit(1);
}
const TOKEN = loadToken();
async function notion(endpoint, body){
  const res = await fetch(`https://api.notion.com/v1/${endpoint}`,{ method:body?"POST":"GET",
    headers:{Authorization:`Bearer ${TOKEN}`,"Notion-Version":NOTION_VERSION,"Content-Type":"application/json"},
    body:body?JSON.stringify(body):undefined });
  if(!res.ok){ console.error(`✖ Notion ${endpoint}: ${res.status} ${await res.text()}`); process.exit(1); }
  return res.json();
}
async function queryAll(ds, filter){ let r=[],c; do{ const d=await notion(`data_sources/${ds}/query`,{...(filter?{filter}:{}),...(c?{start_cursor:c}:{}),page_size:100}); r=r.concat(d.results); c=d.has_more?d.next_cursor:null; }while(c); return r; }
async function blocksOf(id){ let r=[],c; do{ const d=await notion(`blocks/${id}/children${c?`?start_cursor=${c}`:""}`); r=r.concat(d.results); c=d.has_more?d.next_cursor:null; }while(c); return r; }

const plain = rt => (rt||[]).map(t=>t.plain_text).join("");
const num = p => p ? (p.type==="number"?p.number : p.type==="formula"?p.formula?.number : p.type==="rollup"?p.rollup?.number : null) : null;

async function readBody(pageId){
  const blocks = await blocksOf(pageId);
  let notas="", metodo=[], sensorial={}, section="";
  for (const b of blocks){
    if (b.type==="heading_2"){ const h=plain(b.heading_2.rich_text).toUpperCase();
      section = h.includes("DESCRIPCIÓN")?"desc" : h.includes("SENSORIAL")?"sens" : (h.includes("MÉTODO")||h.includes("ELABORACIÓN"))?"met":""; }
    else if (b.type==="paragraph" && section==="desc" && !notas) notas=plain(b.paragraph.rich_text);
    else if (b.type==="numbered_list_item" && section==="met") metodo.push(plain(b.numbered_list_item.rich_text));
    else if (b.type==="table" && section==="sens"){
      for (const r of await blocksOf(b.id)){ if(r.type!=="table_row")continue;
        const k=plain(r.table_row.cells[0]), bar=plain(r.table_row.cells[1]);
        if(!k||k==="Perfil")continue; sensorial[k]=(bar.match(/█/g)||[]).length; }
    }
  }
  return { notas, metodo, sensorial };
}

console.log("→ Leyendo RECETAS (Tipo = 🧂 Salsa)…");
const recetas = await queryAll(DS_RECETAS, { property:"Tipo", select:{ equals:"🧂 Salsa" } });
console.log("→ Leyendo INGREDIENTES…");
const ingredientes = await queryAll(DS_INGREDIENTES);

const ingByRec = {};
for (const ing of ingredientes){
  for (const rel of (ing.properties.RECETAS?.relation||[])){
    const nombre = plain(ing.properties.INGREDIENTE?.title);
    let costeUd = num(ing.properties["Coste €/unidad"]) || 0, ejemplo=false;
    if (!costeUd){ costeUd = COSTES_EJEMPLO[nombre] ?? COSTE_EJEMPLO_DEFECTO; ejemplo=true; }
    (ingByRec[rel.id] ??= []).push({ nombre, cantidad:num(ing.properties["CANTIDAD BASE"]),
      unidad: ing.properties.UNIDAD?.select?.name || plain(ing.properties.UNIDAD?.rich_text) || "g",
      costePorUnidad:costeUd, ...(ejemplo?{ejemplo:true}:{}) });
  }
}

const salsas = [];
for (const r of recetas){
  const p=r.properties, nombre=plain(p.RECETA?.title);
  const body = await readBody(r.id);
  salsas.push({
    id: nombre.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),
    emoji: r.icon?.emoji || "🧂", nombre,
    estado: p["ESTADO"]?.status?.name || "",
    sxb: num(p["SALSA x BURGER (g)"]) || 35,
    rendimiento: num(p["RENDIMIENTO (L)"]) || 1,
    pvpSalsero: num(p["PVP Salsero (€)"]),
    precioBurger: num(p["Precio Burger (€)"]),
    alergenos: (p["ALÉRGENOS"]?.multi_select||[]).map(a=>a.name),
    sensorial: Object.keys(body.sensorial).length ? body.sensorial : (SENSORIAL_EJEMPLO[nombre.toUpperCase()]||{}),
    notas: body.notas, metodo: body.metodo,
    ingredientes: ingByRec[r.id] || [],
  });
}
salsas.sort((a,b)=> a.nombre.localeCompare(b.nombre));

const out = `/* GENERADO por sync-notion.mjs — NO EDITAR. Fuente: Notion · Chamberí · RECETAS+INGREDIENTES. */
window.SALSAS_DATA = ${JSON.stringify({
  _meta:{ fuente:"Notion — DESARROLLO DE SALSAS (Chamberí)", generado:new Date().toISOString().slice(0,10),
    baseUnidad:"1 biberón (1 L)", lotePrefix:LOTE_PREFIX, marca:"Chamberí Brothers",
    nota:"Costes con ejemplo:true son provisionales (faltan en Notion: CANT. PACK)." },
  salsas,
}, null, 2)};
`;
fs.writeFileSync(path.join(__dirname,"data.js"), out, "utf8");
const ej = salsas.flatMap(s=>s.ingredientes).filter(i=>i.ejemplo).length;
console.log(`✔ data.js generado — ${salsas.length} salsas, ${ingredientes.length} líneas de ingredientes.`);
if (ej) console.log(`  ⚠️ ${ej} ingredientes con coste de EJEMPLO (rellena CANT. PACK en Notion para costes reales).`);
