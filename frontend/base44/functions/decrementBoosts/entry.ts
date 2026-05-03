import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || !['owner', 'admin', 'staff_championnat'].includes(user.role)) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 });
  }

  // Récupérer tous les joueurs avec un boost actif
  const players = await base44.asServiceRole.entities.Player.list('-created_date', 500);
  const boosted = players.filter(p => p.boost_journees_restantes > 0 && p.boost_overall > 0);

  let reset = 0;
  let decremented = 0;

  for (const player of boosted) {
    const remaining = player.boost_journees_restantes - 1;
    if (remaining <= 0) {
      // Retirer le boost
      await base44.asServiceRole.entities.Player.update(player.id, {
        overall: player.boost_base_overall || (player.overall - player.boost_overall),
        boost_overall: 0,
        boost_journees_restantes: 0,
        boost_base_overall: null
      });
      reset++;
    } else {
      await base44.asServiceRole.entities.Player.update(player.id, {
        boost_journees_restantes: remaining
      });
      decremented++;
    }
  }

  return Response.json({ success: true, reset, decremented, total: boosted.length });
});