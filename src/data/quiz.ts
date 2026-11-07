export type Question = {
  id: string; prompt: string; options?: string[]; answer: number;
  explanation: string; difficulty: 'easy' | 'medium' | 'hard'; source?: string; media?: string;
};
type Row = [prompt: string, answer: string, alternatives: string, explanation: string, source?: string, media?: string];

const yrf = 'https://www.yashrajfilms.com/movies/';
const zoo = 'https://nationalzoo.si.edu/animals/';
const nasa = 'https://science.nasa.gov/';
const noaa = 'https://www.fisheries.noaa.gov/species/';

function deck(id: string, rows: Row[]): Question[] {
  return rows.map(([prompt, correct, alternatives, explanation, source, media], index) => {
    const options = alternatives.split('|');
    const answer = (index * 7 + 1) % (options.length + 1);
    options.splice(answer, 0, correct);
    return { id: `${id}-${index + 1}`, prompt, options, answer, explanation, source, media,
      difficulty: index % 5 === 4 ? 'hard' : index % 2 ? 'medium' : 'easy' };
  });
}

const bollywood = deck('bollywood', [
  ['Where do Raj and Simran first meet in DDLJ?', 'On a European rail holiday', 'At a Mumbai cinema|On a Kashmir trek|At a wedding in Delhi', 'They meet during a trip around Europe by train.', yrf + 'dilwale-dulhania-le-jayenge'],
  ['Which team does Kabir Khan coach in Chak De! India?', 'Indian women’s national field hockey team', 'Indian men’s cricket team|Indian women’s football team|Indian junior basketball team', 'Kabir brings players from across India together into a field hockey team.', yrf + 'chak-de-india'],
  ['Who plays ACP Jai Dixit in Dhoom?', 'Abhishek Bachchan', 'John Abraham|Uday Chopra|Hrithik Roshan', 'Abhishek Bachchan plays the officer pursuing a motorcycle gang.', yrf + 'dhoom'],
  ['What is Veer’s job in Veer-Zaara?', 'Air Force rescue pilot', 'Train conductor|Cricket coach|Classical singer', 'Veer is an Indian Air Force pilot who rescues Zaara following a bus accident.', yrf + 'veer-zaara'],
  ['What is the boarding school called in Mohabbatein?', 'Gurukul', 'New Era High|St. Teresa|Woodstock', 'Gurukul is run by the stern Narayan Shankar.', yrf + 'mohabbatein'],
  ['What business do Shruti and Bittoo start in Band Baaja Baaraat?', 'Wedding planning', 'Film editing|Spice export|Clothing design', 'The pair become wedding planners in Delhi.', yrf + 'band-baaja-baaraat'],
  ['What career does Naina pursue in Hichki?', 'Teaching', 'Civil engineering|Journalism|Wildlife photography', 'Naina wants to teach, and is hired to work with a class of underdogs.', yrf + 'hichki'],
  ['What is Karan’s profession in Hum Tum?', 'Cartoonist', 'Chef|Architect|Musician', 'Karan draws the comic characters Hum and Tum.', yrf + 'hum-tum'],
  ['Where is the opening train heist in Dhoom 2?', 'Namib Desert', 'Gobi Desert|Thar Desert|Atacama Desert', 'The film opens with a heist on a train crossing the Namib Desert.', yrf + 'dhoom-2'],
  ['What are the given names of Bunty and Babli?', 'Rakesh and Vimmi', 'Rahul and Pooja|Karan and Rhea|Veer and Zaara', 'Rakesh and Vimmi take on Bunty and Babli as their aliases.', yrf + 'bunty-aur-babli'],
  ['Who plays Pooja in Dil To Pagal Hai?', 'Madhuri Dixit', 'Kajol|Karisma Kapoor|Rani Mukerji', 'Madhuri plays Pooja, and Karisma plays Nisha.', yrf + 'dil-to-pagal-hai'],
  ['Which city does Tiger travel to on assignment in Ek Tha Tiger?', 'Dublin', 'Oslo|Seoul|Prague', 'Tiger’s assignment takes him to Dublin.', yrf + 'ek-tha-tiger'],
  ['Who plays Harpreet in Rocket Singh: Salesman of the Year?', 'Ranbir Kapoor', 'Shahid Kapoor|Ayushmann Khurrana|Farhan Akhtar', 'Ranbir plays Harpreet Singh Bedi, a young salesman.', yrf + 'rocket-singh-salesman-of-the-year'],
  ['What is Dia trying to save in Aaja Nachle?', 'The Ajanta theatre', 'A hill railway|A neighborhood bakery|A cricket ground', 'Dia returns to save the Ajanta performance space.', yrf + 'aaja-nachle'],
  ['Who directed Sui Dhaaga: Made in India?', 'Sharat Katariya', 'Maneesh Sharma|Zoya Akhtar|Habib Faisal', 'Sharat Katariya also wrote the film.', yrf + 'sui-dhaaga-made-in-india'],
  ['Who composed the music for Rab Ne Bana Di Jodi?', 'Salim–Sulaiman', 'Vishal–Shekhar|Shankar–Ehsaan–Loy|Ajay–Atul', 'Salim and Sulaiman Merchant are the credited composers.', yrf + 'rab-ne-bana-di-jodi'],
  ['Who plays Sanjay Singhania in the 2008 Hindi film Ghajini?', 'Aamir Khan', 'Saif Ali Khan|Anil Kapoor|Akshay Kumar', 'Aamir plays Sanjay in the Hindi remake, directed by A. R. Murugadoss.'],
  ['Who directed the Hindi film Lagaan?', 'Ashutosh Gowariker', 'Vidhu Vinod Chopra|Rajkumar Hirani|Anurag Kashyap', 'Ashutosh Gowariker directed the story of a village that stakes its tax bill on a cricket match.'],
  ['Which character does Kareena Kapoor play in Jab We Met?', 'Geet', 'Aditi|Naina|Simran', 'Geet meets Aditya on a train and changes the direction of his life.'],
  ['What is the surname of the wrestling family in Dangal?', 'Phogat', 'Chauhan|Malik|Sangwan', 'Dangal follows Mahavir Singh Phogat and his daughters Geeta and Babita.'],
]);

