import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Find all active loans with mandatory buy option not yet exercised
    const auctions = await base44.asServiceRole.entities.Auction.list('-created_date', 200);
    const loanAuctions = auctions.filter(a =>
      a.is_loan === true &&
      a.loan_mandatory_buy_option > 0 &&
      a.loan_buy_option_exercised !== true &&
      a.status === 'completed'
    );

    if (loanAuctions.length === 0) {
      return Response.json({ message: 'Aucune option obligatoire à traiter', processed: 0 });
    }

    const clubs = await base44.asServiceRole.entities.Club.list();
    let processed = 0;
    const errors = [];

    for (const auction of loanAuctions) {
      try {
        const amount = auction.loan_mandatory_buy_option;

        // Find buyer and seller clubs
        const buyerClub = clubs.find(c => c.id === auction.current_bidder_id) ||
          clubs.find(c => c.name === auction.current_bidder_club);
        const sellerClub = clubs.find(c => c.id === auction.seller_club_id);

        if (!buyerClub || !sellerClub) {
          errors.push(`Clubs introuvables pour ${auction.player_name}`);
          continue;
        }

        if ((buyerClub.budget || 0) < amount) {
          errors.push(`Budget insuffisant pour ${auction.current_bidder_club} (option obligatoire ${auction.player_name})`);
          // Still process — club goes negative if needed (rule enforcement)
        }

        // Deduct from buyer, credit seller
        await base44.asServiceRole.entities.Club.update(buyerClub.id, {
          budget: (buyerClub.budget || 0) - amount
        });
        await base44.asServiceRole.entities.Club.update(sellerClub.id, {
          budget: (sellerClub.budget || 0) + amount
        });

        // Mark auction as exercised
        await base44.asServiceRole.entities.Auction.update(auction.id, {
          loan_buy_option_exercised: true
        });

        // Notify buyer club users
        const users = await base44.asServiceRole.entities.User.list();
        const buyerUser = users.find(u => u.club_id === buyerClub.id && u.has_selected_club);
        const sellerUser = users.find(u => u.club_id === sellerClub.id && u.has_selected_club);

        if (buyerUser) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: buyerUser.id,
            club_id: buyerClub.id,
            type: 'transfer_offer',
            title: `Option obligatoire prélevée — ${auction.player_name}`,
            message: `La fin du championnat a déclenché l'option d'achat obligatoire de ${(amount / 1e6).toFixed(2)}M€ pour ${auction.player_name}. Le joueur est désormais définitivement le vôtre.`,
            is_read: false,
            link_page: 'Community'
          });
        }
        if (sellerUser) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: sellerUser.id,
            club_id: sellerClub.id,
            type: 'transfer_offer',
            title: `Option obligatoire exercée — ${auction.player_name}`,
            message: `La fin du championnat a déclenché l'option obligatoire de ${(amount / 1e6).toFixed(2)}M€ de ${auction.current_bidder_club} pour ${auction.player_name}. Vos finances ont été créditées.`,
            is_read: false,
            link_page: 'Community'
          });
        }

        processed++;
      } catch (err) {
        errors.push(`Erreur pour ${auction.player_name}: ${err.message}`);
      }
    }

    return Response.json({ message: 'Traitement terminé', processed, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});