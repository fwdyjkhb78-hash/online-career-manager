import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Sparkles, ChevronDown, ChevronUp, X, Trash2, ArrowUpCircle, ArrowUp, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];

const EVOLUTION_LEVELS = [
  { boost: 1, cost: 5_000_000,  label: '+1 OVR', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', btnColor: 'bg-emerald-500 hover:bg-emerald-600' },
  { boost: 2, cost: 10_000_000, label: '+2 OVR', color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/30',       btnColor: 'bg-cyan-500 hover:bg-cyan-600' },
  { boost: 3, cost: 15_000_000, label: '+3 OVR', color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30',       btnColor: 'bg-blue-500 hover:bg-blue-600' },
  { boost: 4, cost: 20_000_000, label: '+4 OVR', color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/30',   btnColor: 'bg-violet-500 hover:bg-violet-600' },
  { boost: 5, cost: 25_000_000, label: '+5 OVR', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',     btnColor: 'bg-amber-500 hover:bg-amber-600' },
];

export default function AcademyTab({ club }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [nationalities, setNationalities] = useState([]);
  const [nationalityInput, setNationalityInput] = useState('');
  const [count, setCount] = useState(1);
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState([]);

  const PROFILE_TYPES = {
    // Gardiens
    gk_neuer: {
      label: 'GK – Style Neuer', description: 'Gardien libéro, très à l\'aise au pied, sorties maîtrisées',
      color: 'text-sky-300', bg: 'bg-sky-500/10 border-sky-500/40', activeBg: 'bg-sky-500 border-sky-500 text-white',
      position: 'GK', nationality: 'allemande',
      prompt: `Style Manuel Neuer : gardien libéro, très bon jeu au pied (passes_courtes 65-73, passes_longues 68-75, conduite_balle 60-68), lecture du jeu exceptionnelle, sorties maîtrisées. Stats gardien spécifiques ÉLEVÉES : positionnement (73-80), plongeon (65-72), reflexe_g (68-75), jeu_a_la_main (60-68), degagement (65-73). Agilite (70-78), reactivite (70-78). Stats de champ FAIBLES : finition (25-35), tires de loin (20-30), agressivite (30-42).`
    },
    gk_casillas: {
      label: 'GK – Style Casillas', description: 'Ultra réactif, réflexes exceptionnels, explosif sur sa ligne',
      color: 'text-sky-400', bg: 'bg-sky-500/15 border-sky-500/40', activeBg: 'bg-sky-600 border-sky-600 text-white',
      position: 'GK', nationality: 'espagnole',
      prompt: `Style Iker Casillas : réflexes exceptionnels et explosivité maximale. Stats gardien spécifiques TRÈS ÉLEVÉES : reflexe_g (80-88), plongeon (78-85), reactivite (78-86), agilite (76-84), positionnement (72-79), jeu_a_la_main (62-70), degagement (55-65). Jeu au pied correct mais pas exceptionnel : passes_courtes (52-62), passes_longues (50-60), conduite_balle (45-55). Stats de champ très faibles.`
    },
    // Défenseurs centraux
    dc_ramos: {
      label: 'DC – Style Ramos', description: 'Leader agressif, duels, très dangereux sur corners',
      color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/40', activeBg: 'bg-red-500 border-red-500 text-white',
      position: 'CB', nationality: 'espagnole',
      prompt: `Style Sergio Ramos : défenseur agressif et leader. Stats défense clés élevées : tacles_debout (76-84), agressivite (78-85), interception (72-80), positionnement (73-81). Bon aérien : precision_tete (72-80), detente (70-78). Bonne relance : passes_courtes (62-70), passes_longues (60-68). Finition correcte pour corners (58-66). Taille 183-190cm.`
    },
    dc_thiago_silva: {
      label: 'DC – Style T. Silva', description: 'Intelligent, placement parfait, relanceur propre',
      color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/40', activeBg: 'bg-orange-500 border-orange-500 text-white',
      position: 'CB', nationality: 'brésilienne',
      prompt: `Style Thiago Silva : défenseur très intelligent et propre. Stats clés : positionnement (78-86), interception (75-82), passes_courtes (72-80), passes_longues (68-76), vista (65-73). Agressivite modérée (50-62). Tacles très timés (70-78). Peu de fautes. Taille 182-188cm.`
    },
    dc_vvd: {
      label: 'DC – Style Van Dijk', description: 'Dominant physiquement, aérien élite, calme et serein',
      color: 'text-red-500', bg: 'bg-red-500/15 border-red-500/40', activeBg: 'bg-red-600 border-red-600 text-white',
      position: 'CB', nationality: 'néerlandaise',
      prompt: `Style Virgil van Dijk : défenseur très dominant physiquement. Stats clés : force (78-86), precision_tete (78-85), detente (74-82), positionnement (76-84), interception (72-80), equilibre (74-82). Taille 188-195cm, poids 88-95kg. Vitesse_sprint correcte pour son gabarit (60-68). Agressivite contrôlée (58-68). Bonne relance longue : passes_longues (65-73).`
    },
    dc_pepe: {
      label: 'DC – Style Pepe', description: 'Défenseur très agressif, dur dans les duels, intense, rapide pour un DC',
      color: 'text-orange-500', bg: 'bg-orange-500/15 border-orange-500/40', activeBg: 'bg-orange-600 border-orange-600 text-white',
      position: 'CB', nationality: 'portugaise',
      prompt: `Style Pepe : défenseur agressif et guerrier. Stats clés : agressivite (80-88, stat clé), tacles_debout (78-86), tacles_glisses (74-82), interception (74-82), force (76-84), acceleration (68-76), vitesse_sprint (66-74), positionnement (72-80). Bonne détente (68-76). Passes_courtes correctes (55-65). Passes_longues (52-62). Défenseur rugueux et intense. Taille 184-190cm, physique solide.`
    },
    // Latéraux gauches
    lb_maldini: {
      label: 'DG – Style Maldini', description: 'Intelligence pure, placement élite, défenseur propre et élégant',
      color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/40', activeBg: 'bg-rose-500 border-rose-500 text-white',
      position: 'LB', nationality: 'italienne',
      prompt: `Style Paolo Maldini : défenseur extrêmement intelligent et propre. Stats clés : positionnement (80-88), interception (78-85), tacles_debout (76-84), tacles_glisses (74-82), reactivite (74-82). Agressivite très faible (35-48). Bonne endurance (72-80). Passes_courtes solides (68-76). Taille 183-188cm.`
    },
    lb_marcelo: {
      label: 'DG – Style Marcelo', description: 'Ultra offensif, dribbleur, créatif, latéral-ailier',
      color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/40', activeBg: 'bg-green-500 border-green-500 text-white',
      position: 'LB', nationality: 'brésilienne',
      prompt: `Style Marcelo : latéral très offensif. Stats clés : dribbles (76-84), conduite_balle (74-82), agilite (76-84), centres (72-80), passes_courtes (70-78), effet (68-76). Endurance élevée (72-80). Défense plus faible : tacles_debout (55-65), interception (52-62), agressivite (48-58). Taille 172-180cm.`
    },
    lb_nuno_mendes: {
      label: 'DG – Style N. Mendes', description: 'Rapide, explosif, très complet et moderne',
      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/40', activeBg: 'bg-emerald-500 border-emerald-500 text-white',
      position: 'LB', nationality: 'portugaise',
      prompt: `Style Nuno Mendes : latéral moderne très rapide et complet. Stats clés : acceleration (78-86), vitesse_sprint (76-84), endurance (76-84). Bon offensivement et défensivement (équilibré). Centres (68-76), tacles_debout (68-76), interception (66-74). Dribbles corrects (62-70) mais pas élite. Taille 175-183cm.`
    },
    lb_roberto_carlos: {
      label: 'DG – Style R. Carlos', description: 'Explosif, frappe puissante, très offensif, petit gabarit',
      color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/40', activeBg: 'bg-yellow-500 border-yellow-500 text-white',
      position: 'LB', nationality: 'brésilienne',
      prompt: `Style Roberto Carlos : latéral ultra offensif et explosif. Stats clés : puissance_tir (78-86), tirs_loin (75-83), acceleration (78-86), vitesse_sprint (76-84), precision_cf (72-80), effet (72-80). Finition correcte (60-68). Défense correcte mais pas élite : tacles_debout (60-68). Taille 168-175cm, petit et compact mais force (70-78).`
    },
    // Milieux
    mc_modric: {
      label: 'MC – Style Modrić', description: 'Ultra technique, vision, mobile, passes + conduite',
      color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/40', activeBg: 'bg-indigo-500 border-indigo-500 text-white',
      position: 'CM', nationality: 'croate',
      prompt: `Style Luka Modrić : milieu complet et technique. Stats clés : passes_courtes (75-83), passes_longues (72-80), conduite_balle (73-81), agilite (74-82), vista (73-81), equilibre (72-80). Bonne endurance (72-80). Dribbles bons (65-73). Défense correcte. Taille 172-178cm.`
    },
    mc_kroos: {
      label: 'MC – Style Kroos', description: 'Métronome, précision exceptionnelle, tireur de loin',
      color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/40', activeBg: 'bg-purple-500 border-purple-500 text-white',
      position: 'CM', nationality: 'allemande',
      prompt: `Style Toni Kroos : maître du tempo, précision extrême. Stats clés : passes_longues (80-88), passes_courtes (78-85), vista (76-84), effet (74-82), precision_cf (73-81), tirs_loin (72-80). Vitesse faible (50-60). Force correcte. Peu de dribbles. Calme, zéro déchet.`
    },
    mc_iniesta: {
      label: 'MOC – Style Iniesta', description: 'Dribble serré, très agile, petits espaces, technique pure',
      color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/40', activeBg: 'bg-violet-500 border-violet-500 text-white',
      position: 'CAM', nationality: 'espagnole',
      prompt: `Style Andrés Iniesta : technique pure dans les petits espaces. Stats clés : dribbles (76-84), agilite (78-86), equilibre (76-84), conduite_balle (74-82), passes_courtes (74-82). Taille petite (170-176cm). Force faible. Vitesse correcte. Très imprévisible.`
    },
    moc_maradona: {
      label: 'MOC – Style Maradona', description: 'Dribbleur élite, créatif, décisif, crack offensif',
      color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/40', activeBg: 'bg-cyan-500 border-cyan-500 text-white',
      position: 'CAM', nationality: 'argentine',
      prompt: `Style Diego Maradona : crack offensif dribbleur. Stats clés : dribbles (80-88), conduite_balle (78-85), agilite (78-86), effet (74-82), finition (70-78), tirs_loin (68-76). Equilibre exceptionnel. Petit gabarit (168-175cm). Force surprenante pour sa taille. Défense très faible.`
    },
    moc_zidane: {
      label: 'MOC – Style Zidane', description: 'Élégant, technique + physique, classe + puissance',
      color: 'text-blue-300', bg: 'bg-blue-500/10 border-blue-500/40', activeBg: 'bg-blue-500 border-blue-500 text-white',
      position: 'CAM', nationality: 'française',
      prompt: `Style Zinedine Zidane : élégance et puissance combinées. Stats clés : conduite_balle (76-84), passes_courtes (74-82), equilibre (74-82), vista (72-80), precision_tete (70-78), volees (68-76). Force correcte (65-73). Grand gabarit pour un meneur (183-188cm). Très complet.`
    },
    mdc_makelele: {
      label: 'MDC – Style Makélélé', description: 'Récupérateur pur, placement défensif élite, travail de l\'ombre',
      color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/40', activeBg: 'bg-gray-500 border-gray-500 text-white',
      position: 'CDM', nationality: 'française',
      prompt: `Style Claude Makélélé : sentinelle défensive pure. Stats clés : interception (78-86), tacles_debout (76-84), positionnement (78-85), endurance (76-84), agressivite (70-78). Jeu simple et efficace : passes_courtes (65-73). Peu de dribbles. Vitesse correcte. Finition très faible. Petite taille (170-176cm).`
    },
    mc_yaya_toure: {
      label: 'MC – Style Yaya Touré', description: 'Puissant + technique, percussions, tir de loin, box-to-box',
      color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/40', activeBg: 'bg-amber-500 border-amber-500 text-white',
      position: 'CM', nationality: 'ivoirienne',
      prompt: `Style Yaya Touré : box-to-box puissant. Stats clés : force (76-84), conduite_balle (72-80), puissance_tir (74-82), endurance (74-82), passes_courtes (68-76). Vitesse_sprint correcte (65-73). Grand gabarit (188-193cm). Finition correcte (62-70). Défense moyenne.`
    },
    moc_platini: {
      label: 'MOC – Style Platini', description: 'Cerveau offensif, CPA élite, finition + passes',
      color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/40', activeBg: 'bg-blue-600 border-blue-600 text-white',
      position: 'CAM', nationality: 'française',
      prompt: `Style Michel Platini : cerveau offensif élite. Stats clés : vista (78-86), precision_cf (76-84), finition (73-81), passes_courtes (72-80), passes_longues (70-78), penaltys (76-84). Très bon dans les coups de pied arrêtés. Force correcte. Pas très rapide. Défense très faible.`
    },
    moc_ozil: {
      label: 'MOC – Style Özil', description: 'Vision, passes, créateur de jeu, placement',
      color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/40', activeBg: 'bg-teal-500 border-teal-500 text-white',
      position: 'CAM', nationality: 'allemande',
      prompt: `Style Mesut Özil : créateur de jeu avec vision exceptionnelle. Stats clés : vista (80-88), passes_courtes (78-85), passes_longues (72-80), precision_cf (73-80), positionnement (72-80). Dribbles (62-70). Physique limité : force (35-48), vitesse_sprint (50-62), puissance_tir (50-62). Défense très faible.`
    },
    // Attaquants
    st_cr7: {
      label: 'BU – Style CR7', description: 'Machine à buts, athlétique, tête + finition + vitesse',
      color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/40', activeBg: 'bg-red-500 border-red-500 text-white',
      position: 'ST', nationality: 'portugaise',
      prompt: `Style Cristiano Ronaldo : machine à buts athlétique. Stats clés : finition (76-84), puissance_tir (76-84), detente (78-86), vitesse_sprint (74-82), acceleration (74-82), precision_tete (74-82). Très athlétique : force (72-80), endurance (74-82). Bon positionnement offensif. Taille 185-190cm.`
    },
    st_messi_9: {
      label: 'BU/MOC – Style Messi Faux 9', description: 'Redescend créer, dribble élite, vision + finition',
      color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/40', activeBg: 'bg-sky-500 border-sky-500 text-white',
      position: 'ST', nationality: 'argentine',
      prompt: `Style Messi faux 9 : créateur + buteur. Stats clés : dribbles (80-88), conduite_balle (78-86), vista (76-84), passes_courtes (74-82), finition (73-81), agilite (78-86). Petit gabarit (169-175cm). Force faible mais équilibre exceptionnel. Vitesse élevée.`
    },
    st_r9: {
      label: 'BU – Style R9', description: 'Ultra explosif, dribble direct, tueur devant le but',
      color: 'text-yellow-300', bg: 'bg-yellow-500/10 border-yellow-500/40', activeBg: 'bg-yellow-500 border-yellow-500 text-white',
      position: 'ST', nationality: 'brésilienne',
      prompt: `Style Ronaldo Nazário (R9) : tueur rapide et explosif. Stats clés : acceleration (80-88), dribbles (76-84), finition (76-84), agilite (76-84), vitesse_sprint (78-86). Très efficace devant le but. Physique correct. Taille 183-188cm.`
    },
    st_zlatan: {
      label: 'BU – Style Zlatan', description: 'Grand, puissant, très technique, volées + tête',
      color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/40', activeBg: 'bg-orange-500 border-orange-500 text-white',
      position: 'ST', nationality: 'suédoise',
      prompt: `Style Zlatan Ibrahimović : pivot spectaculaire grand et puissant. Stats clés : force (76-84), finition (74-82), conduite_balle (70-78), volees (72-80), precision_tete (70-78), puissance_tir (74-82). Grand gabarit (193-198cm). Technique excellente pour sa taille. Agilite surprenante.`
    },
    rw_messi: {
      label: 'AD – Style Messi Ailier', description: 'Rentre intérieur, dribble exceptionnel, créateur élite',
      color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/40', activeBg: 'bg-blue-500 border-blue-500 text-white',
      position: 'RW', nationality: 'argentine',
      prompt: `Style Messi ailier droit : dribbleur élite qui rentre sur son pied gauche. Stats clés : dribbles (80-88), conduite_balle (78-86), agilite (78-86), finition (72-80), effet (70-78), passes_courtes (72-80). Petit gabarit (169-175cm). Equilibre exceptionnel.`
    },
    rw_bale: {
      label: 'AD – Style Bale', description: 'Très rapide, très puissant, tirs de loin dévastateurs',
      color: 'text-red-300', bg: 'bg-red-500/10 border-red-500/40', activeBg: 'bg-red-400 border-red-400 text-white',
      position: 'RW', nationality: 'galloise',
      prompt: `Style Gareth Bale : vitesse + puissance. Stats clés : vitesse_sprint (80-88), acceleration (78-86), puissance_tir (76-84), tirs_loin (74-82), detente (70-78). Force (68-76). Bon finisseur. Taille 183-188cm. Centres corrects. Défense faible.`
    },
    st_benzema: {
      label: 'BU – Style Benzema', description: 'Complet, intelligent, combine, très bon finisseur',
      color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/40', activeBg: 'bg-emerald-400 border-emerald-400 text-white',
      position: 'ST', nationality: 'française',
      prompt: `Style Karim Benzema : attaquant complet et collectif. Stats clés : finition (74-82), passes_courtes (70-78), vista (68-76), conduite_balle (68-76), puissance_tir (72-80). Bon jeu de tête (precision_tete 65-73). Endurance élevée. Très intelligent dans ses appels.`
    },
    lw_neymar: {
      label: 'AG – Style Neymar', description: 'Dribble élite, très créatif, showman, effets de corps',
      color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/40', activeBg: 'bg-yellow-500 border-yellow-500 text-white',
      position: 'LW', nationality: 'brésilienne',
      prompt: `Style Neymar Jr ailier gauche : showman et dribbleur élite. Stats clés : dribbles (80-88), agilite (78-86), conduite_balle (76-84), effet (74-82), acceleration (74-82), equilibre (76-84). Finition correcte (68-76). Défense très faible. Petit gabarit (175-180cm).`
    },
    moc_neymar: {
      label: 'MOC – Style Neymar', description: 'Technique, dribbleur, créatif, imprévisible',
      color: 'text-yellow-300', bg: 'bg-yellow-400/10 border-yellow-400/40', activeBg: 'bg-yellow-400 border-yellow-400 text-white',
      position: 'CAM', nationality: 'brésilienne',
      prompt: `Style Neymar Jr MOC : très technique, excellent dribbleur, créatif, rapide. Stats clés : dribbles (78-85), conduite_balle (75-82), agilite (78-85), acceleration (75-83), equilibre (76-83), effet (70-78). Finition (65-73), passes_courtes (68-76). Défense très faible.`
    },
    st_henry: {
      label: 'BU/AG – Style Henry', description: 'Très rapide, appels intelligents, finition propre',
      color: 'text-red-300', bg: 'bg-red-500/10 border-red-500/40', activeBg: 'bg-red-500 border-red-500 text-white',
      position: 'ST', nationality: 'française',
      prompt: `Style Thierry Henry : vitesse + efficacité. Stats clés : acceleration (78-86), vitesse_sprint (76-84), finition (74-82), positionnement (72-80). Bon contrôle (conduite_balle 68-76). Grand gabarit (186-190cm). Très intelligent dans les appels. Défense faible. Penaltys (68-76).`
    },
    lw_young_cr7: {
      label: 'AG – Style CR7 Jeune', description: 'Ailier explosif, dribbleur spectaculaire, très rapide, jeune crack',
      color: 'text-yellow-300', bg: 'bg-yellow-500/10 border-yellow-500/40', activeBg: 'bg-yellow-600 border-yellow-600 text-white',
      position: 'LW', nationality: 'portugaise',
      prompt: `Style jeune Cristiano Ronaldo à Manchester United : ailier explosif et spectaculaire. Stats clés : acceleration (80-88), vitesse_sprint (78-86), dribbles (78-86), conduite_balle (76-84), agilite (78-85), reactivite (74-82), equilibre (72-80). Centres (70-78), effet (70-78), finition (65-73, encore irrégulière), puissance_tir (68-76), tirs_loin (62-70), detente (72-80). Passes courtes (60-68). Défense faible. Force encore en développement (52-62). Taille 178-185cm. Penaltys (62-72).`
    },
    rb_hakimi: {
      label: 'DD – Style Hakimi', description: 'Piston moderne, ultra rapide, très offensif, fait toute la ligne',
      color: 'text-cyan-300', bg: 'bg-cyan-500/10 border-cyan-500/40', activeBg: 'bg-cyan-600 border-cyan-600 text-white',
      position: 'RB', nationality: 'marocaine',
      prompt: `Style Achraf Hakimi : piston moderne ultra offensif. Stats clés : acceleration (80-88), vitesse_sprint (78-86), endurance (76-84), positionnement (72-80), centres (70-78). Défense correcte : tacles_debout (62-70), interception (60-68). Passes_courtes (62-70). Taille 181-187cm. Penaltys (55-65).`
    },
    rb_dani_alves: {
      label: 'DD – Style Dani Alves', description: 'Latéral très technique, créatif, passes + combinaisons, intelligent',
      color: 'text-green-300', bg: 'bg-green-500/10 border-green-500/40', activeBg: 'bg-green-600 border-green-600 text-white',
      position: 'RB', nationality: 'brésilienne',
      prompt: `Style Dani Alves : latéral créatif et technique. Stats clés : passes_courtes (74-82), centres (72-80), conduite_balle (70-78), vista (68-76), agilite (72-80), endurance (74-82). Dribbles corrects (64-72). Défense solide : tacles_debout (66-74), interception (64-72). Taille 171-177cm. Penaltys (60-70).`
    },
    gk_barthez: {
      label: 'GK – Style Barthez', description: 'Gardien instinctif et explosif, réflexes rapides, sorties audacieuses',
      color: 'text-blue-200', bg: 'bg-blue-400/10 border-blue-400/40', activeBg: 'bg-blue-500 border-blue-500 text-white',
      position: 'GK', nationality: 'française',
      prompt: `Style Fabien Barthez : gardien instinctif et explosif. Stats gardien ÉLEVÉES : reflexe_g (80-88), plongeon (78-85), reactivite (78-86), agilite (76-84), detente (74-82). Positionnement GK (72-79). Jeu au pied correct : degagement (58-68), jeu_a_la_main (60-70), passes_courtes (52-62). Stats de champ très faibles (15-30). Penaltys (45-55).`
    },
    gk_buffon: {
      label: 'GK – Style Buffon', description: 'Gardien très complet, excellent positionnement, très régulier, leader',
      color: 'text-blue-100', bg: 'bg-blue-300/10 border-blue-300/40', activeBg: 'bg-blue-700 border-blue-700 text-white',
      position: 'GK', nationality: 'italienne',
      prompt: `Style Gianluigi Buffon : gardien très complet et fiable. Stats gardien ÉLEVÉES : positionnement (80-88, stat clé absolue), plongeon (76-84), reflexe_g (78-86), jeu_a_la_main (68-76), degagement (66-74), detente (76-84), agilite (74-82), reactivite (76-84). Jeu au pied soigné : passes_courtes (60-68), passes_longues (58-66). Grande présence physique : force (72-80), endurance (72-80). Stats de champ hors cage faibles mais réalistes (15-30). Penaltys (50-60). Taille 190-196cm.`
    },
    gk_donnarumma: {
      label: 'GK – Style Donnarumma', description: 'Gardien imposant, réflexes élite, très fort sur sa ligne, dominant',
      color: 'text-indigo-300', bg: 'bg-indigo-500/10 border-indigo-500/40', activeBg: 'bg-indigo-600 border-indigo-600 text-white',
      position: 'GK', nationality: 'italienne',
      prompt: `Style Gianluigi Donnarumma : gardien grand et dominant. Stats gardien TRÈS ÉLEVÉES : reflexe_g (82-90, stat clé), plongeon (80-88), positionnement (74-82), jeu_a_la_main (64-72), degagement (62-70), detente (80-88, très élevée), force (78-86, physique imposant), reactivite (80-88), agilite (72-80). Jeu au pied correct : passes_courtes (55-65), passes_longues (52-62). Stats de champ hors cage faibles mais réalistes (15-30). Penaltys (48-58). Taille 192-198cm, poids 90-98kg.`
    },
    gk_cech: {
      label: 'GK – Style Čech', description: 'Gardien sûr, propre, très régulier, excellent positionnement',
      color: 'text-sky-200', bg: 'bg-sky-300/10 border-sky-300/40', activeBg: 'bg-sky-700 border-sky-700 text-white',
      position: 'GK', nationality: 'tchèque',
      prompt: `Style Petr Čech : gardien fiable et régulier. Stats gardien ÉLEVÉES : positionnement (82-88, stat clé absolue), reflexe_g (78-85), plongeon (76-83), jeu_a_la_main (66-74), degagement (64-72), reactivite (74-82), agilite (72-80), detente (72-80). Jeu au pied propre : passes_courtes (58-66), passes_longues (56-64). Très peu d'erreurs, calme et concentré. Stats de champ hors cage faibles mais réalistes (15-28). Penaltys (50-58). Taille 191-196cm.`
    },
    gk_kahn: {
      label: 'GK – Style Kahn', description: 'Gardien agressif et explosif, mental de leader, très fort dans les duels',
      color: 'text-red-200', bg: 'bg-red-400/10 border-red-400/40', activeBg: 'bg-red-700 border-red-700 text-white',
      position: 'GK', nationality: 'allemande',
      prompt: `Style Oliver Kahn : gardien guerrier et explosif. Stats gardien TRÈS ÉLEVÉES : reflexe_g (82-90, stat clé), plongeon (80-88), positionnement (76-84), reactivite (82-90), agilite (76-84), jeu_a_la_main (66-74), degagement (64-72), detente (78-86). Agressivite élevée pour un gardien (72-80). Force imposante (76-84). Endurance (74-82). Jeu au pied correct : passes_courtes (55-65). Stats de champ hors cage faibles mais réalistes (15-30). Penaltys (48-58). Taille 186-192cm.`
    },
    cam_payet: {
      label: 'MOC/AG – Style Payet', description: 'Artiste offensif, coups francs, créatif et imprévisible',
      color: 'text-orange-300', bg: 'bg-orange-500/10 border-orange-500/40', activeBg: 'bg-orange-500 border-orange-500 text-white',
      position: 'CAM', nationality: 'française',
      prompt: `Style Dimitri Payet : artiste offensif imprévisible. Stats clés : effet (78-86), precision_cf (76-84), tirs_loin (74-82), dribbles (72-80), passes_courtes (70-78), conduite_balle (70-78), agilite (72-80), vista (68-76). Finition correcte (65-73). Penaltys (72-80). Physique moyen. Défense faible. Taille 175-181cm.`
    },
    mc_xavi: {
      label: 'MC – Style Xavi', description: 'Chef d\'orchestre, passes courtes élite, vision, maître du tempo',
      color: 'text-red-200', bg: 'bg-red-400/10 border-red-400/40', activeBg: 'bg-red-600 border-red-600 text-white',
      position: 'CM', nationality: 'espagnole',
      prompt: `Style Xavi Hernández : maître du tempo et chef d'orchestre. Stats clés : passes_courtes (80-88), vista (78-86), passes_longues (74-82), conduite_balle (72-80), agilite (74-82), reactivite (76-84), equilibre (72-80), positionnement (76-84), interception (64-72). Endurance (72-80). Petite taille (168-176cm). Vitesse faible (48-58). Force faible (38-50). Finition faible. Penaltys (65-75).`
    },
    lw_ribery: {
      label: 'AG – Style Ribéry', description: 'Rapide, agile, bon dribbleur, percussions constantes',
      color: 'text-blue-300', bg: 'bg-blue-400/10 border-blue-400/40', activeBg: 'bg-blue-400 border-blue-400 text-white',
      position: 'LW', nationality: 'française',
      prompt: `Style Franck Ribéry : dynamiteur ailier. Stats clés : acceleration (78-86), dribbles (74-82), agilite (76-84), equilibre (74-82), vitesse_sprint (74-82). Conduite_balle (70-78). Endurance élevée. Centres corrects. Petit gabarit (170-176cm). Défense faible.`
    },
  };
  const [expandedId, setExpandedId] = useState(null);
  const [evoPlayer, setEvoPlayer] = useState(null);
  const [evoLevel, setEvoLevel] = useState(null);
  const [evoConfirmOpen, setEvoConfirmOpen] = useState(false);

  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.Season.list('-season_number', 1),
    staleTime: 30000,
  });
  const activeSeason = seasons.find(s => s.is_active) || seasons[0];
  const CURRENT_SEASON = activeSeason?.season_number || 1;

  const { data: seasonEvolutions = [] } = useQuery({
    queryKey: ['season-evolutions-academy', club?.id, CURRENT_SEASON],
    queryFn: async () => {
      const all = await base44.entities.PlayerEvolution.filter({ club_id: club.id, season: CURRENT_SEASON });
      return all.filter(e => e.is_academy === true);
    },
    staleTime: 10000,
    enabled: !!club?.id && !!activeSeason,
  });

  const MAX_EVOLUTIONS = 10;
  const totalEvolutionsThisSeason = seasonEvolutions.length;
  const limitReached = totalEvolutionsThisSeason >= MAX_EVOLUTIONS;

  const getAcademyEvoCount = (playerId) =>
    seasonEvolutions.filter(e => e.player_id === playerId).length;

  const getRealCost = (playerId, baseCost) => {
    const count = getAcademyEvoCount(playerId);
    return baseCost * (count + 1);
  };

  const evolveMutation = useMutation({
    mutationFn: async ({ player, level }) => {
      const realCost = getRealCost(player.id, level.cost);
      const newBudget = (club.budget || 0) - realCost;
      if (newBudget < 0) throw new Error('Budget insuffisant');
      const newOverall = Math.min(99, (player.overall || 0) + level.boost);
      const boost = level.boost;
      const BOOSTABLE_STATS = ['centres','finition','precision_tete','passes_courtes','volees','aptitude','tacles_debout','tacles_glisses','dribbles','effet','precision_cf','passes_longues','conduite_balle','puissance_tir','detente','endurance','force','tirs_loin','acceleration','vitesse_sprint','agilite','reactivite','equilibre','agressivite','interception','positionnement','vista','penaltys','plongeon','jeu_a_la_main','degagement','reflexe_g'];
      const statsUpdate = { overall: newOverall };
      BOOSTABLE_STATS.forEach(stat => {
        if (player[stat] != null) statsUpdate[stat] = Math.min(99, player[stat] + boost);
      });
      await base44.entities.AcademyPlayer.update(player.id, statsUpdate);
      await base44.entities.Club.update(club.id, { budget: newBudget });
      await base44.entities.PlayerEvolution.create({
        player_id: player.id,
        player_name: player.name,
        player_position: player.position,
        player_image_url: '',
        club_id: club.id,
        club_name: club.name,
        overall_before: player.overall,
        overall_after: newOverall,
        season: CURRENT_SEASON,
        is_academy: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-players'] });
      queryClient.invalidateQueries({ queryKey: ['all-clubs'] });
      queryClient.invalidateQueries({ queryKey: ['season-evolutions-academy'] });
      toast.success(`${evoPlayer?.name} a progressé ! 🚀`);
      setEvoConfirmOpen(false);
      setEvoPlayer(null);
      setEvoLevel(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Erreur');
      setEvoConfirmOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AcademyPlayer.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academy-players'] }),
  });

  const ACADEMY_STATS_FIELDS = ['centres','finition','precision_tete','passes_courtes','volees','aptitude','mauvais_pied','tacles_debout','tacles_glisses','dribbles','effet','precision_cf','passes_longues','conduite_balle','puissance_tir','detente','endurance','force','tirs_loin','acceleration','vitesse_sprint','agilite','reactivite','equilibre','agressivite','interception','positionnement','vista','penaltys','plongeon','jeu_a_la_main','degagement','reflexe_g','player_details'];

  const promoteToSenior = async (player) => {
    const detailedStats = {};
    ACADEMY_STATS_FIELDS.forEach(f => { if (player[f] != null) detailedStats[f] = player[f]; });
    await base44.entities.Player.create({
      name: player.name,
      position: player.position,
      club_id: player.club_id,
      club_name: player.club_name,
      overall: player.overall,
      potential: player.potential,
      age: player.age,
      nationality: player.nationality,
      height: player.height,
      weight: player.weight,
      value: 500000,
      pace: Math.round(((player.acceleration || 70) + (player.vitesse_sprint || 70)) / 2),
      shooting: Math.round(((player.finition || 65) + (player.puissance_tir || 65) + (player.tirs_loin || 65)) / 3),
      passing: Math.round(((player.passes_courtes || 65) + (player.passes_longues || 65) + (player.vista || 65)) / 3),
      dribbling: Math.round(((player.dribbles || 65) + (player.conduite_balle || 65) + (player.agilite || 65)) / 3),
      defending: Math.round(((player.tacles_debout || 60) + (player.tacles_glisses || 60) + (player.interception || 60)) / 3),
      physical: Math.round(((player.endurance || 65) + (player.force || 65) + (player.equilibre || 65)) / 3),
      is_academy: true,
      ...detailedStats,
    });
    await base44.entities.AcademyPlayer.delete(player.id);
    queryClient.invalidateQueries({ queryKey: ['academy-players'] });
    queryClient.invalidateQueries({ queryKey: ['players'] });
    toast.success(`${player.name} promu dans l'effectif senior !`);
  };

  const { data: academyPlayers = [], isLoading } = useQuery({
    queryKey: ['academy-players', club?.id],
    queryFn: () => base44.entities.AcademyPlayer.filter({ club_id: club.id }, '-created_date'),
    enabled: !!club?.id
  });

  const addNationality = () => {
    const val = nationalityInput.trim();
    if (val && !nationalities.includes(val)) {
      setNationalities(prev => [...prev, val]);
    }
    setNationalityInput('');
  };

  const togglePosition = (pos) => {
    setSelectedPositions(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

  const generationCost = selectedProfiles.length > 0 ? selectedProfiles.length * 1_000_000 : count * 500_000;
  const canAffordGeneration = (club?.budget || 0) >= generationCost;

  const generatePlayers = async () => {
    if (!canAffordGeneration) {
      toast.error(`Budget insuffisant. Coût : ${(generationCost / 1_000_000).toFixed(1)}M€`);
      return;
    }
    setGenerating(true);
    const existingNames = academyPlayers.map(p => p.name).join(', ');
    const natText = nationalities.length > 0 ? nationalities.join(', ') : 'française';
    const hasProfiles = selectedProfiles.length > 0;
    const isGkOnly = !hasProfiles && (selectedPositions.length === 1 && selectedPositions[0] === 'GK');
    const posText = !hasProfiles
      ? (selectedPositions.length > 0 ? selectedPositions.join(', ') : 'GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST')
      : selectedProfiles.map(k => PROFILE_TYPES[k]?.position || 'CAM').join(', ');

    const profilesBlock = hasProfiles
      ? selectedProfiles.map((key, i) => {
          const p = PROFILE_TYPES[key];
          return `Joueur ${i + 1} :\nPoste : ${p.position}\nNationalité OBLIGATOIRE : ${p.nationality}\nStyle : ${p.label}\nInstructions : ${p.prompt}`;
        }).join('\n\n')
      : '';

    const gkExtraPrompt = isGkOnly ? `
⚠️ GARDIEN SANS STYLE : génère un gardien équilibré. Stats gardien spécifiques OBLIGATOIRES (champs dédiés) : positionnement (73-82), plongeon (74-82), reflexe_g (76-84, très élevé — stat principale du gardien), jeu_a_la_main (60-70), degagement (62-72). Agilite (74-83), reactivite (76-84). Jeu au pied correct (50-65). Stats offensives très faibles (20-35). Taille 185-192cm.` : '';

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es un générateur de joueurs de centre de formation de football (CDF).
Génère ${hasProfiles ? selectedProfiles.length : count} joueur(s) avec des nationalités variées parmi: ${natText}.
${hasProfiles ? `⚠️ PROFILS SPÉCIFIQUES À RESPECTER (1 joueur par profil, dans l'ordre) :\n${profilesBlock}` : `Postes parmi: ${posText}.`}
${gkExtraPrompt}
⚠️ NOMS OBLIGATOIRES : Chaque joueur DOIT avoir un prénom et nom UNIQUE, réaliste et typique de sa nationalité (ex: nationalité brésilienne → prénom+nom brésiliens, italienne → prénom+nom italiens).
${existingNames ? `❌ NOMS INTERDITS (déjà utilisés, ne pas réutiliser) : ${existingNames}` : ''}
Invente des noms originaux, variés et cohérents avec la culture du pays. Ne jamais répéter un nom déjà existant.
- Un prénom et nom réaliste selon sa nationalité
- Age: entre 16 et 19 ans
- Taille: entre 165 et 190 cm (sauf indication contraire du profil)
- Poids: entre 60 et 85 kg (sauf indication contraire)
- Note globale: entre 66 et 75
- Potentiel: entre 87 et 93
- Position: parmi ${posText}
- Toutes les stats suivantes avec des notes réalistes selon le poste:
  centres, finition, precision_tete, passes_courtes, volees, aptitude, mauvais_pied(1-5), tacles_debout, tacles_glisses, dribbles, effet, precision_cf, passes_longues, conduite_balle, puissance_tir, detente, endurance, force, tirs_loin, acceleration, vitesse_sprint, agilite, reactivite, equilibre, agressivite, interception, positionnement, vista, penaltys
- Stats spécifiques GARDIEN : si position GK → TOUTES les stats gardien ÉLEVÉES : positionnement (78-88, stat clé du GK = Positionnement G), plongeon (74-85), reflexe_g (76-88, stat clé = Réflexe G), jeu_a_la_main (60-72), degagement (62-74). Si NON-GK → valeurs FAIBLES MAIS RÉALISTES, jamais 0 (plongeon 15-28, jeu_a_la_main 12-25, degagement 18-30, reflexe_g 15-28, positionnement selon le poste).
- penaltys : OBLIGATOIRE entre 50 et 78 pour TOUS les joueurs non-GK. Pour les GK, entre 40 et 60.
- positionnement pour NON-GK : OBLIGATOIRE réaliste selon le poste. ST/LW/RW : 38-58 (attaquants se placent offensivement). CAM : 55-68. CM/CDM : 58-72. CB/LB/RB : 60-75. JAMAIS inférieur à 35 pour un non-GK, JAMAIS 0.
- ⚠️ AUCUN STAT NE PEUT ÊTRE 0 OU INFÉRIEUR À 10. Chaque stat doit avoir une valeur réaliste selon le profil du joueur. Un gardien aura des stats offensives faibles (15-35) mais jamais 0. Un attaquant aura des stats défensives faibles (20-40) mais jamais 0.
- player_details: une courte description du joueur (style de jeu, forces, faiblesses)

Réponds en JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            players: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" }, nationality: { type: "string" }, age: { type: "number" },
                  height: { type: "number" }, weight: { type: "number" }, position: { type: "string" },
                  overall: { type: "number" }, potential: { type: "number" },
                  centres: { type: "number" }, finition: { type: "number" }, precision_tete: { type: "number" },
                  passes_courtes: { type: "number" }, volees: { type: "number" }, aptitude: { type: "number" },
                  mauvais_pied: { type: "number" }, tacles_debout: { type: "number" }, tacles_glisses: { type: "number" },
                  dribbles: { type: "number" }, effet: { type: "number" }, precision_cf: { type: "number" },
                  passes_longues: { type: "number" }, conduite_balle: { type: "number" }, puissance_tir: { type: "number" },
                  detente: { type: "number" }, endurance: { type: "number" }, force: { type: "number" },
                  tirs_loin: { type: "number" }, acceleration: { type: "number" }, vitesse_sprint: { type: "number" },
                  agilite: { type: "number" }, reactivite: { type: "number" }, equilibre: { type: "number" },
                  agressivite: { type: "number" }, interception: { type: "number" }, positionnement: { type: "number" },
                  vista: { type: "number" }, penaltys: { type: "number" }, player_details: { type: "string" },
                  plongeon: { type: "number" }, jeu_a_la_main: { type: "number" }, degagement: { type: "number" }, reflexe_g: { type: "number" }
                }
              }
            }
          }
        }
      });
      for (const p of result.players) {
        await base44.entities.AcademyPlayer.create({ ...p, club_id: club.id, club_name: club.name });
      }
      await base44.entities.Club.update(club.id, { budget: (club.budget || 0) - generationCost });
      queryClient.invalidateQueries({ queryKey: ['academy-players'] });
      queryClient.invalidateQueries({ queryKey: ['my-club'] });
      toast.success(`${result.players.length} joueur(s) généré(s) — ${(generationCost / 1_000_000).toFixed(1)}M€ dépensés`);
      setShowForm(false); setNationalities([]); setNationalityInput(''); setCount(1); setSelectedPositions([]); setSelectedProfiles([]);
    } finally {
      setGenerating(false);
    }
  };

  const STAT_LABELS = {
    centres: "Centres", finition: "Finition", precision_tete: "Précision tête",
    passes_courtes: "Passes courtes", volees: "Volées", aptitude: "Aptitude",
    mauvais_pied: "Mauvais pied", tacles_debout: "Tacles debout", tacles_glisses: "Tacles glissés",
    dribbles: "Dribbles", effet: "Effet", precision_cf: "Précision CF",
    passes_longues: "Passes longues", conduite_balle: "Conduite de balle",
    puissance_tir: "Puissance de tir", detente: "Détente", endurance: "Endurance",
    force: "Force", tirs_loin: "Tirs de loin", acceleration: "Accélération",
    vitesse_sprint: "Vitesse de sprint", agilite: "Agilité", reactivite: "Réactivité",
    equilibre: "Équilibre", agressivite: "Agressivité", interception: "Interception",
    positionnement: "Positionnement (G)", vista: "Vista", penaltys: "Penaltys",
    plongeon: "Plongeon (G)", jeu_a_la_main: "Jeu à la main (G)", degagement: "Dégagement (G)", reflexe_g: "Réflexe (G)"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Centre de Formation</h3>
          <p className="text-slate-400 text-sm">{academyPlayers.length} joueur(s) formé(s)</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-purple-500 hover:bg-purple-600" size="sm">
          <Sparkles className="w-4 h-4 mr-1" /> Générer par IA
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/70 border border-purple-500/30 rounded-2xl p-6 space-y-5">
          <h4 className="text-white font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400" />Générer des joueurs IA</h4>
          
          {/* Nationalités */}
          <div>
            <Label className="text-slate-300">Nationalités (plusieurs possibles)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={nationalityInput}
                onChange={e => setNationalityInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNationality()}
                placeholder="Ex: française, brésilienne..."
                className="bg-slate-700 border-slate-600 flex-1"
              />
              <Button onClick={addNationality} size="sm" variant="outline" className="border-slate-600 shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {nationalities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {nationalities.map(n => (
                  <span key={n} className="flex items-center gap-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs px-2.5 py-1 rounded-full">
                    {n}
                    <button onClick={() => setNationalities(prev => prev.filter(x => x !== n))} className="text-purple-400 hover:text-white ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Profil type */}
          <div>
            <Label className="text-slate-300 mb-2 block">Profils types (plusieurs sélectionnables — 1M€ chacun)</Label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedProfiles([])}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                  selectedProfiles.length === 0 ? 'bg-slate-500 border-slate-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >Aucun</button>
              {Object.entries(PROFILE_TYPES)
                .sort((a, b) => {
                  const posOrder = ['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST'];
                  return posOrder.indexOf(a[1].position) - posOrder.indexOf(b[1].position);
                })
                .map(([key, profile]) => {
                  const isSelected = selectedProfiles.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedProfiles(prev =>
                        isSelected ? prev.filter(k => k !== key) : [...prev, key]
                      )}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border relative ${
                        isSelected ? profile.activeBg : `${profile.bg} ${profile.color}`
                      }`}
                    >
                      {profile.label}
                      {isSelected && <span className="ml-1 text-xs opacity-75">✓</span>}
                    </button>
                  );
                })
              }
            </div>
            {selectedProfiles.length > 0 && (
              <p className="text-slate-400 text-xs mt-2 italic">{selectedProfiles.length} style(s) sélectionné(s) — {selectedProfiles.length}M€ — {selectedProfiles.map(k => PROFILE_TYPES[k].label).join(', ')}</p>
            )}
          </div>

          {/* Postes */}
          <div>
            <Label className="text-slate-300">Postes (plusieurs possibles — vide = tous postes)</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {POSITIONS.map(pos => (
                <button
                  key={pos}
                  onClick={() => togglePosition(pos)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                    selectedPositions.includes(pos)
                      ? 'bg-purple-500 border-purple-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre — seulement si pas de styles sélectionnés */}
          {selectedProfiles.length === 0 && (
            <div className="max-w-xs">
              <Label className="text-slate-300">Nombre de joueurs (sans style — 500K€/joueur)</Label>
              <Input type="number" value={count} onChange={e => setCount(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                min={1} max={5} className="bg-slate-700 border-slate-600 mt-1" />
            </div>
          )}

          {/* Coût de génération */}
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${canAffordGeneration ? 'bg-purple-500/10 border-purple-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <div>
              <p className={`text-sm font-semibold ${canAffordGeneration ? 'text-purple-300' : 'text-red-300'}`}>
                Coût : {(generationCost / 1_000_000).toFixed(1)}M€
                <span className="text-xs font-normal ml-2 text-slate-400">
                  ({selectedProfiles.length > 0 ? '1M€/joueur avec style' : '500K€/joueur sans style'})
                </span>
              </p>
              <p className="text-xs text-slate-500">Budget : {((club?.budget || 0) / 1_000_000).toFixed(1)}M€</p>
            </div>
            {!canAffordGeneration && <AlertTriangle className="w-5 h-5 text-red-400" />}
          </div>

          <div className="flex gap-3">
            <Button onClick={generatePlayers} disabled={generating || !canAffordGeneration} className="bg-purple-500 hover:bg-purple-600 flex-1 disabled:opacity-50">
              {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Génération en cours...</> : <><Sparkles className="w-4 h-4 mr-2" />Générer</>}
            </Button>
            <Button onClick={() => setShowForm(false)} variant="outline" className="border-slate-600">Annuler</Button>
          </div>
        </motion.div>
      )}

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-purple-500 animate-spin" /></div> : (
        <div className="space-y-3">
          {academyPlayers.map(player => (
            <motion.div key={player.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex flex-col items-center justify-center shrink-0">
                  <span className="text-white font-black text-lg leading-none">{player.overall}</span>
                  <span className="text-purple-200 text-xs">{player.position}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold">{player.name}</p>
                  <p className="text-slate-400 text-sm">{player.nationality} • {player.age} ans • {player.height}cm / {player.weight}kg</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center">
                    <p className="text-emerald-400 font-bold text-sm">{player.potential}</p>
                    <p className="text-slate-500 text-xs">Potentiel</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { setEvoPlayer(player); setEvoLevel(null); setEvoConfirmOpen(true); }} className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10" title="Faire évoluer">
                    <TrendingUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => promoteToSenior(player)} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" title="Promouvoir en senior">
                    <ArrowUpCircle className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(player.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setExpandedId(expandedId === player.id ? null : player.id)} className="text-slate-400">
                    {expandedId === player.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <AnimatePresence>
                {expandedId === player.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-700 px-4 pb-4 overflow-hidden">
                    {player.player_details && (
                      <p className="text-slate-300 text-sm mt-3 mb-4 italic">{player.player_details}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {Object.entries(STAT_LABELS).map(([key, label]) => {
                        const isGkOnlyStat = ['plongeon','jeu_a_la_main','degagement','reflexe_g'].includes(key);
                        if (isGkOnlyStat && player.position !== 'GK') return null;
                        if (player[key] === undefined || player[key] === null) return null;
                        return (
                          <div key={key} className="flex items-center justify-between bg-slate-700/40 rounded-lg px-3 py-1.5">
                            <span className="text-slate-400 text-xs">{label}</span>
                            <span className={`font-bold text-sm ${player[key] >= 70 ? 'text-emerald-400' : player[key] >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                              {player[key]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
          {academyPlayers.length === 0 && !isLoading && (
            <div className="text-center py-12 text-slate-400">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p>Aucun joueur formé pour le moment</p>
              <p className="text-sm text-slate-500 mt-1">Utilisez l'IA pour générer vos premiers talents</p>
            </div>
          )}
        </div>
      )}

      {/* Dialog d'évolution */}
      <Dialog open={evoConfirmOpen} onOpenChange={setEvoConfirmOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-400" />
              Faire évoluer {evoPlayer?.name}
            </DialogTitle>
          </DialogHeader>
          {evoPlayer && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">OVR actuel</span>
                <span className="text-white font-bold">{evoPlayer.overall} → potentiel {evoPlayer.potential}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Budget</span>
                <span className="text-white font-bold">{((club.budget || 0) / 1_000_000).toFixed(1)}M€</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Évolutions saison</span>
                <span className={limitReached ? 'text-red-400 font-bold' : 'text-white font-bold'}>{totalEvolutionsThisSeason}/{MAX_EVOLUTIONS}</span>
              </div>
              {limitReached && (
                <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-red-300 text-xs">Limite d'évolutions atteinte.</p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-2">
                {EVOLUTION_LEVELS.map((level) => {
                  const realCost = getRealCost(evoPlayer.id, level.cost);
                  const wouldExceedPotential = evoPlayer.potential && (evoPlayer.overall + level.boost) > evoPlayer.potential;
                  const affordable = (club.budget || 0) >= realCost && !limitReached && !wouldExceedPotential;
                  const alreadyEvolved = getAcademyEvoCount(evoPlayer.id) > 0;
                  return (
                    <button
                      key={level.boost}
                      disabled={!affordable}
                      onClick={() => { setEvoLevel(level); evolveMutation.mutate({ player: evoPlayer, level }); }}
                      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all
                        ${affordable ? `${level.bg} ${level.color} hover:opacity-80 cursor-pointer` : 'bg-slate-800/40 border-slate-700/40 text-slate-600 cursor-not-allowed'}`}
                    >
                      <span>{level.label}</span>
                      <span>{alreadyEvolved ? `${(realCost/1_000_000).toFixed(0)}M€` : `${(level.cost/1_000_000).toFixed(0)}M€`}{wouldExceedPotential ? ' (potentiel max)' : ''}</span>
                    </button>
                  );
                })}
              </div>
              {evolveMutation.isPending && <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}