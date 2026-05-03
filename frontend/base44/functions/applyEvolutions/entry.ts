import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const computeValue = (overall) => {
  if (overall >= 93) return 150_000_000;
  if (overall >= 91) return 120_000_000;
  if (overall >= 89) return 90_000_000;
  if (overall >= 87) return 65_000_000;
  if (overall >= 85) return 45_000_000;
  if (overall >= 83) return 30_000_000;
  if (overall >= 81) return 20_000_000;
  if (overall >= 79) return 13_000_000;
  if (overall >= 77) return 8_000_000;
  if (overall >= 75) return 5_000_000;
  return 3_000_000;
};

const EVOLUTIONS = [
  // Manchester United
  { name: 'Amad', from: 80, to: 85, count: 1 },
  { name: 'Mainoo', from: 83, to: 85, count: 2, intermediate: 84 },
  { name: 'Yoro', from: 83, to: 86, count: 2, intermediate: 84 },
  { name: 'Lammens', from: 85, to: 87, count: 2, intermediate: 86 },
  { name: 'Bastoni', from: 87, to: 89, count: 1 },
  { name: 'Diomande', from: 79, to: 82, count: 1 },
  // Arsenal
  { name: 'Lewis Skelly', from: 78, to: 83, count: 1 },
  { name: 'Hincapie', from: 83, to: 84, count: 1 },
  { name: 'Malik Fofana', from: 78, to: 83, count: 1 },
  { name: 'Conceicao', from: 79, to: 84, count: 1 },
  { name: 'Gyokeres', from: 86, to: 87, count: 1 },
  { name: 'Saliba', from: 88, to: 90, count: 1 },
  { name: 'Gabriel', from: 89, to: 90, count: 1 },
  { name: 'Rice', from: 88, to: 89, count: 1 },
  // Bayern
  { name: 'Urbig', from: 76, to: 85, count: 2, intermediate: 81 },
  { name: 'Pavlovic', from: 81, to: 86, count: 1 },
  { name: 'Frohold', from: 78, to: 83, count: 1 },
  { name: 'Diao', from: 76, to: 81, count: 1 },
  { name: 'Tel', from: 77, to: 85, count: 2, intermediate: 82 },
  { name: 'Camarda', from: 65, to: 80, count: 1 },
  { name: 'Almada', from: 79, to: 86, count: 1 },
  // Dortmund
  { name: 'Hjulmand', from: 83, to: 86, count: 1 },
  { name: 'Ndiaye', from: 82, to: 85, count: 1 },
  { name: 'Fabio Silva', from: 79, to: 84, count: 1 },
  // Real Madrid
  { name: 'Mbappe', from: 91, to: 92, count: 1 },
  { name: 'Vini', from: 89, to: 92, count: 1 },
  { name: 'Hujisen', from: 81, to: 88, count: 1 },
  { name: 'Carreras', from: 81, to: 83, count: 1 },
  { name: 'Sancet', from: 82, to: 84, count: 1 },
  // Barcelone
  { name: 'Balde', from: 83, to: 87, count: 1 },
  { name: 'Cubarsi', from: 82, to: 86, count: 1 },
  { name: 'Yamal', from: 89, to: 94, count: 1 },
  { name: 'Araujo', from: 82, to: 85, count: 1 },
  { name: 'Pedri', from: 90, to: 93, count: 1 },
  { name: 'Fermin', from: 83, to: 87, count: 1 },
  { name: 'Theo Van den Broeck', from: 77, to: 82, count: 1 },
  // Atletico Madrid
  { name: 'Julian Alvarez', from: 87, to: 90, count: 1 },
  { name: 'Pablo Barrios', from: 83, to: 88, count: 1 },
  { name: 'Baena', from: 83, to: 88, count: 1 },
  { name: 'Antonio Nusa', from: 78, to: 83, count: 1 },
  { name: 'Giuliano Simeone', from: 81, to: 86, count: 1 },
  // Naples
  { name: 'Ibanez', from: 82, to: 84, count: 1 },
  { name: 'Sangare', from: 78, to: 85, count: 2, intermediate: 83 },
  { name: 'Verbruggen', from: 80, to: 86, count: 2, intermediate: 85 },
  { name: 'Murillo', from: 82, to: 86, count: 1 },
  { name: 'Sesko', from: 80, to: 88, count: 2, intermediate: 85 },
  { name: 'Minteh', from: 80, to: 86, count: 2, intermediate: 85 },
  { name: 'Udogie', from: 80, to: 84, count: 1 },
  { name: 'Gittens', from: 83, to: 84, count: 1 },
  { name: 'Soule', from: 79, to: 85, count: 2, intermediate: 84 },
  { name: 'Wesley', from: 78, to: 85, count: 2, intermediate: 83 },
  { name: 'Sarahoui', from: 76, to: 81, count: 1 },
  // Bilbao
  { name: 'Nico Williams', from: 86, to: 89, count: 1 },
  { name: 'Sancet', from: 83, to: 86, count: 1 },
  { name: 'Jauregizar', from: 80, to: 87, count: 2, intermediate: 85 },
  { name: 'Vivian', from: 83, to: 86, count: 1 },
  { name: 'Brown', from: 79, to: 84, count: 1 },
  { name: 'Joao Felix', from: 80, to: 83, count: 1 },
  { name: 'Mathias Fernandes Parzo', from: 76, to: 81, count: 1 },
  { name: 'Alexsandro', from: 80, to: 84, count: 1 },
  { name: 'Balogun', from: 77, to: 82, count: 1 },
  { name: 'Lamine Camara', from: 78, to: 82, count: 1 },
];

