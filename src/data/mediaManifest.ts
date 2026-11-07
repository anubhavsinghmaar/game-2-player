export const mediaManifest: Record<string, { path: string; alt: string; credit: string; source: string; license: string; verified: string }> = {
  'blue-marble': {
    path: '/assets/blue-marble.jpg', alt: 'Photograph of the fully illuminated Earth showing Africa and Antarctica',
    credit: 'Apollo 17 crew / NASA Johnson Space Center', source: 'https://science.nasa.gov/resource/the-blue-marble/',
    license: 'U.S. public domain, NASA work', verified: '2026-11-07',
  },
  'sea-otter': {
    path: '/assets/sea-otter.jpg', alt: 'A southern sea otter floating on its back in kelp',
    credit: 'Tuttle Stephen / U.S. Fish and Wildlife Service',
    source: 'https://commons.wikimedia.org/wiki/File:Southern_sea_otter_enhydra_lutris_nereis.jpg',
    license: 'U.S. public domain, USFWS work', verified: '2026-11-07',
  },
};
