import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['owner', 'admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { offset = 0, batch_size = 5 } = await req.json();

    const allPlayers = await base44.asServiceRole.entities.Player.list();
    const batch = allPlayers.slice(offset, offset + batch_size);

    if (batch.length === 0) {
      return Response.json({ done: true, total: allPlayers.length, updated: 0, failed: 0, next_offset: offset });
    }

    // Ask LLM for photos of multiple players at once
    const playerList = batch.map((p, i) => `${i + 1}. "${p.name}"${p.nationality ? ` (${p.nationality})` : ''}${p.overall ? `, OVR ${p.overall}` : ''}`).join('\n');

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Pour chacun de ces joueurs de football, trouve une URL d'image directe et accessible (se terminant par .jpg, .png ou .webp).

Sources acceptées (par ordre de préférence) : Wikipedia (upload.wikimedia.org), UEFA, Getty Images, transfermarkt, BBC Sport, Le Parisien, L'Équipe.
INTERDIT : sofifa.net, ea.com (ces domaines bloquent les images).

Joueurs :
${playerList}

Retourne un tableau JSON avec une entrée par joueur dans le même ordre.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          players: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                image_url: { type: "string" }
              }
            }
          }
        }
      }
    });

    let updated = 0;
    let failed = 0;

    const foundPlayers = result?.players || [];
    for (let i = 0; i < batch.length; i++) {
      const player = batch[i];
      const found = foundPlayers[i];
      const imageUrl = found?.image_url;

      if (imageUrl && imageUrl.startsWith('http') && !imageUrl.includes('sofifa.net') && !imageUrl.includes('ea.com')) {
        await base44.asServiceRole.entities.Player.update(player.id, { image_url: imageUrl });
        updated++;
      } else {
        failed++;
      }
    }

    const next_offset = offset + batch.length;
    return Response.json({
      done: next_offset >= allPlayers.length,
      total: allPlayers.length,
      processed: next_offset,
      updated,
      failed,
      next_offset
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});