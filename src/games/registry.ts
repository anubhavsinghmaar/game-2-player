export const worlds = {
  love: { name: 'Love Lounge', color: 'rose', description: 'Little questions. Big feelings.' },
  dark: { name: 'After Dark', color: 'lilac', description: 'A grown-up corner with a two-person lock.' },
  quiz: { name: 'Quiz Quest', color: 'gold', description: 'Put your brilliantly random knowledge to work.' },
  party: { name: 'Party Chaos', color: 'blue', description: 'An excellent excuse to get a little ridiculous.' },
  arcade: { name: 'Arcade Arena', color: 'mint', description: 'Old-school rivalry, fresh rematches.' },
  mystery: { name: 'Mystery Missions', color: 'gold', description: 'Two detectives are better than one.' },
  creative: { name: 'Creative Corner', color: 'blue', description: 'Make something weird and wonderful together.' },
  daily: { name: 'Date Night & Daily', color: 'rose', description: 'Small rituals and big night-in energy.' },
} as const;

export type World = keyof typeof worlds;
export type Engine = 'choice' | 'prediction' | 'quiz' | 'board' | 'memory' | 'puzzle' | 'story' | 'drawing' | 'truth' | 'bingo';
export type Mode = 'competitive' | 'cooperative' | 'conversation';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameDefinition = {
  id: string; title: string; world: World; engine?: Engine; minutes: number; mode: Mode;
  difficulty: Difficulty; description: string; adult: boolean; tags: string[];
};

function game(world: World, id: string, title: string, description: string, engine?: Engine,
  minutes = 5, mode: Mode = 'conversation', difficulty: Difficulty = 'easy'): GameDefinition {
  return { world, id, title, description, engine, minutes, mode, difficulty, adult: world === 'dark', tags: [world, mode, difficulty] };
}

const quizNames = [
  ['bollywood', 'Bollywood', 'Main characters, iconic films and memorable movie worlds.'],
  ['hollywood', 'Hollywood & TV', 'Remember the places, people and stories on screen.'],
  ['animals', 'Animal Kingdom', 'Meet the planet’s strangest and smartest neighbors.'],
  ['science', 'Science & Space', 'From tiny atoms to things that orbit Jupiter.'],
  ['geography', 'Geography', 'Travel by flags, landmarks and coastlines.'],
  ['history', 'History & Civilizations', 'Follow the trail of people and ideas through time.'],
  ['food', 'Food & Cuisine', 'A quick tour of the world’s kitchens.'],
  ['sports', 'Sports', 'A little cricket, football and everything in between.'],
  ['language', 'Language', 'Wordplay, meanings and everyday expressions.'],
  ['general', 'General Knowledge', 'A little bit of everything, shaken and served.'],
  ['internet', 'Internet Culture', 'Decode the habits and language of the web.'],
  ['facts', 'Mystery Facts', 'Find the real fact hiding among good guesses.'],
] as const;

