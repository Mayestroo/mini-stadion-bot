/** Client-side map URL builders for entities that only expose lat/lng (e.g. trainings). */
export const googleMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps?q=${lat},${lng}`;

export const yandexMapsUrl = (lat: number, lng: number) =>
  `https://yandex.com/maps/?pt=${lng},${lat}&z=16&l=map`;
