import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { offset = 0 } = await req.json().catch(() => ({}));

    const allPlayers = await base44.asServiceRole.entities.Player.list();
    const BATCH = 3;
    const batch = allPlayers.slice(offset, offset + BATCH);

    if (batch.length === 0) {
      return Response.json({ done: true, total: allPlayers.length, offset, updated: 0, failed: 0 });
    }

    let updated = 0;
    let failed = 0;

    for (const player of batch) {
      try {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Trouve une URL d'image directe du joueur de football "${player.name}"${player.nationality ? ` (${player.nationality})` : ''}.
L'URL doit pointer vers une vraie photo du joueur et se terminer par .jpg, .png ou .webp.
Sources acceptées : Wikipedia (upload.wikimedia.org), UEFA, transfermarkt.
INTERDIT : sofifa.net, ea.com, cdn.sofifa.net.
Reponds UNIQUEMENT avec l'URL, rien d'autre.`,
          add_context_from_internet: true,
        });

        const imageUrl = (result || '').toString().trim().replace(/["\s]/g, '');

        if (
          imageUrl.startsWith('http') &&
          !imageUrl.includes('sofifa.net') &&
          !imageUrl.includes('ea.com') &&
          (imageUrl.match(/\.(jpg|jpeg|png|webp)/i))
        ) {
          await base44.asServiceRole.entities.Player.update(player.id, { image_url: imageUrl });
          updated++;
        } else {
          failed++;
        }
      } catch (_) {
        failed++;
      }
    }

    const nextOffset = offset + BATCH;
    return Response.json({
      done: nextOffset >= allPlayers.length,
      total: allPlayers.length,
      offset: nextOffset,
      updated,
      failed
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});