const animals = deck('animals', [
  ['What can a sea otter use to crack open shelled prey?', 'A stone', 'A strand of kelp|Its tail|A feather', 'Sea otters use hard objects such as rocks as tools to break open prey.', 'https://www.usgs.gov/publications/sea-otter-foraging-behavior', 'sea-otter'],
  ['What is a narwhal’s tusk?', 'An elongated tooth', 'A horn made of keratin|An external bone|A fused set of scales', 'The tusk is a tooth that can grow through the upper lip.', noaa + 'narwhal'],
  ['Why do humpback whales sometimes create a net of bubbles?', 'To concentrate prey', 'To keep calves warm|To shed skin|To navigate at night', 'The bubbles can corral fish into a compact group for feeding.', noaa + 'humpback-whale'],
  ['What forms a giant panda’s pseudo-thumb?', 'A modified wrist bone', 'An extra knuckle|A claw|A patch of thick skin', 'An enlarged wrist bone helps the panda hold bamboo.', zoo + 'giant-panda'],
  ['How many hearts does an octopus have?', 'Three', 'One|Two|Four', 'Two hearts pump blood to the gills, and a third circulates blood through the body.', 'https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/cephalopods'],
  ['What does a running cheetah use like a rudder?', 'Its tail', 'Its whiskers|Its ears|Its shoulder blades', 'The tail helps the cheetah balance and steer during sudden turns.', zoo + 'cheetah'],
  ['What can an Asian elephant cool itself with by flapping?', 'Its ears', 'Its tusks|Its eyelashes|Its toenails', 'Blood vessels in the ears help transfer heat away from the body.', zoo + 'asian-elephant'],
  ['What does a Komodo dragon use to collect airborne scent particles?', 'A forked tongue', 'Its claws|Its tail|Its eyelashes', 'The tongue carries chemical samples to a sensory organ in the mouth.', zoo + 'komodo-dragon'],
  ['What makes up most of a red panda’s diet?', 'Bamboo', 'Pine nuts|Mangoes|Fish', 'Red pandas are primarily bamboo eaters, although they can eat other foods.', zoo + 'red-panda'],
  ['What do giant manta rays filter from seawater?', 'Zooplankton', 'Seaweed|Jellyfish eggs exclusively|Sand grains', 'Giant manta rays are filter feeders that consume small marine animals.', noaa + 'giant-manta-ray/science'],
  ['What does a blue whale use to strain krill?', 'Baleen', 'Molars|A hollow tusk|An outer jawbone', 'Baleen plates trap food while water escapes.', noaa + 'blue-whale/resources'],
  ['Which animal has a lower fourth tooth that fits into an upper socket when its jaw is shut?', 'American alligator', 'Saltwater crocodile|Green iguana|Gila monster', 'That socket hides the tooth, a useful distinction from crocodiles.', zoo + 'american-alligator'],
  ['Which mammals are capable of sustained powered flight?', 'Bats', 'Flying squirrels|Sugar gliders|Colugos', 'Bats actively flap their wings; the others glide.'],
  ['Which animal is a monotreme?', 'Platypus', 'Koala|Wombat|Sloth', 'Monotremes are mammals that lay eggs.'],
  ['What do butterflies use to taste a leaf they land on?', 'Their feet', 'Their wings|Their eyes|Their antennae alone', 'Taste receptors on the feet help butterflies assess plants.'],
  ['Which animal is a bird?', 'Kiwi', 'Axolotl|Quokka|Tuatara', 'Kiwi are flightless birds native to New Zealand.'],
  ['What kind of animal is an axolotl?', 'Salamander', 'Lizard|Fish|Flatworm', 'An axolotl is an aquatic amphibian that typically retains external gills into adulthood.'],
  ['Which penguin incubates its egg on its feet during the Antarctic winter?', 'Emperor penguin', 'Little penguin|Galápagos penguin|African penguin', 'Male emperor penguins balance eggs on their feet under a warm brood pouch.'],
  ['What forms the principal food of adult giant anteaters?', 'Ants and termites', 'Grasses|Nectar|Small fish', 'Their long, sticky tongues collect insects from nests.'],
  ['What makes flamingo feathers pink?', 'Pigments in their food', 'Salt in the water|Heat from the sun|Air trapped in feathers', 'Flamingos obtain carotenoids from foods such as algae and crustaceans.'],
]);

