import { supabase } from './supabase';

const LEVELS = ['Challenger', 'Performer', 'All Star', 'Alto desempeño', 'Marathon Legend'];

/**
 * Checks if the user has completed all active challenges and simulations for their current classification.
 * If yes, promotes the user to the next level.
 * 
 * @param {object} profile The user profile object
 * @returns {Promise<{promoted: boolean, nextLevel?: string}>}
 */
export async function checkLevelProgression(profile) {
  if (!profile || !profile.id || !profile.classification) {
    return { promoted: false };
  }

  const currentLevel = profile.classification;
  const currentIndex = LEVELS.indexOf(currentLevel);

  // If already at the highest level, no progression needed
  if (currentIndex === -1 || currentIndex >= LEVELS.length - 1) {
    return { promoted: false };
  }

  const today = new Date().toISOString().split('T')[0];

  // 1. Fetch all active daily challenges for the user's segment and current classification
  let chQuery = supabase.from('daily_challenges')
    .select('id')
    .eq('classification_target', currentLevel);

  if (profile.brand_id) {
    chQuery = chQuery.eq('brand_id', profile.brand_id);
  }
  if (profile.role) {
    chQuery = chQuery.or(`role_target.is.null,role_target.cs.{"${profile.role.toLowerCase()}"}`);
  }
  if (profile.store_id) {
    chQuery = chQuery.or(`store_ids.is.null,store_ids.cs.{"${profile.store_id}"}`);
  }

  const { data: activeChallenges, error: chError } = await chQuery;
  if (chError) {
    console.error('Error fetching active challenges for progression check:', chError);
    return { promoted: false };
  }

  // 2. Fetch all active simulations for the user's segment and current classification
  let simQuery = supabase.from('simulations')
    .select('id')
    .eq('classification_target', currentLevel)
    .lte('active_date', today)
    .gte('end_date', today);

  if (profile.brand_id) {
    simQuery = simQuery.eq('brand_id', profile.brand_id);
  }
  if (profile.role) {
    simQuery = simQuery.or(`role_target.is.null,role_target.cs.{"${profile.role.toLowerCase()}"}`);
  }
  if (profile.store_id) {
    simQuery = simQuery.or(`store_ids.is.null,store_ids.cs.{"${profile.store_id}"}`);
  }

  const { data: activeSimulations, error: simError } = await simQuery;
  if (simError) {
    console.error('Error fetching active simulations for progression check:', simError);
    return { promoted: false };
  }

  const activeChallengeIds = (activeChallenges || []).map(c => c.id);
  const activeSimIds = (activeSimulations || []).map(s => s.id);

  // If there are absolutely no active modules for their current level, we don't auto-promote
  if (activeChallengeIds.length === 0 && activeSimIds.length === 0) {
    return { promoted: false };
  }

  // 3. Fetch user's completed challenges (score > 0)
  const { data: userProgress, error: upError } = await supabase.from('user_progress')
    .select('challenge_id')
    .eq('user_id', profile.id)
    .gt('score', 0);

  if (upError) {
    console.error('Error fetching user progress for progression check:', upError);
    return { promoted: false };
  }

  // 4. Fetch user's completed simulations (score > 0)
  const { data: userSimProgress, error: uspError } = await supabase.from('user_simulation_progress')
    .select('simulation_id')
    .eq('user_id', profile.id)
    .gt('score', 0);

  if (uspError) {
    console.error('Error fetching user simulation progress for progression check:', uspError);
    return { promoted: false };
  }

  const completedChallengeIds = new Set((userProgress || []).map(p => p.challenge_id));
  const completedSimIds = new Set((userSimProgress || []).map(p => p.simulation_id));

  // Verify that all active challenges and simulations of their current level are completed
  const allChallengesDone = activeChallengeIds.every(id => completedChallengeIds.has(id));
  const allSimsDone = activeSimIds.every(id => completedSimIds.has(id));

  if (allChallengesDone && allSimsDone) {
    const nextLevel = LEVELS[currentIndex + 1];
    
    // Promote user in the database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ classification: nextLevel })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Error updating user classification to:', nextLevel, updateError);
      return { promoted: false };
    }

    return { promoted: true, nextLevel };
  }

  return { promoted: false };
}
