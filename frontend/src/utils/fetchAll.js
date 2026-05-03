import { base44 } from '@/api/base44Client';

const PAGE_SIZE = 5000;

/**
 * Récupère TOUS les enregistrements d'une entité via pagination.
 * @param {string} entityName - Nom de l'entité (ex: 'Player', 'Club')
 * @param {string} sort - Tri (ex: '-updated_date')
 */
export async function fetchAll(entityName, sort = '-created_date') {
  const entity = base44.entities[entityName];
  let allRecords = [];
  let skip = 0;

  while (true) {
    const batch = await entity.list(sort, PAGE_SIZE, skip);
    allRecords = [...allRecords, ...batch];
    if (batch.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return allRecords;
}