const science = deck('science', [
  ['Which crew took this photograph of Earth, known as the Blue Marble?', 'Apollo 17', 'Apollo 8|Gemini 4|Skylab 2', 'The Apollo 17 crew photographed Earth on its way to the Moon in 1972.', nasa + 'resource/the-blue-marble/', 'blue-marble'],
  ['Which planet do Phobos and Deimos orbit?', 'Mars', 'Venus|Jupiter|Neptune', 'Phobos is the larger and closer of Mars’s two moons.', nasa + 'mars/moons/'],
  ['Which planet has a shorter year than Earth’s but a longer year than Mercury’s?', 'Venus', 'Mars|Saturn|Uranus', 'Venus is between Mercury and Earth in orbital order.', nasa + 'venus/facts/'],
  ['Which is the largest moon in the Solar System?', 'Ganymede', 'Titan|Earth’s Moon|Triton', 'Jupiter’s Ganymede is larger in diameter than Mercury.', nasa + 'jupiter/moons/ganymede/'],
  ['What is the name of the galaxy that contains our Sun?', 'Milky Way', 'Andromeda|Triangulum|Whirlpool', 'The Sun orbits the center of the Milky Way.', nasa + 'universe/galaxies/'],
  ['What does a light-year measure?', 'Distance', 'Time|Brightness|Temperature', 'It is the distance light travels in one year.'],
  ['Which element has the symbol Na?', 'Sodium', 'Nitrogen|Neon|Nickel', 'Na comes from natrium, a Latin name for sodium.'],
  ['What is the charge of a proton?', 'Positive', 'Negative|Neutral|It alternates', 'Protons have positive charge and are found in atomic nuclei.'],
  ['What is the most abundant gas in dry Earth air?', 'Nitrogen', 'Oxygen|Argon|Carbon dioxide', 'Nitrogen makes up about 78 percent by volume.'],
  ['Which organelles carry out photosynthesis in plant cells?', 'Chloroplasts', 'Ribosomes|Mitochondria|Lysosomes', 'Chloroplasts contain pigments that capture light.'],
  ['What process powers the Sun?', 'Nuclear fusion', 'Combustion|Nuclear fission|Radioactive decay alone', 'In the core, hydrogen nuclei fuse through a chain of reactions that produces helium.'],
  ['Which unit measures electrical resistance?', 'Ohm', 'Watt|Volt|Ampere', 'One ohm equals one volt per ampere.'],
  ['What kind of wave is sound in air?', 'Longitudinal', 'Electromagnetic|A surface water wave|Static', 'Air molecules oscillate parallel to the direction the sound travels.'],
  ['What is dry ice made from?', 'Solid carbon dioxide', 'Solid nitrogen|Compressed water|Frozen helium', 'Dry ice typically sublimates directly into gas at ordinary pressure.'],
  ['Which part of the eye contains light-sensitive rods and cones?', 'Retina', 'Iris|Lens|Cornea', 'Photoreceptor cells in the retina respond to incoming light.'],
  ['Which force holds the Moon in orbit around Earth?', 'Gravity', 'Magnetism|Friction|Air resistance', 'The Moon’s motion and Earth’s gravity produce its orbit.'],
  ['Which planet has the Great Red Spot?', 'Jupiter', 'Mars|Neptune|Saturn', 'The Great Red Spot is a long-lived storm in Jupiter’s atmosphere.', nasa + 'jupiter/facts/'],
  ['Which type of eclipse occurs when the Moon passes between Earth and the Sun?', 'Solar eclipse', 'Lunar eclipse|Equinox|Transit of Venus', 'The Moon casts a shadow across part of Earth.', nasa + 'eclipses/'],
  ['What determines the atomic number of an element?', 'Number of protons', 'Number of neutrons|Total number of nucleons|Mass in grams', 'The proton count defines the element.'],
  ['What is the chemical formula of ozone?', 'O₃', 'CO₂|O₂|NO₂', 'An ozone molecule contains three oxygen atoms.'],
]);

