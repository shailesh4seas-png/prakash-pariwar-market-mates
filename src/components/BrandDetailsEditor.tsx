import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { isLogoField, type PlaceholderField, type RenderContent, type TemplateSpec } from '@/lib/templateEngine';

const FIELDS: {key: string; label: string; type?: string}[] = [
  {key:'business_name',label:'Shop / business name'}, {key:'name',label:'Contact name'},
  {key:'phone',label:'Mobile number',type:'tel'}, {key:'email',label:'Email',type:'email'},
  {key:'logo',label:'Business logo'},
];
export function BrandDetailsEditor({owner,spec,content,onChange}:{
  owner:'manufacturer'|'retailer'; spec:TemplateSpec; content:RenderContent; onChange:(spec:TemplateSpec)=>void;
}) {
  const prefix = owner==='manufacturer'?'mfr':'rtl';
  const update = (field:PlaceholderField,value:{text?:string;logoUrl?:string}) =>
    onChange({...spec,brandOverrides:{...spec.brandOverrides,[field]:value}});
  const fields = owner==='retailer'?[...FIELDS,{key:'address',label:'Address'}]:FIELDS;
  return <section className="space-y-3" aria-label={`${owner} details`}>
    <h3 className="font-semibold capitalize">{owner} details</h3>
    {fields.map(({key,label,type})=>{
      const field = `${prefix}_${key}` as PlaceholderField;
      const override = spec.brandOverrides?.[field];
      const resolved = content.values?.find(v=>v.field===field);
      const value = override?.text ?? resolved?.text ?? '';
      const logo = override?.logoUrl ?? resolved?.logoUrl;
      return <div key={field} className="space-y-1.5">
        <Label htmlFor={`brand-${field}`}>{label}</Label>
        {isLogoField(field)?<>
          {logo && <img src={logo} alt={`${owner} logo`} className="h-12 w-12 rounded-md border object-contain" width={48} height={48}/>}
          <Input id={`brand-${field}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={async e=>{
            const file=e.target.files?.[0]; if(!file)return;
            if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){toast.error('Choose a JPG, PNG or WebP logo under 2 MB.');return;}
            const reader=new FileReader();
            reader.onload=()=>{if(typeof reader.result==='string')update(field,{logoUrl:reader.result});};
            reader.onerror=()=>toast.error('Could not read this logo.'); reader.readAsDataURL(file);
          }}/>
          {logo && <Button variant="ghost" size="sm" onClick={()=>update(field,{logoUrl:''})}>Remove logo</Button>}
        </>:<Input id={`brand-${field}`} type={type??'text'} value={value} maxLength={200} onChange={e=>update(field,{text:e.target.value})}/>}
      </div>;
    })}
  </section>;
}