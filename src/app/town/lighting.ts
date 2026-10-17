import { Lighting } from '../domain/models';
import { Color } from 'three';
export interface LightPalette {
  sky: string;
  sun: string;
  ambient: string;
  sunPower: number;
  ambientPower: number;
  windows: number;
  label: string;
}
const PALETTES: Record<string, LightPalette> = {
  sunrise: {
    sky: '#e8dfcf',
    sun: '#ffd3a1',
    ambient: '#b2c7ce',
    sunPower: 2.2,
    ambientPower: 1.5,
    windows: 0.2,
    label: 'sunrise',
  },
  day: {
    sky: '#e8ede4',
    sun: '#fff0d5',
    ambient: '#c9d9d9',
    sunPower: 2.8,
    ambientPower: 1.9,
    windows: 0,
    label: 'day',
  },
  sunset: {
    sky: '#e6d8c9',
    sun: '#ffc28f',
    ambient: '#a4b2c3',
    sunPower: 2.1,
    ambientPower: 1.3,
    windows: 0.45,
    label: 'sunset',
  },
  night: {
    sky: '#253445',
    sun: '#a7bddd',
    ambient: '#9baccc',
    sunPower: 0.65,
    ambientPower: 1.05,
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
    sky: color(a.sky, b.sky),
    sun: color(a.sun, b.sun),
    ambient: color(a.ambient, b.ambient),
    sunPower: mix(a.sunPower, b.sunPower),
    ambientPower: mix(a.ambientPower, b.ambientPower),
    windows: mix(a.windows, b.windows),
    label,
  };
}
