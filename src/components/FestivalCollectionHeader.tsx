import { TemplateSvg } from '@/components/TemplateSvg';
import { generateTemplate, getCategory } from '@/lib/templateEngine';
export function FestivalCollectionHeader({categoryKey}:{categoryKey:string}) {
  const category=getCategory(categoryKey);
  return <section className={`festival-collection festival-${categoryKey} mb-6 overflow-hidden border-y py-5`}>
    <div className="flex items-center gap-5">
      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg">
        <TemplateSvg spec={generateTemplate(categoryKey,0)} ariaLabel={`${category?.label} collection`} className="h-full w-full"/>
      </div>
      <div className="min-w-0">
        <p className="mb-1 text-sm font-medium text-muted-foreground">{category?.kind==='season'?'Seasonal collection':'Festival collection'}</p>
        <h2 className="font-display text-3xl font-semibold">{category?.label}</h2>
        <p className="mt-2 text-sm text-muted-foreground">30 designs · Post &amp; Story</p>
      </div>
    </div>
  </section>;
}