export const quizzes: Record<string, Question[]> = {
  bollywood, animals, science,
  hollywood: deck('hollywood', [
    ['Which instrument does the title character play in The Pianist?', 'Piano', 'Violin|Trumpet|Clarinet', 'The film follows Polish pianist Władysław Szpilman.'],
    ['Who directed Jurassic Park (1993)?', 'Steven Spielberg', 'James Cameron|Ridley Scott|George Lucas', 'Spielberg directed the adaptation of Michael Crichton’s novel.'],
    ['What is the name of the coffee shop in Friends?', 'Central Perk', 'Monk’s|Café Nervosa|Luke’s', 'Central Perk is the regular meeting spot.'],
    ['Where does Finding Nemo begin?', 'Great Barrier Reef', 'Arctic Ocean|Lake Victoria|Bay of Bengal', 'Nemo and Marlin live on the Great Barrier Reef.'],
    ['Which metal is the Tin Man made of in his name?', 'Tin', 'Steel|Copper|Brass', 'The Tin Man is one of Dorothy’s companions in The Wizard of Oz.'],
  ]),
  geography: deck('geography', [
    ['Which country’s flag features a maple leaf?', 'Canada', 'Finland|Austria|Denmark', 'Canada uses a red maple leaf with 11 points.'],
    ['Which Indian state contains the city of Kochi?', 'Kerala', 'Goa|Karnataka|Odisha', 'Kochi is a port city on India’s southwestern coast.'],
    ['Which continent contains the Andes?', 'South America', 'Asia|North America|Africa', 'The mountain range follows the western side of South America.'],
    ['Which country is home to the city of Kyoto?', 'Japan', 'China|Thailand|Vietnam', 'Kyoto is on Honshu, Japan’s largest island.'],
    ['Which sea lies between Italy and the Balkans?', 'Adriatic Sea', 'Black Sea|North Sea|Baltic Sea', 'The Adriatic is an arm of the Mediterranean.'],
  ]),
  history: deck('history', [
    ['Which empire built much of the road network used by the Incas?', 'Inca Empire', 'Roman Empire|Mughal Empire|Ottoman Empire', 'The Qhapaq Ñan integrated extensive Andean roads.'],
    ['Which ruler commissioned the Taj Mahal?', 'Shah Jahan', 'Akbar|Aurangzeb|Babur', 'Shah Jahan commissioned it in memory of Mumtaz Mahal.'],
    ['What ancient writing system used wedge-shaped impressions?', 'Cuneiform', 'Morse code|Braille|Ogham', 'Scribes pressed a stylus into soft clay to form wedge shapes.'],
    ['Which Roman city was buried by Vesuvius in 79 CE?', 'Pompeii', 'Athens|Carthage|Ravenna', 'Volcanic deposits buried Pompeii and nearby settlements.'],
    ['What was the Rosetta Stone crucial for deciphering?', 'Egyptian hieroglyphs', 'Inca quipu|Linear A|Norse runes', 'It carried related text in three scripts, including Greek.'],
  ]),
  food: deck('food', [
    ['What gives traditional idli batter its rise?', 'Fermentation', 'Egg whites|Whipped cream|Steam alone', 'Fermentation produces gas in the batter before steaming.'],
    ['Which pulse is the main ingredient in hummus?', 'Chickpea', 'Black gram|Green pea|Red lentil', 'Hummus typically blends chickpeas, tahini, lemon and garlic.'],
    ['What ingredient is used to make matcha?', 'Powdered green tea leaves', 'Ground sesame|Roasted barley|Dried mint', 'Matcha is finely ground from specially prepared green tea leaves.'],
    ['What is halloumi known for when cooked?', 'Holding its shape', 'Turning blue|Melting instantly|Tripling in volume', 'Its high melting point makes it suitable for grilling.'],
    ['What part of a crocus flower is harvested as saffron?', 'Stigmas', 'Roots|Petals|Leaves', 'The red stigmas are collected and dried.'],
  ]),
  sports: deck('sports', [
    ['How many legal balls make a standard over in cricket?', 'Six', 'Four|Five|Eight', 'Wides and no-balls do not count as legal deliveries.'],
    ['In association football, how many players may one side start with?', 'Eleven', 'Nine|Ten|Twelve', 'A starting eleven includes one goalkeeper.'],
    ['What is a badminton projectile called?', 'Shuttlecock', 'Puck|Jack|Baton', 'The shuttlecock has a weighted base and a skirt or feathers.'],
    ['What does love mean in tennis scoring?', 'Zero', 'Fifteen|Thirty|Forty', 'A server at love has yet to win a point in that game.'],
    ['In chess, which piece can jump over occupied squares during a normal move?', 'Knight', 'Bishop|Rook|Queen', 'Knights move in an L shape and can leap over other pieces.'],
  ]),
  language: deck('language', [
    ['Which word reads the same forwards and backwards?', 'Level', 'Lemon|Lever|Local', 'Level is a palindrome.'],
    ['What does the Hindi word “paani” mean?', 'Water', 'Wind|Bread|Light', 'Paani is a common Hindi word for water.'],
    ['What is the plural of “criterion”?', 'Criteria', 'Criterions only|Criterias|Criterii', 'Criteria is the standard plural form.'],
    ['What does “spill the beans” usually mean?', 'Reveal a secret', 'Waste money|Make a meal|Lose your temper', 'The idiom refers to giving away information.'],
    ['What is a word made by rearranging the letters of another?', 'Anagram', 'Synonym|Homophone|Acronym', 'LISTEN and SILENT form an anagram pair.'],
  ]),
  general: deck('general', [
    ['How many sides does a dodecagon have?', 'Twelve', 'Ten|Eleven|Twenty', 'Dodeca comes from a Greek word for twelve.'],
    ['What does the S in ISBN stand for?', 'Standard', 'Series|Shelf|Story', 'ISBN means International Standard Book Number.'],
    ['Which musical symbol raises a written note by a semitone?', 'Sharp', 'Flat|Natural|Rest', 'A sharp indicates a pitch one semitone higher.'],
    ['Which classic puzzle is played with disks of different sizes on three pegs?', 'Tower of Hanoi', 'Sudoku|Tangram|Mastermind', 'Players must move the stack without placing a bigger disk on a smaller one.'],
    ['What is the SI base unit of mass?', 'Kilogram', 'Gram|Newton|Tonne', 'The kilogram is the SI base unit.'],
    ['How many squares are on a standard chessboard?', '64', '49|81|100', 'The board has eight ranks and eight files.'],
    ['Which art technique uses small pieces to build a larger picture?', 'Mosaic', 'Etching|Casting|Origami', 'Mosaics can be made with glass, stone or other small pieces.'],
  ]),
  internet: deck('internet', [
    ['What does URL stand for?', 'Uniform Resource Locator', 'Universal Router Link|User Request Log|Unified Reference List', 'A URL identifies a resource and how to reach it.'],
    ['What does the HTTP status 404 indicate?', 'Not Found', 'OK|Moved Permanently|Unauthorized', 'A 404 response means the requested resource was not found.'],
    ['Which format is associated with short looped animations and a 256-color palette per frame?', 'GIF', 'JPEG|MP3|TXT', 'GIF uses indexed color and can store multiple animation frames.'],
    ['What was the name of the first widely recognized webcam subject at Cambridge?', 'A coffee pot', 'A fountain|A cat shelter|A clock tower', 'The Trojan Room camera let researchers check whether coffee was available.'],
    ['What does HTML describe on a web page?', 'Document structure', 'Network encryption|Domain ownership|Image compression', 'HTML is a markup language for document structure and semantics.'],
  ]),
  facts: deck('facts', [
    ['Which of these is botanically a berry?', 'Banana', 'Strawberry|Raspberry|Blackberry', 'A banana develops from a single ovary. Those other fruits have different structures.'],
    ['Which animal produces cube-shaped droppings?', 'Wombat', 'Wallaby|Koala|Platypus', 'Wombat intestines shape the droppings into cubes.'],
    ['Which can transmit sound fastest under ordinary conditions?', 'Steel', 'Air|Water|A vacuum', 'Sound travels faster through steel than water or air, and cannot travel through a vacuum.'],
    ['Which food can crystallize without necessarily spoiling?', 'Honey', 'Fresh lettuce|Cooked rice|Scrambled egg', 'Glucose can separate into crystals as honey stands.'],
    ['Which planet rotates in the opposite direction to Earth?', 'Venus', 'Mars|Jupiter|Saturn', 'Venus has retrograde rotation.'],
  ]),
  'emoji-decoder': deck('emoji', [
    ['🦁 👑', 'The Lion King', 'King Kong|The Jungle Book|Madagascar', 'A lion who becomes king.'],
    ['🐠 🔎 🌊', 'Finding Nemo', 'Shark Tale|Free Willy|Moana', 'The search for a little fish.'],
    ['🕷️ 🧑 🏙️', 'Spider-Man', 'Ant-Man|Batman|Iron Man', 'A spider-themed hero in the city.'],
    ['❄️ 👭 ⛄', 'Frozen', 'Brave|Tangled|Encanto', 'Two sisters, winter magic and a snowman.'],
    ['🐼 🥋', 'Kung Fu Panda', 'Turning Red|The Karate Kid|Mulan', 'Po is a panda who studies kung fu.'],
    ['🧸 🚀 🤠', 'Toy Story', 'Wall-E|Lightyear|Up', 'Toys Buzz and Woody share the spotlight.'],
    ['🎈 🏠 👴', 'Up', 'Coco|Soul|Inside Out', 'An old man lifts his house with balloons.'],
    ['💀 🎸 🕯️', 'Coco', 'Soul|Book of Life|Fantasia', 'Music and Día de Muertos are central to Coco.'],
    ['🦖 🏝️ 🚙', 'Jurassic Park', 'Godzilla|King Kong|Jumanji', 'Dinosaurs roam a park on an island.'],
    ['🍫 🏭 🎫', 'Charlie and the Chocolate Factory', 'Ratatouille|Matilda|Big', 'The golden ticket opens a chocolate factory.'],
    ['👻 🚫 🚗', 'Ghostbusters', 'Casper|Beetlejuice|Poltergeist', 'The team’s famous emblem combines a ghost and a prohibition sign.'],
    ['🌧️ 🐈 🐕', 'Raining cats and dogs', 'Cat got your tongue|Chasing your tail|Under the weather', 'The idiom means it is raining heavily.'],
    ['🧊 🔨 🤝', 'Break the ice', 'Cold feet|On thin ice|Snowed under', 'A friendly first move can make people more comfortable.'],
    ['🥚 🥚 🧺', 'Putting all your eggs in one basket', 'Spilling the beans|Walking on eggshells|A piece of cake', 'The idiom warns about concentrating risk.'],
    ['🍰 ✅', 'A piece of cake', 'The icing on the cake|A bun in the oven|Taking the biscuit', 'The idiom means something is easy.'],
    ['🐘 🛋️', 'The elephant in the room', 'A dark horse|The black sheep|A wild goose chase', 'It is an obvious issue nobody wants to discuss.'],
    ['🧱 🇨🇳 🥾', 'Great Wall of China', 'Berlin Wall|Hadrian’s Wall|Stonehenge', 'The wall’s fortifications stretch across northern China.'],
    ['🗼 🥐 🇫🇷', 'Paris', 'Rome|Vienna|Lisbon', 'The tower and croissant point to the French capital.'],
    ['🕌 💎 🇮🇳', 'Taj Mahal', 'Hawa Mahal|Gateway of India|Charminar', 'The mausoleum is in Agra.'],
    ['🗽 🍎 🚕', 'New York City', 'Chicago|Boston|Toronto', 'The Statue of Liberty and Big Apple are clues.'],
    ['🥭 🥛 🧊', 'Mango lassi', 'Falooda|Masala chai|Badam milk', 'A mango lassi blends mango and yogurt.'],
    ['🥔 🫓 🧈', 'Aloo paratha', 'Idli|Dhokla|Pani puri', 'The flatbread has a spiced potato filling.'],
    ['🐦 🔁 🪞', 'A parrot copying someone', 'A frog leaping|A cat sleeping|A fish swimming', 'The repeat sign hints at mimicry.'],
    ['⚡ 👓 🪄', 'Harry Potter', 'The Hobbit|Narnia|Percy Jackson', 'The round glasses, lightning scar and wand identify him.'],
    ['🧜‍♀️ 🐚 🎵', 'The Little Mermaid', 'Lilo & Stitch|Ponyo|Aquaman', 'A mermaid and a story where singing matters.'],
  ]),
  'guess-number': [
    { id: 'estimate-chess', prompt: 'How many legal opening moves can White make in a game of chess?', answer: 20, explanation: 'Each of eight pawns can advance one or two squares, and the two knights have two moves each.', difficulty: 'medium' },
    { id: 'estimate-hex', prompt: 'How many degrees are in the sum of a hexagon’s interior angles?', answer: 720, explanation: 'A hexagon can be divided into four triangles. Each has an angle sum of 180 degrees.', difficulty: 'medium' },
    { id: 'estimate-leap', prompt: 'How many days pass in four years if exactly one is a leap year?', answer: 1461, explanation: 'Three 365-day years and one 366-day year make 1,461 days.', difficulty: 'easy' },
    { id: 'estimate-apollo', prompt: 'In what year did Apollo 11 land on the Moon?', answer: 1969, explanation: 'The landing took place on July 20, 1969.', source: nasa + 'mission/apollo-11/', difficulty: 'easy' },
    { id: 'estimate-piano', prompt: 'How many keys does a standard full-size piano have?', answer: 88, explanation: 'The standard keyboard has 52 white keys and 36 black keys.', difficulty: 'easy' },
  ],
};
