import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin' && user?.role !== 'owner' && user?.role !== 'staff_championnat') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { championship_slug } = await req.json();
    
    const championship = await base44.entities.Championship.filter(
      { slug: championship_slug },
      '-created_date',
      1
    );
    
    if (!championship || championship.length === 0) {
      return Response.json({ error: 'Championship not found' }, { status: 404 });
    }

    const champ = championship[0];
    if (!champ.is_ldc || !champ.source_championships || champ.source_championships.length === 0) {
      return Response.json({ error: 'Not an LDC or no source championships configured' }, { status: 400 });
    }

    // Get all championships and clubs
    const allChamps = await base44.entities.Championship.list('-created_date', 100);
    const allClubs = await base44.entities.Club.list('-created_date', 500);

    // Collect qualified teams
    const qualifiedClubs = [];
    const qualifiedIds = new Set();

    for (const source of champ.source_championships) {
      const sourceChamp = allChamps.find(c => c.slug === source.championship_slug);
      if (!sourceChamp) continue;

      // Get clubs in this championship, sorted by standings
      const champsClubs = allClubs
        .filter(c => c.championships?.includes(source.championship_slug))
        .sort((a, b) => {
          const pointDiff = b.points - a.points;
          if (pointDiff !== 0) return pointDiff;
          return (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against);
        });

      const minPos = source.ranking_position_min || 1;
      const maxPos = source.ranking_position_max || source.qualification_spots;
      const spots = source.qualification_spots || 1;

      for (let i = minPos - 1; i < Math.min(minPos - 1 + spots, champsClubs.length, maxPos); i++) {
        const club = champsClubs[i];
        if (club && !qualifiedIds.has(club.id)) {
          qualifiedClubs.push({
            id: club.id,
            name: club.name,
            source: source.championship_name
          });
          qualifiedIds.add(club.id);
        }
      }
    }

    // Add clubs to championship
    const existingClubs = allClubs.filter(c => 
      c.championships?.includes(championship_slug) && 
      !qualifiedIds.has(c.id)
    );

    const allChampsClubs = [
      ...qualifiedClubs.map(c => c.id),
      ...existingClubs.map(c => c.id)
    ];

    await base44.entities.Championship.update(champ.id, {
      ldc_config: {
        ...champ.ldc_config,
        phase: 'league'
      }
    });

    // Update clubs to add championship
    for (const club of qualifiedClubs) {
      const clubData = allClubs.find(c => c.id === club.id);
      if (clubData) {
        const championships = clubData.championships || [];
        if (!championships.includes(championship_slug)) {
          championships.push(championship_slug);
          await base44.entities.Club.update(clubData.id, {
            championships
          });
        }
      }
    }

    return Response.json({
      success: true,
      qualified_teams: qualifiedClubs.length,
      teams: qualifiedClubs
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});