export const games: GameDefinition[] = [
  game('love', 'this-or-that', 'This or That', 'Choose between two little joys. Lock in together to see where you match.', 'choice'),
  game('love', 'would-you-rather', 'Would You Rather', 'Pick between two impossible options and explain your reasoning.', 'choice'),
  game('love', 'know-me', 'How Well Do You Know Me?', 'One of you chooses what feels right. The other tries to call it. Switch roles each round.', 'prediction', 7, 'competitive'),
  game('love', 'most-likely', 'Who’s Most Likely To?', 'Point to one of your seats or to both. See what you agree on.', 'choice'),
  game('love', 'flags', 'Red Flag / Green Flag', 'Give each fictional situation a green, yellow or red flag and compare.', 'choice'),
  game('love', 'mind-meld', 'Mind Meld', 'Think of the same short answer without giving each other a hint.', 'choice', 5, 'cooperative'),
  game('love', 'hot-takes', 'Hot Takes', 'Rate each opinion on a ten-point scale, then compare.', 'choice'),
  game('love', 'timeline', 'Relationship Timeline', 'Compare the order of milestones and remembered little moments.'),
  game('love', 'future-us', 'Future Us', 'Vote on bucket-list ideas and talk through the favorites.', 'choice'),
  game('dark', 'spicy-this', 'Spicy This or That', 'Trade private choices with a romantic twist.', 'choice'),
  game('dark', 'truth-dark', 'Truth or Dare After Dark', 'Take turns choosing a conversation starter or an optional playful dare.', 'truth', 8),
  game('dark', 'confessions', 'Secret Confessions', 'Write private notes and reveal them together when you both choose.', 'choice'),
  game('dark', 'intimacy-bingo', 'Intimacy Bingo', 'Agree on romantic gestures, then make a line together.', 'bingo', 8, 'cooperative'),
  game('dark', 'flirty-predictions', 'Flirty Predictions', 'Take turns predicting each other’s choice.', 'prediction', 7, 'competitive'),
  game('dark', 'midnight', 'Midnight Roulette', 'Take turns drawing a surprise conversation card.', 'truth', 8),
  game('dark', 'blind-ranking', 'Blind Ranking', 'Rank surprise romantic plans as they arrive.'),
  ...quizNames.map(([id, name, detail]) => game('quiz', id, name, detail, 'quiz', 6, 'competitive', 'medium')),
  game('party', 'draw-guess', 'Draw & Guess', 'Sketch a secret word while your partner guesses. Trade the pencil each round.', 'drawing', 8, 'cooperative'),
  game('party', 'emoji-decoder', 'Emoji Decoder', 'Translate little pictograms into films, places and phrases.', 'quiz', 5, 'competitive'),
  game('party', 'two-truths', 'Two Truths, One Lie', 'Tell three stories, then see if your partner can spot the invented one.'),
  game('party', 'bluff-battle', 'Bluff Battle', 'Write a convincing decoy and try to spot the real answer.'),
  game('party', 'forbidden', 'Forbidden Words', 'Describe an answer out loud while avoiding the three obvious clues.', 'puzzle', 7, 'cooperative'),
  game('party', 'charades', 'Charades', 'Act out the secret prompt over your call. Your partner types the guess.', 'puzzle', 6, 'cooperative'),
  game('party', 'finish-sentence', 'Finish My Sentence', 'Write two different endings to the same ridiculous sentence.', 'choice'),
  game('party', 'five-second', 'Five Second Frenzy', 'Take turns naming three things against the clock.'),
  game('party', 'caption-clash', 'Caption Clash', 'Write a funny caption for the same imagined scene, then reveal together.', 'choice'),
  game('party', 'guess-number', 'Guess the Number', 'Make a numerical estimate. The closest answer wins.', 'quiz', 5, 'competitive'),
  game('arcade', 'tic-tac-toe', 'Tic-Tac-Toe', 'Place three marks in a row before your partner does.', 'board', 3, 'competitive'),
  game('arcade', 'connect-four', 'Connect Four', 'Drop four tokens into a line before your partner catches on.', 'board', 6, 'competitive'),
  game('arcade', 'reversi', 'Reversi', 'Sandwich opposing pieces and flip them. Finish with the most discs.', 'board', 14, 'competitive', 'hard'),
  game('arcade', 'dots-boxes', 'Dots & Boxes', 'Draw one edge at a time. Close a square to claim it and take another turn.', 'board', 7, 'competitive'),
  game('arcade', 'sea-battle', 'Sea Battle', 'Place a secret fleet and trade shots until one fleet sinks.'),
  game('arcade', 'memory-match', 'Memory Match', 'Flip two tiles to find a pair. A match earns another turn.', 'memory', 5, 'competitive'),
  game('arcade', 'rps', 'Rock Paper Scissors+', 'Lock in together. Win the most throws in a five-round set.', 'choice', 3, 'competitive'),
  game('arcade', 'reaction', 'Reaction Duel', 'Wait for the signal, then tap as fast as you can.'),
  game('arcade', 'higher-lower', 'Higher or Lower', 'Read the face-up card and bet on the next one.'),
  game('arcade', 'checkers', 'Checkers', 'Jump opposing pieces, crown kings and control the board.'),
  game('arcade', 'pong', 'Pong Duel', 'Keep the ball in play and find the gap in your partner’s defense.'),
  game('mystery', 'escape', 'Escape Together', 'Explore four locks in a cinema after midnight. Split clues, compare notes and get out before the encore.', 'puzzle', 12, 'cooperative', 'hard'),
  game('mystery', 'split-clues', 'Split Clues', 'You each see one half of the evidence. Talk it out to solve each lock.', 'puzzle', 8, 'cooperative', 'medium'),
  game('mystery', 'defuse', 'Defuse It!', 'One seat sees a toy’s controls. The other has the manual.', 'puzzle', 7, 'cooperative', 'medium'),
  game('mystery', 'detective', 'Detective Duo', 'Compare witness statements to work out who took the missing dessert.', 'puzzle', 9, 'cooperative', 'medium'),
  game('mystery', 'code-breakers', 'Code Breakers', 'Break word and number ciphers with progressive hints.', 'puzzle', 7, 'cooperative', 'medium'),
  game('mystery', 'word-partners', 'Word Partners', 'Trade short clues to guess the secret word.'),
  game('mystery', 'puzzle-relay', 'Puzzle Relay', 'Alternate clues to unlock an accumulating solution.', 'puzzle', 8, 'cooperative'),
  game('mystery', 'mystery-object', 'Mystery Object', 'Ask up to twenty yes-or-no questions about a hidden object.'),
  game('creative', 'paint', 'Paint Together', 'Share one sketchpad. Add your own marks and undo your last stroke.', 'drawing', 8, 'cooperative'),
  game('creative', 'doodle', 'Doodle Duel', 'Sketch the same prompt on separate canvases and reveal your drawings.'),
  game('creative', 'story', 'Story Builder', 'Write one sentence at a time and give your story an ending you could only make together.', 'story', 8, 'cooperative'),
  game('creative', 'dream-date', 'Dream Date Designer', 'Take turns choosing the ingredients for one date you would both enjoy.', 'story', 8, 'cooperative'),
  game('creative', 'love-letter', 'Love Letter Challenge', 'Write each other a little letter and open both at once.', 'choice', 8),
  game('creative', 'describe-draw', 'Describe & Draw', 'Describe a private reference pattern and compare it with the drawing.'),
  game('daily', 'mystery-date', 'Mystery Date', 'Pick a setting and uncover a surprise night-in or outing.', 'story', 5, 'cooperative'),
  game('daily', 'daily-teaser', 'Daily Brain Teaser', 'Work together on today’s bite-sized logic puzzle.', 'puzzle', 5, 'cooperative', 'medium'),
  game('daily', 'daily-word', 'Daily Word Puzzle', 'Solve a shared word riddle from a date-keyed rotation.', 'puzzle', 5, 'cooperative'),
  game('daily', 'couple-bingo', 'Couple Bingo', 'Make a line by completing little activities together.', 'bingo', 10, 'cooperative'),
  game('daily', 'pick-night', 'Pick Our Night', 'Vote privately on tonight’s plan and see where you overlap.', 'choice'),
  game('daily', 'capsule', 'Memory Capsule', 'Write a jointly approved note to open on a future date.'),
];

export const byId = Object.fromEntries(games.map((item) => [item.id, item])) as Record<string, GameDefinition | undefined>;
export const playable = games.filter((item) => item.engine);
