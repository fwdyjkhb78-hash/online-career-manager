import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function parseScore7Url(url) {
  const m = url.match(/\/tournaments\/([^/]+)\/stages\/([^/?#]+)/);
  if (m) return { tournamentId: m[1], stageId: m[2] };
  return null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const url = body.url;
  if (!url) return Response.json({ error: 'URL manquante' }, { status: 400 });

  const ids = parseScore7Url(url);
  if (!ids) return Response.json({ error: 'URL score7.io invalide. Format: https://www.score7.io/tournaments/xxx/stages/yyy' }, { status: 400 });

  const { tournamentId, stageId } = ids;
  const apiHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'fr-FR,fr;q=0.9',
    'Referer': `https://www.score7.io/tournaments/${tournamentId}/stages/${stageId}`,
    'Origin': 'https://www.score7.io',
    'x-requested-with': 'XMLHttpRequest',
  };

  const debugInfo = {};

  // Try multiple API patterns used by score7-type platforms
  const endpoints = [
    `https://www.score7.io/api/v1/stages/${stageId}/games`,
    `https://www.score7.io/api/v1/stages/${stageId}`,
    `https://www.score7.io/api/tournaments/${tournamentId}/stages/${stageId}`,
    `https://www.score7.io/api/stages/${stageId}`,
    `https://api.score7.io/stages/${stageId}/games`,
    `https://api.score7.io/v1/stages/${stageId}`,
  ];

  let rawData = '';
  let successEndpoint = '';

  for (const endpoint of endpoints) {
    const r = await fetch(endpoint, { headers: apiHeaders });
    debugInfo[endpoint] = { status: r.status };
    if (r.ok) {
      const text = await r.text();
      debugInfo[endpoint].length = text.length;
      debugInfo[endpoint].preview = text.substring(0, 200);
      if (text && text.length > 100) {
        rawData = text;
        successEndpoint = endpoint;
        break;
      }
    }
  }

  // Fallback: HTML page
  if (!rawData) {
    const htmlRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      }
    });
    debugInfo['html'] = { status: htmlRes.status };
    if (htmlRes.ok) {
      rawData = await htmlRes.text();
      debugInfo['html'].length = rawData.length;
      debugInfo['html'].preview = rawData.substring(0, 500);
      successEndpoint = 'html';
    }
  }

  if (!rawData || rawData.length < 100) {
    return Response.json({ error: 'Impossible de récupérer les données. Score7.io bloque peut-être l\'accès.', debug: debugInfo }, { status: 400 });
  }

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Analyse ce contenu d'une page/API score7.io (source: ${successEndpoint}) et extrais TOUS les matchs de football.

Pour chaque match extrais:
- journee: numéro de journée/round (entier, 1 si pas trouvé)
- home_team: nom de l'équipe domicile
- away_team: nom de l'équipe extérieure  
- home_score: score domicile (null si pas encore joué)
- away_score: score extérieur (null si pas encore joué)
- is_played: true si le match a un score connu

Si c'est du JSON, cherche les arrays de matchs/games/fixtures. Si c'est du HTML, cherche les éléments de match.

Contenu (60000 chars max):
${rawData.substring(0, 60000)}`,
    response_json_schema: {
      type: 'object',
      properties: {
        matches: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              journee: { type: 'number' },
              home_team: { type: 'string' },
              away_team: { type: 'string' },
              home_score: { type: 'number' },
              away_score: { type: 'number' },
              is_played: { type: 'boolean' }
            }
          }
        }
      }
    },
    model: 'claude_sonnet_4_6'
  });

  return Response.json({ matches: result.matches || [], source: successEndpoint, debug: debugInfo });
});