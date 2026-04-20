import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function parseValue(str) {
  if (!str) return 0;
  str = String(str).trim().replace(/\u00a0/g, '').replace(/\s/g, '');
  const m = str.match(/€?([\d.]+)(M|K)?/i);
  if (!m) return 0;
  const num = parseFloat(m[1]);
  if (m[2]?.toUpperCase() === 'M') return Math.round(num * 1_000_000);
  if (m[2]?.toUpperCase() === 'K') return Math.round(num * 1_000);
  return Math.round(num);
}

const POSITION_MAP = {
  GK: 'GK', CB: 'CB', RCB: 'CB', LCB: 'CB',
  LB: 'LB', LWB: 'LB', RB: 'RB', RWB: 'RB',
  CDM: 'CDM', DM: 'CDM', CM: 'CM', RCM: 'CM', LCM: 'CM',
  CAM: 'CAM', AM: 'CAM', LW: 'LW', LM: 'LW',
  RW: 'RW', RM: 'RW', ST: 'ST', CF: 'ST', LF: 'ST', RF: 'ST', LS: 'ST', RS: 'ST', SS: 'ST'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await req.json();
    if (!url) return Response.json({ error: 'URL manquante' }, { status: 400 });

    // Extraire l'ID joueur depuis l'URL pour construire la recherche
    const playerIdMatch = url.match(/\/player\/(\d+)\//);
    const playerId = playerIdMatch ? playerIdMatch[1] : null;

    // Construire l'URL propre (sans numéro de version pour avoir la dernière MàJ)
    const cleanUrl = url
      .replace(/\/\d{5,6}\/?$/, '/')
      .replace(/\/\d{5,6}\/(?=[^/]*\/?$)/, '/');

    // Utiliser le LLM avec recherche internet pour récupérer les données SoFIFA à jour
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Va sur cette page SoFIFA et extrais EXACTEMENT les données affichées sur la DERNIÈRE mise à jour (la plus récente disponible en 2026) : ${cleanUrl}

Règles STRICTES pour l'extraction :
1. OVERALL : le PREMIER grand nombre affiché en haut (ex: 76). C'est la note actuelle.
2. POTENTIAL : le DEUXIÈME grand nombre (ex: 85). Toujours >= overall en général.
3. Ces deux valeurs sont DIFFÉRENTES sauf coïncidence. Ne mets JAMAIS le même chiffre si ce n'est pas le cas.
4. POSITION : la position principale affichée (GK/CB/LB/RB/CDM/CM/CAM/LW/RW/ST).
5. AGE : le nombre avant "y.o." sur la page (ex: 19).
6. VALUE : la valeur marchande affichée (€15M, €900K, etc.). Convertis en entier (€15M = 15000000).
7. RELEASE CLAUSE : si présente, sinon 0.
8. NOM : nom complet exact affiché sur la page.
9. NATIONALITÉ : pays du joueur.
10. IMAGE URL : cherche une photo du joueur qui fonctionne vraiment. Essaie dans cet ordre :
   - Une photo sur Wikipedia (https://upload.wikimedia.org/...)
   - Une photo sur une source fiable (transfermarkt, UEFA, etc.)
   - En DERNIER RECOURS seulement : l'URL cdn.sofifa.net.
   Donne l'URL directe de l'image (se terminant par .jpg, .png ou .webp).

Retourne UNIQUEMENT les données de la page actuelle (dernière mise à jour). Ne retourne pas de données inventées.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          image_url: { type: "string" },
          position: { type: "string" },
          overall: { type: "number" },
          potential: { type: "number" },
          age: { type: "number" },
          nationality: { type: "string" },
          value: { type: "number" },
          release_clause: { type: "number" },
          pace: { type: "number" },
          shooting: { type: "number" },
          passing: { type: "number" },
          dribbling: { type: "number" },
          defending: { type: "number" },
          physical: { type: "number" }
        }
      }
    });

    // Normaliser la position
    if (result.position && POSITION_MAP[result.position]) {
      result.position = POSITION_MAP[result.position];
    }

    // Normaliser la valeur si le LLM a renvoyé une string
    if (typeof result.value === 'string') result.value = parseValue(result.value);
    if (typeof result.release_clause === 'string') result.release_clause = parseValue(result.release_clause);

    return Response.json({ player: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});