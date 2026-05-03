import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin' && user?.role !== 'owner' && user?.role !== 'staff_championnat') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { tournament_id } = await req.json();
    
    const tournament = await base44.entities.Tournament.get(tournament_id);
    if (!tournament) {
      return Response.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (!tournament.ldc_config) {
      return Response.json({ error: 'Not an LDC tournament' }, { status: 400 });
    }

    // Get all clubs
    const clubs = await base44.entities.Club.list('-created_date', 500);
    const participatingClubs = clubs.filter(c => tournament.participating_club_ids.includes(c.id));

    // Generate round-robin matches (Swiss system)
    const matches = [];
    const matchesPerTeam = tournament.ldc_config.league_matches_per_team;
    const totalTeams = participatingClubs.length;
    
    // Simple round-robin pairing: shuffle clubs and create pairings
    for (let i = 0; i < matchesPerTeam / 2; i++) {
      const shuffled = [...participatingClubs].sort(() => Math.random() - 0.5);
      
      for (let j = 0; j < totalTeams / 2; j++) {
        const homeClub = shuffled[j];
        const awayClub = shuffled[totalTeams - 1 - j];
        
        if (homeClub.id !== awayClub.id) {
          matches.push({
            tournament_id: tournament.id,
            tournament_name: tournament.name,
            journee: i + 1,
            match_type: 'tournoi',
            home_club_id: homeClub.id,
            home_club_name: homeClub.name,
            away_club_id: awayClub.id,
            away_club_name: awayClub.name,
            status: 'pending'
          });
        }
      }
    }

    // Create matches
    if (matches.length > 0) {
      await base44.entities.Match.bulkCreate(matches);
    }

    // Update tournament phase
    await base44.entities.Tournament.update(tournament.id, {
      ldc_config: {
        ...tournament.ldc_config,
        phase: 'league'
      },
      status: 'ongoing',
      league_journee_count: tournament.ldc_config.league_matches_per_team / 2
    });

    return Response.json({
      success: true,
      matches_created: matches.length,
      teams: participatingClubs.length,
      matches_per_team: matchesPerTeam
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});