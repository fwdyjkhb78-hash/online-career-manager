import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { matchResults } = await req.json().catch(() => ({ matchResults: [] }));

    // Get Barrages LDC tournament
    const tournaments = await base44.entities.Tournament.list('-created_date', 50);
    const barragesLDC = tournaments.find(t => t.name && t.name.toLowerCase().includes('barrages ldc'));
    
    if (!barragesLDC) {
      return Response.json({ error: 'Tournoi Barrages LDC non trouvé' }, { status: 404 });
    }

    // Get all clubs and matches
    const allClubs = await base44.entities.Club.list();
    const allMatches = await base44.entities.Match.list('-journee', 500);
    const tournamentMatches = allMatches.filter(m => m.tournament_id === barragesLDC.id);

    // Map club names to IDs
    const clubMap = {};
    allClubs.forEach(c => {
      clubMap[c.name.toLowerCase()] = c.id;
    });

    // Synchronize each match result
    const updated = [];
    const errors = [];

    for (const result of matchResults) {
      const { homeTeam, awayTeam, homeScore, awayScore } = result;
      const homeId = clubMap[homeTeam.toLowerCase()];
      const awayId = clubMap[awayTeam.toLowerCase()];

      if (!homeId || !awayId) {
        errors.push(`Clubs non trouvés: ${homeTeam} vs ${awayTeam}`);
        continue;
      }

      const match = tournamentMatches.find(m =>
        (m.home_club_id === homeId && m.away_club_id === awayId) ||
        (m.home_club_id === awayId && m.away_club_id === homeId)
      );

      if (!match) {
        errors.push(`Match non trouvé: ${homeTeam} vs ${awayTeam}`);
        continue;
      }

      // Update match based on home/away orientation
      const updateData = match.home_club_id === homeId
        ? { home_score: homeScore, away_score: awayScore, status: 'confirmed' }
        : { home_score: awayScore, away_score: homeScore, status: 'confirmed' };

      await base44.entities.Match.update(match.id, updateData);
      updated.push(`${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`);
    }

    return Response.json({
      success: true,
      updated,
      errors,
      count: updated.length,
      tournament: barragesLDC.name
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});