import { existsSync } from 'node:fs';
import { quizzes } from '../src/data/quiz.ts';
import { adultDecks, choiceDecks, truthCards } from '../src/data/prompts.ts';
import { puzzles } from '../src/data/scenarios.ts';
import { mediaManifest } from '../src/data/mediaManifest.ts';
import { byId, games } from '../src/games/registry.ts';

const problems: string[] = [];
const ids = new Set<string>();
const prompts = new Set<string>();
const normalized = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const duplicate = (set: Set<string>, key: string, label: string) => {
  if (set.has(key)) problems.push(`${label}: duplicate ${key}`);
  set.add(key);
};
const length = (id: string, value: string, max: number) => {
  if (!value.trim() || value.length > max) problems.push(`${id}: missing or overly long text`);
};
for (const [deck, entries] of Object.entries(quizzes)) {
  if (byId[deck]?.engine !== 'quiz' || entries.length < 5) problems.push(`${deck}: invalid quiz pack`);
  for (const q of entries) {
    duplicate(ids, q.id, 'Quiz ID');
    duplicate(prompts, normalized(q.prompt), 'Quiz prompt');
    length(q.id, q.prompt, 190);
    length(q.id, q.explanation, 350);
    if (!Number.isInteger(q.answer) || q.options && (q.options.length < 2 || q.options.length > 6 || q.answer < 0 || q.answer >= q.options.length)) problems.push(`${q.id}: invalid answer`);
    if (!q.options && Math.abs(q.answer) > 99_999_999) problems.push(`${q.id}: estimate exceeds the input range`);
    if (q.options && new Set(q.options.map(normalized)).size !== q.options.length) problems.push(`${q.id}: repeated options`);
    q.options?.forEach((value) => length(q.id, value, 110));
    if (!['easy', 'medium', 'hard'].includes(q.difficulty)) problems.push(`${q.id}: invalid difficulty`);
    if (q.source && !q.source.startsWith('https://')) problems.push(`${q.id}: invalid source URL`);
    if (q.media && !mediaManifest[q.media]) problems.push(`${q.id}: missing media record`);
  }
}
for (const [id, asset] of Object.entries(mediaManifest)) {
  if (!asset.source.startsWith('https://') || !asset.credit || !asset.license || !asset.verified || !existsSync(`public${asset.path}`)) problems.push(`${id}: missing local media or attribution`);
}
for (const [id, deck] of Object.entries({ ...choiceDecks, ...Object.fromEntries(Object.entries(adultDecks).map(([key, values]) => [key, values.flat()])) })) {
  if (!byId[id] || byId[id].adult !== (id in adultDecks)) problems.push(`${id}: adult flag mismatch`);
  const distinct = new Set<string>();
  for (const item of deck) {
    duplicate(distinct, normalized([item.question, ...(item.options ?? [])].join('|')), id);
    length(id, item.question, 220);
    if (item.options && new Set(item.options.map(normalized)).size !== item.options.length) problems.push(`${id}: duplicate options`);
  }
}
for (const [id, items] of Object.entries(puzzles)) {
  if (byId[id]?.engine !== 'puzzle') problems.push(`${id}: puzzle without game`);
  for (const item of items) {
    length(id, item.a, 500);
    length(id, item.b, 500);
    if (!item.answer.length || item.answer.some((answer) => !normalized(answer))) problems.push(`${id}: missing solution`);
  }
}
if (truthCards.length !== 3 || truthCards.some((level) => level.length !== 4 || level.some((pair) => pair.length !== 2))) problems.push('Truth or Dare must have four truth/dare pairs at each of the three levels.');
if (games.length !== 70 || new Set(games.map((game) => game.id)).size !== 70) problems.push('Catalog must contain 70 distinct IDs.');
if (problems.length) {
  process.stderr.write(problems.join('\n') + '\n');
  process.exitCode = 1;
} else process.stdout.write(`Validated ${games.length} catalog entries, ${ids.size} quiz questions, scenario and prompt packs, and ${Object.keys(mediaManifest).length} local media records.\n`);
