import d0 from '@/assets/festival-diwali-0.jpg';
import d1 from '@/assets/festival-diwali-1.jpg';
import d2 from '@/assets/festival-diwali-2.jpg';
import d3 from '@/assets/festival-diwali-3.jpg';
import d4 from '@/assets/festival-diwali-4.jpg';
import d5 from '@/assets/festival-diwali-5.jpg';
import c0 from '@/assets/festival-christmas-0.jpg';
import c1 from '@/assets/festival-christmas-1.jpg';
import c2 from '@/assets/festival-christmas-2.jpg';
import c3 from '@/assets/festival-christmas-3.jpg';
import c4 from '@/assets/festival-christmas-4.jpg';
import c5 from '@/assets/festival-christmas-5.jpg';
import n0 from '@/assets/festival-newyear-0.jpg';
import n1 from '@/assets/festival-newyear-1.jpg';
import n2 from '@/assets/festival-newyear-2.jpg';
import n3 from '@/assets/festival-newyear-3.jpg';
import n4 from '@/assets/festival-newyear-4.jpg';
import n5 from '@/assets/festival-newyear-5.jpg';
import h0 from '@/assets/festival-holi-rakhi-0.jpg';
import h1 from '@/assets/festival-holi-rakhi-1.jpg';
import h2 from '@/assets/festival-holi-rakhi-2.jpg';
import r0 from '@/assets/festival-holi-rakhi-3.jpg';
import r1 from '@/assets/festival-holi-rakhi-4.jpg';
import r2 from '@/assets/festival-holi-rakhi-5.jpg';
import type { LayoutComposition, Palette, PlaceholderSlot, TemplateSpec } from './types';

const ARTWORK: Record<string, string[]> = {
  diwali: [d0,d1,d2,d3,d4,d5], dhanteras: [d0,d2,d4],
  christmas: [c0,c1,c2,c3,c4,c5], newYear: [n0,n1,n2,n3,n4,n5],
  holi: [h0,h1,h2], rakshaBandhan: [r0,r1,r2], bhaiDooj: [r0,r2,r1],
};
const LIGHT_SCENES: Record<string, number[]> = {
  diwali: [2,5], dhanteras: [1], christmas: [1,2,4], newYear: [1,5],
  holi: [0,2], rakshaBandhan: [0,2], bhaiDooj: [0,1],
};
export function artworkFor(category: string, variant: number): string | undefined {
  const images = ARTWORK[category];
  return images?.[((variant % images.length) + images.length) % images.length];
}
export function artworkTextColor(category: string, variant: number, p: Palette): string {
  const count = ARTWORK[category]?.length ?? 1;
  return LIGHT_SCENES[category]?.includes(variant % count) ? p.onAccent : p.text;
}

/** Keep native decorative artwork unobscured; all branding lives in two safe strips. */
export function themedComposition(category: string, variant: number, p: Palette, base: LayoutComposition): LayoutComposition {
  const personalSlots: PlaceholderSlot[] = [
    {id:'mfr_name',field:'mfr_name',cx:0.5,cy:0.16,w:0.55,h:0.025,style:'divider',collapsible:true},
    {id:'rtl_name',field:'rtl_name',cx:0.5,cy:0.96,w:0.6,h:0.025,style:'divider',collapsible:true},
  ];
  if (!artworkFor(category, variant)) return {...base, slots:[...base.slots,...personalSlots]};
  const color = artworkTextColor(category, variant, p);
  const style = Math.floor(variant / (ARTWORK[category]?.length ?? 6)) % 5;
  const x = style === 1 ? 0.22 : style === 3 ? 0.78 : 0.5;
  const align = style === 1 ? 'left' as const : style === 3 ? 'right' as const : 'center' as const;
  const y = style === 2 ? 0.34 : style === 4 ? 0.46 : 0.40;
  const positions = {headline:y,subheadline:y+0.14,offer:y-0.11,cta:y+0.23};
  const slots: PlaceholderSlot[] = [
    {id:'mfr_logo',field:'mfr_logo',cx:0.12,cy:0.085,w:0.075,h:0.075,style:'framedLogo'},
    {id:'mfr_business_name',field:'mfr_business_name',cx:0.52,cy:0.065,w:0.63,h:0.036,style:'divider'},
    {id:'mfr_phone',field:'mfr_phone',cx:0.34,cy:0.115,w:0.3,h:0.025,style:'divider'},
    {id:'mfr_email',field:'mfr_email',cx:0.69,cy:0.115,w:0.35,h:0.025,style:'divider',collapsible:true},
    {id:'rtl_logo',field:'rtl_logo',cx:0.12,cy:0.87,w:0.08,h:0.08,style:'logoCircle'},
    {id:'rtl_business_name',field:'rtl_business_name',cx:0.52,cy:0.83,w:0.63,h:0.038,style:'divider'},
    {id:'rtl_phone',field:'rtl_phone',cx:0.34,cy:0.88,w:0.3,h:0.025,style:'divider'},
    {id:'rtl_email',field:'rtl_email',cx:0.69,cy:0.88,w:0.35,h:0.025,style:'divider',collapsible:true},
    {id:'rtl_address',field:'rtl_address',cx:0.52,cy:0.925,w:0.66,h:0.026,style:'divider',collapsible:true},
    ...personalSlots,
  ];
  return {...base, slots, blocks:base.blocks.map(b=>({...b,cx:x,cy:positions[b.role],align,
    maxWidth:style===1||style===3?0.56:0.68,color,
    sizeRatio:b.role==='headline'?(style===4?0.09:0.078):b.role==='subheadline'?0.029:0.027,
    treatment:b.role==='offer'?'outline':undefined,letterSpacingEm:0,
  }))};
}
export function specArtwork(spec: TemplateSpec): string | undefined {
  return spec.artworkVersion === 1 ? artworkFor(spec.categoryKey, spec.variant) : undefined;
}