const normalize = (str) => str.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 ]/g, '').trim();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allPlayers = await base44.asServiceRole.entities.Player.list();
    const existingEvos = await base44.asServiceRole.entities.PlayerEvolution.list();

    const results = { updated: [], skipped: [], notFound: [] };

    for (const evo of EVOLUTIONS) {
      const normName = normalize(evo.name);

      // Find player by name (fuzzy) and matching from-overall
      const player = allPlayers.find(p => {
        const pNorm = normalize(p.name);
        return (pNorm === normName || pNorm.includes(normName) || normName.includes(pNorm))
          && p.overall === evo.from;
      });

      if (!player) {
        // Try without overall match (player may have already been updated)
        const playerAny = allPlayers.find(p => {
          const pNorm = normalize(p.name);
          return pNorm === normName || pNorm.includes(normName) || normName.includes(pNorm);
        });
        if (playerAny && playerAny.overall === evo.to) {
          // Already at target overall
          results.skipped.push(`${evo.name} (déjà à ${evo.to})`);
          continue;
        }
        results.notFound.push(evo.name);
        continue;
      }

      // Check if evolution already exists (overall_before → overall_after for this player)
      const alreadyEvolved = existingEvos.some(e =>
        e.player_id === player.id &&
        e.overall_before === evo.from &&
        e.overall_after === evo.to
      );

      if (alreadyEvolved) {
        results.skipped.push(`${player.name} (evo déjà enregistrée)`);
        continue;
      }

      // Create evolution records
      const baseEvoData = {
        player_id: player.id,
        player_name: player.name,
        player_position: player.position,
        player_image_url: player.image_url || '',
        club_id: player.club_id || '',
        club_name: player.club_name || '',
      };

      if (evo.count === 2 && evo.intermediate) {
        await base44.asServiceRole.entities.PlayerEvolution.create({
          ...baseEvoData,
          overall_before: evo.from,
          overall_after: evo.intermediate,
        });
        await base44.asServiceRole.entities.PlayerEvolution.create({
          ...baseEvoData,
          overall_before: evo.intermediate,
          overall_after: evo.to,
        });
      } else {
        await base44.asServiceRole.entities.PlayerEvolution.create({
          ...baseEvoData,
          overall_before: evo.from,
          overall_after: evo.to,
        });
      }

      // Update player overall and value
      await base44.asServiceRole.entities.Player.update(player.id, {
        overall: evo.to,
        value: computeValue(evo.to),
      });

      results.updated.push(`${player.name}: ${evo.from} → ${evo.to}`);
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});