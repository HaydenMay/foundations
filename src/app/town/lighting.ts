import { Lighting } from '../domain/models';
import { Color } from 'three';
export interface LightPalette {
  direction: [number, number, number];
  sky: string;
  sun: string;
  ambient: string;
  ground: string;
  sunPower: number;
  ambientPower: number;
  windows: number;
  label: string;
}
const PALETTES: Record<string, LightPalette> = {
  sunrise: {
    direction: [-22, 14, 16],
    sky: '#e6dbc5',
    sun: '#ffcf91',
    ambient: '#b2c7ce',
    ground: '#8a7d68',
    sunPower: 2.5,
    ambientPower: 1.2,
    windows: 0.2,
    label: 'sunrise',
  },
  day: {
    direction: [-10, 29, 18],
    sky: '#e2e7d8',
    sun: '#fff0d5',
    ambient: '#c9d9d9',
    ground: '#95876b',
    sunPower: 2.4,
    ambientPower: 1.35,
    windows: 0,
    label: 'day',
  },
  sunset: {
    direction: [22, 9, 12],
    sky: '#e6d8c9',
    sun: '#ffac64',
    ambient: '#a4b2c3',
    ground: '#8b6b57',
    sunPower: 2.6,
    ambientPower: 1.05,
    windows: 0.45,
    label: 'sunset',
  },
  night: {
    direction: [-8, 20, -14],
    sky: '#233347',
    sun: '#a7bddd',
    ambient: '#9baccc',
    ground: '#29394d',
    sunPower: 0.65,
    ambientPower: 1.6,
    windows: 1,
    label: 'night',
  },
};
export function lightAt(preference: Lighting, hour: number): LightPalette {
  if (preference !== 'auto') return PALETTES[preference];
  const h = ((hour % 24) + 24) % 24;
  const stops = [
    { h: 0, key: 'night' },
    { h: 5, key: 'night' },
    { h: 6, key: 'sunrise' },
    { h: 8, key: 'day' },
    { h: 16, key: 'day' },
    { h: 18, key: 'sunset' },
    { h: 20, key: 'night' },
    { h: 24, key: 'night' },
  ];
  const i = stops.findIndex((s, i) => i < stops.length - 1 && h >= s.h && h < stops[i + 1].h);
  const a = PALETTES[stops[i].key],
    b = PALETTES[stops[i + 1].key];
  const t = (h - stops[i].h) / (stops[i + 1].h - stops[i].h);
  const mix = (a: number, b: number) => a + (b - a) * t;
  const color = (a: string, b: string) => `#${new Color(a).lerp(new Color(b), t).getHexString()}`;
  const label =
    h >= 5 && h < 8 ? 'sunrise' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'sunset' : 'night';
  return {
    direction: [
      mix(a.direction[0], b.direction[0]),
      mix(a.direction[1], b.direction[1]),
      mix(a.direction[2], b.direction[2]),
    ],
    sky: color(a.sky, b.sky),
    sun: color(a.sun, b.sun),
    ambient: color(a.ambient, b.ambient),
    ground: color(a.ground, b.ground),
    sunPower: mix(a.sunPower, b.sunPower),
    ambientPower: mix(a.ambientPower, b.ambientPower),
    windows: mix(a.windows, b.windows),
    label,
  };
}
